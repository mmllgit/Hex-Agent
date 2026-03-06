const API_URL = "";

export interface Champion {
  _id: string;
  name: string;
  nameEn: string;
  roles: string[];
}

export interface HextechAugment {
  _id: string;
  name: string;
  tier: string;
  effect: string;
  winRate: number;
  pickRate: number;
  suitableChampions: string[];
  tags: string[];
}

export async function fetchChampions(): Promise<Champion[]> {
  const res = await fetch(`${API_URL}/api/champions`);
  if (!res.ok) throw new Error("获取英雄列表失败");
  return res.json();
}

export async function fetchHextech(params?: {
  tier?: string;
  champion?: string;
}): Promise<HextechAugment[]> {
  const query = new URLSearchParams();
  if (params?.tier) query.set("tier", params.tier);
  if (params?.champion) query.set("champion", params.champion);
  const res = await fetch(`${API_URL}/api/hextech?${query}`);
  if (!res.ok) throw new Error("获取海克斯数据失败");
  return res.json();
}

export async function* streamChat(body: {
  champion?: string;
  mode?: string;
  message: string;
}): AsyncGenerator<string, void, unknown> {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error("Agent 请求失败");
  }

  const reader = res.body?.getReader();
  if (!reader) throw new Error("无法读取响应流");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data: ")) continue;

      const data = trimmed.slice(6);
      if (data === "[DONE]") return;

      try {
        const parsed = JSON.parse(data);
        if (parsed.content) yield parsed.content;
        if (parsed.error) throw new Error(parsed.error);
      } catch {
        // skip malformed JSON
      }
    }
  }
}
