import { Router, Request, Response } from "express";
import { chatStream, ChatRequest } from "../agent/core.js";
import { Champion } from "../db/models.js";
import { HextechAugment } from "../db/models.js";

const router = Router();

router.post("/chat", async (req: Request, res: Response) => {
  try {
    const { champion, mode, message } = req.body as ChatRequest;

    if (!message && !champion) {
      res.status(400).json({ error: "请提供消息内容或选择一个英雄" });
      return;
    }

    const chatReq: ChatRequest = {
      champion,
      mode: mode || "海克斯大乱斗",
      message: message || "",
    };

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");

    for await (const chunk of chatStream(chatReq)) {
      res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.write(`data: [DONE]\n\n`);
    res.end();
  } catch (err) {
    console.error("Chat error:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "Agent 处理请求时发生错误" });
    } else {
      res.write(
        `data: ${JSON.stringify({ error: "处理中断，请重试" })}\n\n`
      );
      res.end();
    }
  }
});

router.get("/champions", async (_req: Request, res: Response) => {
  try {
    const champions = await Champion.find(
      {},
      "name nameEn roles"
    )
      .sort({ name: 1 })
      .lean();
    res.json(champions);
  } catch (err) {
    console.error("Get champions error:", err);
    res.status(500).json({ error: "获取英雄列表失败" });
  }
});

router.get("/hextech", async (req: Request, res: Response) => {
  try {
    const { tier, champion } = req.query;
    const filter: Record<string, unknown> = {};

    if (tier && typeof tier === "string") {
      filter.tier = tier;
    }
    if (champion && typeof champion === "string") {
      filter.suitableChampions = champion;
    }

    const augments = await HextechAugment.find(filter)
      .sort({ winRate: -1 })
      .lean();
    res.json(augments);
  } catch (err) {
    console.error("Get hextech error:", err);
    res.status(500).json({ error: "获取海克斯增益列表失败" });
  }
});

export default router;
