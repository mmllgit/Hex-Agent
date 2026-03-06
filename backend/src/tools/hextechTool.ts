import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { HextechAugment, ChampionHextech } from "../db/models.js";

export const hextechLookup = tool(
  async ({ championName, tier, limit }) => {
    const filter: Record<string, unknown> = {};

    if (championName) {
      filter.suitableChampions = championName;
    }
    if (tier) {
      filter.tier = tier;
    }

    const resultLimit = limit ?? 10;
    const augments = await HextechAugment.find(filter)
      .sort({ winRate: -1 })
      .limit(resultLimit)
      .lean();

    if (augments.length === 0) {
      return championName
        ? `未找到适合「${championName}」的海克斯增益${tier ? `（${tier}级）` : ""}。`
        : `未找到${tier ? `${tier}级` : ""}海克斯增益数据。`;
    }

    return JSON.stringify(
      augments.map((a) => ({
        name: a.name,
        tier: a.tier,
        effect: a.effect,
        winRate: `${(a.winRate * 100).toFixed(1)}%`,
        pickRate: `${(a.pickRate * 100).toFixed(1)}%`,
        tags: a.tags,
      })),
      null,
      2
    );
  },
  {
    name: "hextech_lookup",
    description:
      "查询海克斯大乱斗增益数据。可按英雄名筛选适配的海克斯增益，也可按品质（银色/金色/棱彩）过滤，默认按胜率排序。",
    schema: z.object({
      championName: z
        .string()
        .nullable()
        .optional()
        .describe("按英雄名筛选适配的海克斯增益，如「杰斯」。不需要时传 null。"),
      tier: z
        .enum(["银色", "金色", "棱彩"])
        .nullable()
        .optional()
        .describe("按品质过滤：银色、金色、棱彩。不需要时传 null。"),
      limit: z
        .number()
        .nullable()
        .optional()
        .default(10)
        .describe("返回结果数量上限，默认10"),
    }),
  }
);

export const hextechByName = tool(
  async ({ augmentName }) => {
    const augment = await HextechAugment.findOne({
      name: augmentName,
    }).lean();

    if (!augment) {
      return `未找到海克斯增益「${augmentName}」。`;
    }

    return JSON.stringify(
      {
        name: augment.name,
        tier: augment.tier,
        effect: augment.effect,
        winRate: `${(augment.winRate * 100).toFixed(1)}%`,
        pickRate: `${(augment.pickRate * 100).toFixed(1)}%`,
        suitableChampions: augment.suitableChampions,
        tags: augment.tags,
      },
      null,
      2
    );
  },
  {
    name: "hextech_by_name",
    description: "按名称查询特定海克斯增益的详细信息。",
    schema: z.object({
      augmentName: z.string().describe("海克斯增益名称，如「灌注魔力」"),
    }),
  }
);

const RATING_PRIORITY: Record<string, number> = {
  SSS: 7, SS: 6, S: 5, A: 4, B: 3, C: 2, D: 1,
};

export const championHextechSynergy = tool(
  async ({ championName, minRating, limit }) => {
    const filter: Record<string, unknown> = {};

    filter.$or = [
      { championName },
      { championId: championName },
    ];

    if (minRating) {
      const minScore = RATING_PRIORITY[minRating] || 0;
      const validRatings = Object.entries(RATING_PRIORITY)
        .filter(([, score]) => score >= minScore)
        .map(([rating]) => rating);
      filter.rating = { $in: validRatings };
    }

    const resultLimit = limit ?? 15;
    const interactions = await ChampionHextech.find(filter)
      .lean();

    if (interactions.length === 0) {
      return `未找到「${championName}」的海克斯联动数据。请确认英雄名称正确。`;
    }

    const sorted = interactions.sort(
      (a, b) =>
        (RATING_PRIORITY[b.rating] || 0) - (RATING_PRIORITY[a.rating] || 0)
    );

    const limited = sorted.slice(0, resultLimit);

    return JSON.stringify(
      limited.map((i) => ({
        hextech: i.hextechNames.join(" + "),
        rating: i.rating,
        tags: i.tags,
        note: i.note,
      })),
      null,
      2
    );
  },
  {
    name: "champion_hextech_synergy",
    description:
      "查询指定英雄的最佳海克斯联动搭配。返回按评分（SSS > SS > S > A > B > C > D）排序的联动列表，包含联动说明和推荐标签。这是最核心的英雄-海克斯匹配工具。",
    schema: z.object({
      championName: z
        .string()
        .describe("英雄中文名，如「杰斯」「金克丝」"),
      minRating: z
        .enum(["SSS", "SS", "S", "A", "B", "C", "D"])
        .nullable()
        .optional()
        .describe("最低评分筛选，如传 S 则只返回 SSS/SS/S 的联动。不需要时传 null。"),
      limit: z
        .number()
        .nullable()
        .optional()
        .default(15)
        .describe("返回结果数量上限，默认15"),
    }),
  }
);
