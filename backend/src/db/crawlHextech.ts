import "dotenv/config";
import axios from "axios";
import { connectDB, disconnectDB } from "./mongo.js";
import { HextechAugment } from "./models.js";

const BASE_URL = "https://apexlol.info";
const HTTP_TIMEOUT = 30_000;

const TIER_MAP: Record<string, "银色" | "金色" | "棱彩"> = {
  Silver: "银色",
  Gold: "金色",
  Prismatic: "棱彩",
};

interface RawAugment {
  id: string;
  tier: string;
  name: { zh: string; en: string };
  description: { zh: string; en: string };
  icon: string;
  source?: string;
  wikiKey?: string;
}

function stripHtml(html: string): string {
  return html
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTags(effect: string): string[] {
  const tags: string[] = [];
  if (/攻击|暴击|攻击力/.test(effect)) tags.push("攻击");
  if (/法术|法强|法力/.test(effect)) tags.push("法师");
  if (/治疗|回复|吸血|全能吸血/.test(effect)) tags.push("治疗");
  if (/护盾/.test(effect)) tags.push("护盾");
  if (/移速|移动速度/.test(effect)) tags.push("移速");
  if (/生命值|体型/.test(effect)) tags.push("坦度");
  if (/冷却|技能急速/.test(effect)) tags.push("冷却缩减");
  if (/终极技能|大招/.test(effect)) tags.push("终极技能");
  if (/灼烧|燃烧/.test(effect)) tags.push("灼烧");
  if (/定身|缚地|减速|嘲讽|魅惑/.test(effect)) tags.push("控制");
  if (/闪烁|冲刺|传送|跳跃/.test(effect)) tags.push("机动性");
  if (/普攻|普通攻击|攻击速度/.test(effect)) tags.push("普攻强化");
  return tags.length > 0 ? tags : ["通用"];
}

async function fetchDataJs(): Promise<string> {
  console.log("Fetching apexlol.info index page to find data JS file...");
  const indexResp = await axios.get(`${BASE_URL}/zh/hextech/`, {
    timeout: HTTP_TIMEOUT,
  });

  const dataJsMatch = indexResp.data.match(
    /\/assets\/chunks\/data\.[^"]+\.js/
  );
  if (!dataJsMatch) {
    throw new Error("Could not find data JS file URL in index page");
  }

  const dataJsUrl = `${BASE_URL}${dataJsMatch[0]}`;
  console.log(`Found data JS: ${dataJsUrl}`);

  const resp = await axios.get(dataJsUrl, { timeout: HTTP_TIMEOUT });
  return resp.data;
}

function parseAugmentsFromJs(jsContent: string): RawAugment[] {
  // The hextech data array starts with {id:"323",tier:"Prismatic"
  // Find the array by locating its pattern
  const arrayStart = jsContent.indexOf('{id:"323"');
  if (arrayStart === -1) {
    throw new Error("Could not find hextech augment data in JS file");
  }

  // Go back to find the opening bracket
  let bracketPos = arrayStart - 1;
  while (bracketPos >= 0 && jsContent[bracketPos] !== "[") {
    bracketPos--;
  }
  if (bracketPos < 0) {
    throw new Error("Could not find opening bracket for augment array");
  }

  // Find matching closing bracket by counting depth
  let depth = 0;
  let endPos = bracketPos;
  for (let i = bracketPos; i < jsContent.length; i++) {
    if (jsContent[i] === "[") depth++;
    if (jsContent[i] === "]") depth--;
    if (depth === 0) {
      endPos = i;
      break;
    }
  }

  let rawArray = jsContent.slice(bracketPos, endPos + 1);

  // Convert JS object notation to valid JSON:
  // 1. Quote unquoted property keys
  rawArray = rawArray.replace(
    /(?<=[{,])\s*(\w+)\s*:/g,
    ' "$1":'
  );
  // 2. Convert single quotes to double quotes (but handle escaped quotes)
  rawArray = rawArray.replace(/'/g, '"');

  // The descriptions contain nested double quotes from HTML attributes.
  // We need to handle those. Strategy: escape quotes inside string values
  // that break JSON parsing. Use a lenient parser approach.

  // Actually, let's use Function constructor to evaluate the JS array
  // since it's valid JS, just not valid JSON.
  // Restore original JS for Function eval
  const originalArray = jsContent.slice(bracketPos, endPos + 1);

  try {
    const fn = new Function(`return ${originalArray}`);
    const data = fn() as RawAugment[];
    return data;
  } catch (err) {
    console.error(
      "Function eval failed, trying regex extraction...",
      err instanceof Error ? err.message : err
    );
    return extractAugmentsRegex(jsContent);
  }
}

function extractAugmentsRegex(jsContent: string): RawAugment[] {
  const augments: RawAugment[] = [];
  const pattern =
    /\{id:"([^"]*)",tier:"([^"]*)",name:\{zh:"([^"]*)",en:"([^"]*)"}/g;

  let match;
  while ((match = pattern.exec(jsContent)) !== null) {
    const [, id, tier, nameZh, nameEn] = match;

    // Try to extract description
    const descStart = jsContent.indexOf(`description:{zh:`, match.index);
    let descZh = "";
    if (descStart !== -1 && descStart - match.index < 500) {
      const zhStart = jsContent.indexOf('"', descStart + 16) + 1;
      // Find end of zh description - complex due to nested quotes
      // Look for ",en:" pattern
      const enMarker = jsContent.indexOf(",en:", zhStart);
      if (enMarker !== -1) {
        // Go back to find the closing quote
        let quoteEnd = enMarker - 1;
        while (quoteEnd > zhStart && jsContent[quoteEnd] !== '"') {
          quoteEnd--;
        }
        descZh = jsContent.slice(zhStart, quoteEnd);
      }
    }

    augments.push({
      id,
      tier,
      name: { zh: nameZh, en: nameEn },
      description: { zh: stripHtml(descZh), en: "" },
      icon: "",
    });
  }

  return augments;
}

async function crawlHextech() {
  await connectDB();

  const jsContent = await fetchDataJs();
  console.log(`Data JS file size: ${jsContent.length} bytes`);

  console.log("Parsing hextech augment data...");
  const augments = parseAugmentsFromJs(jsContent);
  console.log(`Parsed ${augments.length} hextech augments`);

  if (augments.length === 0) {
    console.error("No augments parsed. Aborting.");
    await disconnectDB();
    process.exit(1);
  }

  // Show tier distribution
  const tierCounts: Record<string, number> = {};
  for (const a of augments) {
    tierCounts[a.tier] = (tierCounts[a.tier] || 0) + 1;
  }
  console.log("Tier distribution:", tierCounts);

  console.log("Clearing existing hextech augments...");
  await HextechAugment.deleteMany({});

  let added = 0;
  let failed = 0;

  for (const raw of augments) {
    const name = raw.name.zh;
    const tier = TIER_MAP[raw.tier] || "银色";
    const effect = stripHtml(raw.description.zh) || `${name}的效果`;
    const tags = inferTags(effect);

    try {
      await HextechAugment.create({
        name,
        tier,
        effect,
        winRate: 0,
        pickRate: 0,
        suitableChampions: [],
        tags,
      });
      added++;
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        // duplicate name - skip
      } else {
        console.warn(`Failed to insert ${name}:`, err instanceof Error ? err.message : err);
        failed++;
      }
    }
  }

  const total = await HextechAugment.countDocuments();
  const tierFinal: Record<string, number> = {};
  const docs = await HextechAugment.find({}, "tier").lean();
  for (const d of docs) {
    tierFinal[d.tier] = (tierFinal[d.tier] || 0) + 1;
  }

  console.log(`\nCrawl complete! Added: ${added}, Failed: ${failed}`);
  console.log(`Total hextech augments in DB: ${total}`);
  console.log(`By tier:`, tierFinal);

  // Show a few samples
  const samples = await HextechAugment.find().limit(3).lean();
  for (const s of samples) {
    console.log(`  [${s.tier}] ${s.name}: ${s.effect.slice(0, 80)}...`);
  }

  await disconnectDB();
}

crawlHextech().catch((err) => {
  console.error("Hextech crawl failed:", err);
  process.exit(1);
});
