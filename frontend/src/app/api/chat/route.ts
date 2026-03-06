import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

export async function POST(req: NextRequest) {
  const body = await req.json();

  const backendRes = await fetch(`${BACKEND_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!backendRes.ok) {
    return new Response(
      JSON.stringify({ error: "后端服务请求失败" }),
      { status: backendRes.status, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!backendRes.body) {
    return new Response(
      JSON.stringify({ error: "无法获取响应流" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(backendRes.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
