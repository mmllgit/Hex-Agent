import "dotenv/config";
import axios from "axios";
import { connectDB, disconnectDB } from "./mongo.js";
import { Champion } from "./models.js";

const DDRAGON_BASE = "https://ddragon.leagueoflegends.com";

const TAG_MAP: Record<string, string> = {
  Fighter: "战士",
  Tank: "坦克",
  Mage: "法师",
  Assassin: "刺客",
  Marksman: "射手",
  Support: "辅助",
};

interface DDragonChampionBasic {
  id: string;
  key: string;
  name: string;
  title: string;
  tags: string[];
}

interface DDragonSpell {
  id: string;
  name: string;
  description: string;
}

interface DDragonPassive {
  name: string;
  description: string;
}

interface DDragonChampionDetail {
  id: string;
  name: string;
  title: string;
  tags: string[];
  passive: DDragonPassive;
  spells: DDragonSpell[];
  allytips: string[];
  enemytips: string[];
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "，")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getLatestVersion(): Promise<string> {
  const resp = await axios.get<string[]>(`${DDRAGON_BASE}/api/versions.json`);
  return resp.data[0];
}

async function getAllChampionsBasic(
  version: string
): Promise<Record<string, DDragonChampionBasic>> {
  const url = `${DDRAGON_BASE}/cdn/${version}/data/zh_CN/champion.json`;
  const resp = await axios.get(url);
  return resp.data.data;
}

async function getChampionDetail(
  version: string,
  championId: string
): Promise<DDragonChampionDetail> {
  const url = `${DDRAGON_BASE}/cdn/${version}/data/zh_CN/champion/${championId}.json`;
  const resp = await axios.get(url);
  return Object.values(resp.data.data)[0] as DDragonChampionDetail;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function crawlAndSeed() {
  await connectDB();

  console.log("Fetching latest Data Dragon version...");
  const version = await getLatestVersion();
  console.log(`Version: ${version}`);

  console.log("Fetching champion list...");
  const championsBasic = await getAllChampionsBasic(version);
  const championIds = Object.keys(championsBasic);
  console.log(`Found ${championIds.length} champions`);

  const existingChamps = await Champion.find({}, "name nameEn").lean();
  const existingNames = new Set(existingChamps.map((c) => c.name));
  const existingNamesEn = new Set(existingChamps.map((c) => c.nameEn));

  let added = 0;
  let skipped = 0;
  let updated = 0;

  for (let i = 0; i < championIds.length; i++) {
    const champId = championIds[i];
    const basic = championsBasic[champId];

    const progress = `[${i + 1}/${championIds.length}]`;

    if (existingNames.has(basic.name)) {
      console.log(`${progress} ${basic.name} already exists, updating skills...`);

      try {
        const detail = await getChampionDetail(version, champId);
        await Champion.updateOne(
          { name: basic.name },
          {
            $set: {
              skills: {
                passive: `${detail.passive.name}：${stripHtmlTags(detail.passive.description)}`,
                Q: `${detail.spells[0].name}：${stripHtmlTags(detail.spells[0].description)}`,
                W: `${detail.spells[1].name}：${stripHtmlTags(detail.spells[1].description)}`,
                E: `${detail.spells[2].name}：${stripHtmlTags(detail.spells[2].description)}`,
                R: `${detail.spells[3].name}：${stripHtmlTags(detail.spells[3].description)}`,
              },
            },
          }
        );
        updated++;
      } catch (err) {
        console.warn(`  Failed to update ${basic.name}:`, err instanceof Error ? err.message : err);
      }

      await sleep(100);
      continue;
    }

    console.log(`${progress} Crawling ${basic.name} (${champId})...`);

    try {
      const detail = await getChampionDetail(version, champId);
      const roles = detail.tags.map((t) => TAG_MAP[t] || t);

      await Champion.create({
        name: detail.name,
        nameEn: champId,
        roles,
        skills: {
          passive: `${detail.passive.name}：${stripHtmlTags(detail.passive.description)}`,
          Q: `${detail.spells[0].name}：${stripHtmlTags(detail.spells[0].description)}`,
          W: `${detail.spells[1].name}：${stripHtmlTags(detail.spells[1].description)}`,
          E: `${detail.spells[2].name}：${stripHtmlTags(detail.spells[2].description)}`,
          R: `${detail.spells[3].name}：${stripHtmlTags(detail.spells[3].description)}`,
        },
        aramTips: detail.allytips.length > 0
          ? detail.allytips.join(" ")
          : `${detail.name}在大乱斗中需要合理利用技能进行团战配合。`,
        recommendedRunes: [],
        recommendedItems: [],
        counters: [],
        synergies: [],
      });

      added++;
    } catch (err) {
      console.warn(`  Failed to crawl ${basic.name}:`, err instanceof Error ? err.message : err);
    }

    await sleep(100);
  }

  const total = await Champion.countDocuments();
  console.log(`\nCrawl complete! Added: ${added}, Updated: ${updated}, Skipped: ${skipped}`);
  console.log(`Total champions in DB: ${total}`);

  await disconnectDB();
}

crawlAndSeed().catch((err) => {
  console.error("Crawl failed:", err);
  process.exit(1);
});
