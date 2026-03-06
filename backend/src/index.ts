import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db/mongo.js";
import agentRoutes from "./routes/agent.js";

const PORT = process.env.PORT || 3001;

async function main() {
  console.log("=== LOL ARAM Agent Backend ===");
  console.log("MONGODB_URI:", process.env.MONGODB_URI || "(default)");
  console.log("LLM_BASE_URL:", process.env.LLM_BASE_URL || "(default)");
  console.log("LLM_MODEL:", process.env.LLM_MODEL || "(default)");
  console.log("OPENAI_API_KEY:", process.env.OPENAI_API_KEY ? "SET" : "MISSING!");
  console.log("PORT:", PORT);

  await connectDB();

  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "lol-aram-agent" });
  });

  app.use("/api", agentRoutes);

  app.listen(Number(PORT), "0.0.0.0", () => {
    console.log(`Backend running on 0.0.0.0:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
