import { tool } from "@langchain/core/tools";
import { z } from "zod";
import axios from "axios";
import * as cheerio from "cheerio";
import { Champion, HextechAugment } from "../db/models.js";

const HTTP_TIMEOUT = 10_000;
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const http = axios.create({
  timeout: HTTP_TIMEOUT,
  headers: { "User-Agent": USER_AGENT },
});

// ---- Tool 1: Web search via DuckDuckGo HTML ----

export const webSearch = tool(
  async ({ query }) => {
    try {
      const url = "https://html.duckduckgo.com/html/";
      const resp = await http.post(url, `q=${encodeURIComponent(query)}`, {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        maxRedirects: 5,
      });

      const $ = cheerio.load(resp.data);
      const results: { title: string; url: string; snippet: string }[] = [];

      $(".result").each((_i, el) => {
        if (results.length >= 6) return false;
        const title = $(el).find(".result__title a").text().trim();
        let href = $(el).find(".result__title a").attr("href") || "";
        const snippet = $(el).find(".result__snippet").text().trim();

        if (href.includes("uddg=")) {
          try {
            href = decodeURIComponent(
              href.split("uddg=")[1]?.split("&")[0] || href
            );
          } catch { /* keep original */ }
        }

        if (title && snippet) {
          results.push({ title, url: href, snippet });
        }
      });

      if (results.length === 0) {
        return `搜索「${query}」未找到相关结果。请尝试其他关键词。`;
      }

      return JSON.stringify(
        {
          query,
          resultCount: results.length,
          results: results.map((r, i) => ({
            rank: i + 1,
            title: r.title,
            url: r.url,
            snippet: r.snippet,
          })),
        },
        null,
        2
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `搜索失败：${msg}。请稍后重试或使用本地数据库中的信息。`;
    }
  },
  {
    name: "web_search",
    description:
      "在互联网上搜索英雄联盟相关的攻略、胜率、出装、海克斯增益等最新信息。返回搜索结果列表（标题、链接、摘要）。适合查找数据库中没有的信息或获取最新攻略。",
    schema: z.object({
      query: z
        .string()
        .describe("搜索关键词，如「杰斯 大乱斗 攻略 S14」、「ARAM hextech augment tier list」"),
    }),
  }
);

// ---- Tool 2: Fetch & extract page content ----

export const fetchPage = tool(
  async ({ url, maxLength }) => {
    try {
      const resp = await http.get(url);
      const $ = cheerio.load(resp.data);

      $("script, style, nav, header, footer, iframe, noscript, .ad, .sidebar").remove();

      const title = $("title").text().trim();

      let text = "";
      const contentSelectors = [
        "article",
        "main",
        ".content",
        ".post-content",
        ".article-content",
        "#content",
      ];

      for (const sel of contentSelectors) {
        const el = $(sel);
        if (el.length > 0) {
          text = el.text();
          break;
        }
      }

      if (!text) {
        text = $("body").text();
      }

      text = text
        .replace(/\s+/g, " ")
        .replace(/\n\s*\n/g, "\n")
        .trim();

      const limit = maxLength ?? 3000;
      if (text.length > limit) {
        text = text.slice(0, limit) + "...[内容截断]";
      }

      return JSON.stringify({ title, url, contentLength: text.length, content: text });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `无法获取页面内容 (${url})：${msg}`;
    }
  },
  {
    name: "fetch_page",
    description:
      "抓取指定网页 URL 的正文内容。适合在 web_search 找到相关链接后，获取页面的详细内容。会自动去除导航栏、广告等干扰元素，提取核心文本。",
    schema: z.object({
      url: z.string().describe("要抓取的网页 URL"),
      maxLength: z
        .number()
        .nullable()
        .optional()
        .default(3000)
        .describe("返回内容的最大字符数，默认3000"),
    }),
  }
);

// ---- Tool 3: Update champion/hextech data from scraped info ----

export const updateChampionData = tool(
  async ({ championName, field, value }) => {
    try {
      const champion = await Champion.findOne({
        $or: [
          { name: championName },
          { nameEn: new RegExp(`^${championName}$`, "i") },
        ],
      });

      if (!champion) {
        return `未找到英雄「${championName}」，无法更新。请确认英雄名是否正确。`;
      }

      const allowedFields = [
        "aramTips",
        "recommendedRunes",
        "recommendedItems",
        "counters",
        "synergies",
      ];

      if (!allowedFields.includes(field)) {
        return `不允许更新字段「${field}」。可更新的字段：${allowedFields.join(", ")}`;
      }

      let parsedValue: unknown = value;
      if (field !== "aramTips") {
        try {
          parsedValue = JSON.parse(value);
        } catch {
          parsedValue = value.split(/[,，、]/).map((s: string) => s.trim());
        }
      }

      await Champion.updateOne(
        { _id: champion._id },
        { $set: { [field]: parsedValue } }
      );

      return `已更新「${champion.name}」的${field}字段。`;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return `更新失败：${msg}`;
    }
  },
  {
    name: "update_champion_data",
    description:
      "根据从网上爬取到的最新信息，更新数据库中某个英雄的攻略数据。可更新的字段：aramTips（大乱斗攻略）、recommendedRunes（推荐符文）、recommendedItems（推荐出装）、counters（克制英雄）、synergies（配合英雄）。",
    schema: z.object({
      championName: z.string().describe("要更新的英雄名称"),
      field: z
        .enum([
          "aramTips",
          "recommendedRunes",
          "recommendedItems",
          "counters",
          "synergies",
        ])
        .describe("要更新的字段名"),
      value: z
        .string()
        .describe(
          "新的值。aramTips 传字符串；其他字段传 JSON 数组字符串如 [\"物品1\",\"物品2\"]，或逗号分隔的文本"
        ),
    }),
  }
);
