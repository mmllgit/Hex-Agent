import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

export async function GET(req: NextRequest) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/champions`, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Proxy /api/champions failed:", err);
    return Response.json(
      { error: "后端服务不可用" },
      { status: 502 }
    );
  }
}
