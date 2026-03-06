import "dotenv/config";
import axios from "axios";
import { connectDB, disconnectDB } from "./mongo.js";
import { ChampionHextech, HextechAugment, Champion } from "./models.js";

const BASE_URL = "https://apexlol.info";
const HTTP_TIMEOUT = 30_000;

const RATING_ORDER: Record<string, number> = {
  SSS: 7,
  SS: 6,
  S: 5,
  A: 4,
  B: 3,
  C: 2,
  D: 1,
};

interface RawInteraction {
  id?: string;
  hextechId?: string;
  hextechIds?: string[];
  rating: string;
  tags: string[];
  note: { zh: string; en: string };
  source?: string;
  contributor?: string;
  author?: string;
  recommendedItems?: string[];
}

async function fetchAppJs(): Promise<string> {
  console.log("Fetching apexlol.info to find app.js URL...");
  const resp = await axios.get(`${BASE_URL}/zh/champions/`, {
    timeout: HTTP_TIMEOUT,
  });

  const appJsMatch = resp.data.match(/\/assets\/app\.[^"]+\.js/);
  if (!appJsMatch) {
    throw new Error("Could not find app.js URL");
  }

  const appJsUrl = `${BASE_URL}${appJsMatch[0]}`;
  console.log(`Downloading app.js: ${appJsUrl}`);

  const jsResp = await axios.get(appJsUrl, { timeout: 60_000 });
  return jsResp.data;
}

async function fetchDataJs(): Promise<string> {
  const resp = await axios.get(`${BASE_URL}/zh/hextech/`, {
    timeout: HTTP_TIMEOUT,
  });
  const match = resp.data.match(/\/assets\/chunks\/data\.[^"]+\.js/);
  if (!match) throw new Error("Could not find data.js URL");

  const jsResp = await axios.get(`${BASE_URL}${match[0]}`, {
    timeout: HTTP_TIMEOUT,
  });
  return jsResp.data;
}

function buildHextechIdToNameMap(dataJs: string): Map<string, string> {
  const map = new Map<string, string>();

  const arrayStart = dataJs.indexOf('{id:"323"');
  if (arrayStart === -1) return map;

  let bracketPos = arrayStart - 1;
  while (bracketPos >= 0 && dataJs[bracketPos] !== "[") bracketPos--;
  if (bracketPos < 0) return map;

  let depth = 0;
  let endPos = bracketPos;
  for (let i = bracketPos; i < dataJs.length; i++) {
    if (dataJs[i] === "[") depth++;
    if (dataJs[i] === "]") depth--;
    if (depth === 0) {
      endPos = i;
      break;
    }
  }

  const originalArray = dataJs.slice(bracketPos, endPos + 1);
  try {
    const fn = new Function(`return ${originalArray}`);
    const augments = fn() as Array<{
      id: string;
      name: { zh: string; en: string };
    }>;
    for (const a of augments) {
      map.set(a.id, a.name.zh);
      map.set(a.name.en.toLowerCase(), a.name.zh);
    }
  } catch {
    console.warn("Failed to parse augment data for name mapping");
  }

  return map;
}

function extractChampionInteractions(
  appJs: string
): Map<string, RawInteraction[]> {
  const result = new Map<string, RawInteraction[]>();

  // Find the champion-to-interactions mapping object
  // Pattern: {DrMundo:Ww,Taliyah:Nw,...,Aatrox:Gw,...}
  // We look for an object containing "Aatrox:Gw" style entries where
  // the values are arrays of interactions (with hextechId/hextechIds + rating)
  const mappingRegex =
    /(\w+)=\{[^}]*?Blitzcrank:\w+[^}]*?Aatrox:\w+[^}]*?\}/g;
  let mappingMatch: RegExpExecArray | null;
  const mappings: Array<{ pos: number; content: string }> = [];

  while ((mappingMatch = mappingRegex.exec(appJs)) !== null) {
    mappings.push({ pos: mappingMatch.index, content: mappingMatch[0] });
  }

  // We want the mapping whose referenced variables contain hextechId/rating
  let targetMapping: string | null = null;
  for (const m of mappings) {
    // Extract first variable reference
    const pairMatch = m.content.match(/\{(\w+):(\w+),/);
    if (!pairMatch) continue;
    const varName = pairMatch[2];

    // Find what this variable contains
    const varIdx = appJs.indexOf(`,${varName}=`);
    if (varIdx === -1) continue;

    const sample = appJs.slice(varIdx, varIdx + 300);
    if (sample.includes("hextechId") || sample.includes("rating")) {
      targetMapping = m.content;
      break;
    }
  }

  if (!targetMapping) {
    console.error("Could not find champion-interactions mapping");
    return result;
  }

  // Parse champion->variable pairs
  const varAssignStart = targetMapping.indexOf("{");
  const pairsStr = targetMapping.slice(varAssignStart + 1, -1);
  const pairRegex = /(\w+):(\w+)/g;
  const pairs: Array<[string, string]> = [];
  let pairMatch2: RegExpExecArray | null;
  while ((pairMatch2 = pairRegex.exec(pairsStr)) !== null) {
    pairs.push([pairMatch2[1], pairMatch2[2]]);
  }

  console.log(`Found ${pairs.length} champion interaction mappings`);

  for (const [champId, varName] of pairs) {
    // Find the variable assignment
    const varIdx = appJs.indexOf(`,${varName}=[`);
    if (varIdx === -1) continue;

    const arrayStartIdx = varIdx + `,${varName}=`.length;

    // Find matching closing bracket
    let depth2 = 0;
    let endIdx = arrayStartIdx;
    for (let i = arrayStartIdx; i < appJs.length; i++) {
      if (appJs[i] === "[") depth2++;
      if (appJs[i] === "]") depth2--;
      if (depth2 === 0) {
        endIdx = i;
        break;
      }
    }

    const arrayStr = appJs.slice(arrayStartIdx, endIdx + 1);

    try {
      const fn = new Function(`return ${arrayStr}`);
      const interactions = fn() as RawInteraction[];
      if (Array.isArray(interactions) && interactions.length > 0) {
        result.set(champId, interactions);
      }
    } catch {
      // Some variables may not be arrays (e.g., config objects)
    }
  }

  return result;
}

async function crawlChampionHextech() {
  await connectDB();

  console.log("Step 1: Downloading JS files...");
  const [appJs, dataJs] = await Promise.all([fetchAppJs(), fetchDataJs()]);
  console.log(`app.js: ${appJs.length} bytes, data.js: ${dataJs.length} bytes`);

  console.log("\nStep 2: Building hextech ID -> name mapping...");
  const hextechNameMap = buildHextechIdToNameMap(dataJs);

  // Also load names from DB
  const dbAugments = await HextechAugment.find({}, "name").lean();
  for (const a of dbAugments) {
    hextechNameMap.set(a.name, a.name);
  }
  console.log(`Hextech name map: ${hextechNameMap.size} entries`);

  // Build champion ID -> Chinese name mapping from DB
  const dbChampions = await Champion.find({}, "name nameEn").lean();
  const champNameMap = new Map<string, string>();
  for (const c of dbChampions) {
    champNameMap.set(c.nameEn, c.name);
    champNameMap.set(c.nameEn.replace(/[\s']/g, ""), c.name);
  }

  console.log("\nStep 3: Extracting champion-hextech interactions...");
  const interactions = extractChampionInteractions(appJs);
  console.log(`Extracted interactions for ${interactions.size} champions`);

  console.log("\nStep 4: Saving to database...");
  await ChampionHextech.deleteMany({});

  let totalAdded = 0;
  let champCount = 0;

  for (const [champId, rawInteractions] of interactions) {
    const champName =
      champNameMap.get(champId) ||
      champNameMap.get(champId.replace(/([A-Z])/g, " $1").trim()) ||
      champId;

    for (const interaction of rawInteractions) {
      const hextechIds = interaction.hextechIds ||
        (interaction.hextechId ? [interaction.hextechId] : []);

      if (hextechIds.length === 0) continue;

      const hextechNames = hextechIds.map(
        (id) => hextechNameMap.get(id) || hextechNameMap.get(id.toLowerCase()) || id
      );

      const note = interaction.note?.zh || interaction.note?.en || "";

      try {
        await ChampionHextech.create({
          championId: champId,
          championName: champName,
          hextechIds,
          hextechNames,
          rating: interaction.rating,
          tags: interaction.tags || [],
          note,
        });
        totalAdded++;
      } catch (err) {
        console.warn(
          `  Failed to insert ${champName} interaction:`,
          err instanceof Error ? err.message : err
        );
      }
    }

    champCount++;
  }

  // Stats
  const total = await ChampionHextech.countDocuments();
  const ratingDist: Record<string, number> = {};
  const docs = await ChampionHextech.find({}, "rating").lean();
  for (const d of docs) {
    ratingDist[d.rating] = (ratingDist[d.rating] || 0) + 1;
  }

  console.log(`\nCrawl complete!`);
  console.log(`Champions with data: ${champCount}`);
  console.log(`Total interactions added: ${totalAdded}`);
  console.log(`Rating distribution:`, ratingDist);

  // Also update HextechAugment.suitableChampions based on the interactions
  console.log("\nStep 5: Updating HextechAugment.suitableChampions...");
  const augmentChampMap = new Map<string, Set<string>>();

  const allInteractions = await ChampionHextech.find(
    { rating: { $in: ["SSS", "SS", "S", "A"] } },
    "championName hextechNames"
  ).lean();

  for (const inter of allInteractions) {
    for (const name of inter.hextechNames) {
      if (!augmentChampMap.has(name)) {
        augmentChampMap.set(name, new Set());
      }
      augmentChampMap.get(name)!.add(inter.championName);
    }
  }

  let updatedAugments = 0;
  for (const [augName, champions] of augmentChampMap) {
    const result = await HextechAugment.updateOne(
      { name: augName },
      { $set: { suitableChampions: Array.from(champions) } }
    );
    if (result.modifiedCount > 0) updatedAugments++;
  }
  console.log(`Updated suitableChampions for ${updatedAugments} augments`);

  // Show samples
  const samples = await ChampionHextech.find({ rating: "SS" }).limit(5).lean();
  console.log("\nSample SS interactions:");
  for (const s of samples) {
    console.log(
      `  ${s.championName}: ${s.hextechNames.join(" + ")} [${s.rating}] - ${s.note.slice(0, 60)}...`
    );
  }

  await disconnectDB();
}

crawlChampionHextech().catch((err) => {
  console.error("Champion-Hextech crawl failed:", err);
  process.exit(1);
});
