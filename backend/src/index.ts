import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./db/mongo.js";
import agentRoutes from "./routes/agent.js";

const PORT = process.env.PORT || 3001;

async function main() {
  await connectDB();

  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", service: "lol-aram-agent" });
  });

  app.use("/api", agentRoutes);

  app.listen(PORT, () => {
    console.log(`LOL ARAM Agent backend running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
