import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  championLookup,
  championList,
  hextechLookup,
  hextechByName,
  championHextechSynergy,
  webSearch,
  fetchPage,
  updateChampionData,
} from "../tools/index.js";
import { SYSTEM_PROMPT } from "./prompts.js";

const tools = [
  championLookup,
  championList,
  hextechLookup,
  hextechByName,
  championHextechSynergy,
  webSearch,
  fetchPage,
  updateChampionData,
];

function createLLM() {
  return new ChatOpenAI({
    modelName: process.env.LLM_MODEL || "deepseek-ai/DeepSeek-V3",
    temperature: 0.7,
    streaming: true,
    configuration: {
      baseURL: process.env.LLM_BASE_URL || "https://api.siliconflow.cn/v1",
    },
  });
}

const agent = createReactAgent({
  llm: createLLM(),
  tools,
});

export interface ChatRequest {
  champion?: string;
  mode?: string;
  message: string;
}

export async function chat(req: ChatRequest): Promise<string> {
  const userMsg = buildUserMessage(req);

  const result = await agent.invoke({
    messages: [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(userMsg)],
  });

  const lastMessage = result.messages[result.messages.length - 1];
  return typeof lastMessage.content === "string"
    ? lastMessage.content
    : JSON.stringify(lastMessage.content);
}

export async function* chatStream(
  req: ChatRequest
): AsyncGenerator<string, void, unknown> {
  const userMsg = buildUserMessage(req);

  const stream = await agent.stream(
    {
      messages: [new SystemMessage(SYSTEM_PROMPT), new HumanMessage(userMsg)],
    },
    { streamMode: "messages" }
  );

  for await (const [message, _metadata] of stream) {
    if (
      message._getType() === "ai" &&
      typeof message.content === "string" &&
      message.content.length > 0
    ) {
      yield message.content;
    }
  }
}

function buildUserMessage(req: ChatRequest): string {
  if (req.champion && req.mode) {
    return `我选择了英雄「${req.champion}」，模式是「${req.mode}」。${req.message || "请给我提供完整的攻略建议。"}`;
  }
  if (req.champion) {
    return `关于英雄「${req.champion}」在大乱斗中：${req.message || "请给我提供完整的攻略建议。"}`;
  }
  return req.message;
}
