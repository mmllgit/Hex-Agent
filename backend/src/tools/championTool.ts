import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Champion } from "../db/models.js";

export const championLookup = tool(
  async ({ championName }) => {
    const q = championName.trim();

    const champion = await Champion.findOne({
      $or: [
        { name: q },
        { nameEn: new RegExp(`^${q}$`, "i") },
        { aliases: q },
        { name: new RegExp(q, "i") },
        { aliases: new RegExp(q, "i") },
      ],
    }).lean();

    if (!champion) {
      const fuzzy = await Champion.find(
        { $or: [
          { name: new RegExp(q.slice(0, 2), "i") },
          { nameEn: new RegExp(q, "i") },
        ]},
        "name nameEn aliases"
      ).limit(5).lean();

      if (fuzzy.length > 0) {
        const suggestions = fuzzy.map(c =>
          `${c.name}(${c.nameEn})${c.aliases?.length ? ` 别名: ${c.aliases.join("/")}` : ""}`
        ).join("、");
        return `未找到「${q}」，你是否在找：${suggestions}？`;
      }
      return `未找到英雄「${q}」的数据。请检查英雄名是否正确，或尝试使用 champion_list 查看所有可用英雄。`;
    }

    return JSON.stringify(
      {
        name: champion.name,
        nameEn: champion.nameEn,
        aliases: champion.aliases,
        roles: champion.roles,
        skills: champion.skills,
        aramTips: champion.aramTips,
        recommendedRunes: champion.recommendedRunes,
        recommendedItems: champion.recommendedItems,
        counters: champion.counters,
        synergies: champion.synergies,
      },
      null,
      2
    );
  },
  {
    name: "champion_lookup",
    description:
      "查询英雄联盟国服英雄的详细信息。支持中文名、英文名、别名/外号查询，如「提莫」「Teemo」「提百万」「快乐风男」「瞎子」等。",
    schema: z.object({
      championName: z
        .string()
        .describe("英雄名称，支持中文名、英文名、别名/外号"),
    }),
  }
);

export const championList = tool(
  async () => {
    const champions = await Champion.find({}, "name nameEn aliases roles").lean();
    return JSON.stringify(
      champions.map((c) => ({
        name: c.name,
        nameEn: c.nameEn,
        aliases: c.aliases,
        roles: c.roles,
      }))
    );
  },
  {
    name: "champion_list",
    description: "获取数据库中所有可用英雄的列表，包含英雄名、别名和定位。",
    schema: z.object({}),
  }
);
