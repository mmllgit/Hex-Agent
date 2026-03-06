import mongoose, { Schema, Document } from "mongoose";

export interface IChampion extends Document {
  name: string;
  nameEn: string;
  roles: string[];
  skills: {
    passive: string;
    Q: string;
    W: string;
    E: string;
    R: string;
  };
  aramTips: string;
  recommendedRunes: string[];
  recommendedItems: string[];
  counters: string[];
  synergies: string[];
}

const ChampionSchema = new Schema<IChampion>({
  name: { type: String, required: true, unique: true, index: true },
  nameEn: { type: String, required: true },
  roles: [String],
  skills: {
    passive: String,
    Q: String,
    W: String,
    E: String,
    R: String,
  },
  aramTips: String,
  recommendedRunes: [String],
  recommendedItems: [String],
  counters: [String],
  synergies: [String],
});

export interface IHextechAugment extends Document {
  name: string;
  tier: "银色" | "金色" | "棱彩";
  effect: string;
  winRate: number;
  pickRate: number;
  suitableChampions: string[];
  tags: string[];
}

const HextechAugmentSchema = new Schema<IHextechAugment>({
  name: { type: String, required: true, unique: true, index: true },
  tier: { type: String, required: true, enum: ["银色", "金色", "棱彩"] },
  effect: { type: String, required: true },
  winRate: Number,
  pickRate: Number,
  suitableChampions: [String],
  tags: [String],
});

HextechAugmentSchema.index({ suitableChampions: 1 });
HextechAugmentSchema.index({ tier: 1, winRate: -1 });

export interface IChampionHextech extends Document {
  championId: string;
  championName: string;
  hextechIds: string[];
  hextechNames: string[];
  rating: string;
  tags: string[];
  note: string;
}

const ChampionHextechSchema = new Schema<IChampionHextech>({
  championId: { type: String, required: true, index: true },
  championName: { type: String, required: true, index: true },
  hextechIds: [String],
  hextechNames: [String],
  rating: { type: String, required: true },
  tags: [String],
  note: String,
});

ChampionHextechSchema.index({ championId: 1, rating: 1 });

export const Champion = mongoose.model<IChampion>("Champion", ChampionSchema);
export const HextechAugment = mongoose.model<IHextechAugment>(
  "HextechAugment",
  HextechAugmentSchema
);
export const ChampionHextech = mongoose.model<IChampionHextech>(
  "ChampionHextech",
  ChampionHextechSchema
);
