import "dotenv/config";
import { connectDB, disconnectDB } from "./mongo.js";
import { Champion, HextechAugment } from "./models.js";

async function seed() {
  await connectDB();

  const champCount = await Champion.countDocuments();
  console.log(`Champions in DB: ${champCount}`);
  if (champCount === 0) {
    console.log("No champions found. Run 'npm run crawl' to crawl champion data.");
  }

  const hextechCount = await HextechAugment.countDocuments();
  console.log(`Hextech augments in DB: ${hextechCount}`);
  if (hextechCount === 0) {
    console.log("No hextech augments found. Run 'npm run crawl:hextech' to crawl hextech data.");
  }

  await disconnectDB();
  console.log("Seed check complete");
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
