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
import { buildSystemPrompt } from "./prompts.js";

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
    modelName: process.env.LLM_MODEL || "Qwen/Qwen3.5-122B-A10B",
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
  const systemPrompt = buildSystemPrompt();

  const result = await agent.invoke({
    messages: [new SystemMessage(systemPrompt), new HumanMessage(userMsg)],
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
  const systemPrompt = buildSystemPrompt();

  const stream = await agent.stream(
    {
      messages: [new SystemMessage(systemPrompt), new HumanMessage(userMsg)],
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
  if (req.champion && req.message) {
    return `（用户在侧边栏选择了英雄「${req.champion}」，模式「${req.mode || "海克斯大乱斗"}」，但请以用户实际输入的问题为准，如果问题涉及其他英雄则以问题中的英雄为准）\n\n${req.message}`;
  }
  if (req.champion) {
    return `请给我「${req.champion}」在${req.mode || "海克斯大乱斗"}中的完整攻略建议。`;
  }
  return req.message;
}
