import mongoose from "mongoose";

const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/lol_agent";

const MAX_RETRIES = 15;
const RETRY_DELAY_MS = 2000;

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState >= 1) return;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(MONGODB_URI);
      console.log("MongoDB connected:", MONGODB_URI);
      return;
    } catch (err) {
      console.error(
        `MongoDB attempt ${attempt}/${MAX_RETRIES} failed:`,
        (err as Error).message
      );
      if (attempt === MAX_RETRIES) throw err;
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
    }
  }
}

export async function disconnectDB(): Promise<void> {
  await mongoose.disconnect();
}
