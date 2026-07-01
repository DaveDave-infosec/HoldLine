export const STUDIO_CHAIN_ID = 61999;
export const STUDIO_CHAIN_HEX = "0xF21F";

export const JUDGE_CONTRACT_ADDRESS = import.meta.env.VITE_JUDGE_CONTRACT_ADDRESS || "";
export const GENUSDC_ADDRESS = import.meta.env.VITE_GENUSDC_ADDRESS || "";

export const POOL_ADDRESSES: Record<string, string> = {
  USDC: import.meta.env.VITE_POOL_USDC_ADDRESS || "",
  USDT: import.meta.env.VITE_POOL_USDT_ADDRESS || "",
};

export const PRICE_SERVER_BASE = import.meta.env.VITE_PRICE_SERVER_BASE || "";

export const NEWS_QUERY_URL = import.meta.env.VITE_NEWS_QUERY_URL || "https://www.google.com/search?q=stablecoin+depeg+news";

export const OWNER_ADDRESS = (import.meta.env.VITE_OWNER_ADDRESS || "").toLowerCase();

export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

export interface AssetConfig {
  symbol: string;
  threshold: string;
  premiumRateBps: number;
}

export const ASSETS: Record<string, AssetConfig> = {
  USDC: { symbol: "USDC", threshold: "0.97", premiumRateBps: 100 },
  USDT: { symbol: "USDT", threshold: "0.97", premiumRateBps: 150 },
};

export const ASSET_LIST = Object.values(ASSETS);

export type Scenario = "stable" | "mild" | "severe" | "wick";

export function priceUrl(asset: string, scenario?: Scenario): string {
  const base = PRICE_SERVER_BASE.replace(/\/+$/, "");
  const path = base + "/price/" + asset.toUpperCase();
  return scenario ? path + "?scenario=" + scenario : path;
}

export function pegStatus(price: number): "holding" | "strained" | "broken" {
  if (price >= 0.98) return "holding";
  if (price >= 0.95) return "strained";
  return "broken";
}

export const GENUSDC_DECIMALS = 18;