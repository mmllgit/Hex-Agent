import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { Champion } from "../db/models.js";

export const championLookup = tool(
  async ({ championName }) => {
    const champion = await Champion.findOne({
      $or: [
        { name: championName },
        { nameEn: new RegExp(`^${championName}$`, "i") },
      ],
    }).lean();

    if (!champion) {
      return `未找到英雄「${championName}」的数据。请检查英雄名是否正确。`;
    }

    return JSON.stringify(
      {
        name: champion.name,
        nameEn: champion.nameEn,
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
      "查询英雄联盟国服英雄的详细信息，包括技能描述、大乱斗攻略、推荐符文和出装、克制关系等。输入英雄中文名或英文名。",
    schema: z.object({
      championName: z
        .string()
        .describe("英雄名称（中文或英文），如「杰斯」或「Jayce」"),
    }),
  }
);

export const championList = tool(
  async () => {
    const champions = await Champion.find({}, "name nameEn roles").lean();
    return JSON.stringify(
      champions.map((c) => ({
        name: c.name,
        nameEn: c.nameEn,
        roles: c.roles,
      }))
    );
  },
  {
    name: "champion_list",
    description: "获取数据库中所有可用英雄的列表，包含英雄名和定位。",
    schema: z.object({}),
  }
);
