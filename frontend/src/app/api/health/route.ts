const BACKEND_URL =
  process.env.BACKEND_INTERNAL_URL || "http://localhost:3001";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`);
    const data = await res.json();
    return Response.json(data, { status: res.status });
  } catch (err) {
    console.error("Proxy /health failed:", err);
    return Response.json(
      { error: "后端服务不可用" },
      { status: 502 }
    );
  }
}
