import { NextRequest } from "next/server";

const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const query = searchParams.toString();
    const url = `${BACKEND_URL}/api/hextech${query ? `?${query}` : ""}`;

    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Proxy /api/hextech failed:", err);
    return Response.json(
      { error: "后端服务不可用" },
      { status: 502 }
    );
  }
}
