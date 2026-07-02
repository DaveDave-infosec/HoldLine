// Holdline configuration. Deploy-specific values come from Vite env vars
// (VITE_ prefix = exposed to the browser bundle). Set these on Vercel.

// GenLayer Studio Network
export const STUDIO_CHAIN_ID = 61999;
export const STUDIO_CHAIN_HEX = "0xF21F";

// Deployed Intelligent Contracts (both Python, both on Studio).
export const JUDGE_CONTRACT_ADDRESS = import.meta.env.VITE_JUDGE_CONTRACT_ADDRESS || "";
export const POOL_CONTRACT_ADDRESS = import.meta.env.VITE_POOL_CONTRACT_ADDRESS || "";

// Mock price server base URL, e.g. https://holdline-test.vercel.app
export const PRICE_SERVER_BASE = import.meta.env.VITE_PRICE_SERVER_BASE || "";

// Owner / admin wallet. Gates the Admin page and the settlement relay button.
// Stored lowercase for case-insensitive comparison against connected wallet.
export const OWNER_ADDRESS = (import.meta.env.VITE_OWNER_ADDRESS || "").toLowerCase();

// Admin key for the live POST price-control panel (warm-instance tinkering).
// The deterministic scenario buttons do not need this.
export const ADMIN_KEY = import.meta.env.VITE_ADMIN_KEY || "";

// Supported assets and their per-asset config. Threshold is the goalpost
// handed to the judge; premiumRateBps mirrors what add_asset set on-chain.
export interface AssetConfig {
  symbol: string;
  threshold: string;
  premiumRateBps: number;
}

export const ASSETS: Record<string, AssetConfig> = {
  USDC: { symbol: "USDC", threshold: "0.97", premiumRateBps: 100 },  // 1.0%
  USDT: { symbol: "USDT", threshold: "0.97", premiumRateBps: 150 },  // 1.5%
};

export const ASSET_LIST = Object.values(ASSETS);

// Demo scenarios, mapped to the mock server query param.
export type Scenario = "stable" | "mild" | "severe" | "wick";

// Build the price URL the judge fetches. Scenario param makes it
// deterministic and cold-start safe on serverless hosting.
export function priceUrl(asset: string, scenario?: Scenario): string {
  const base = PRICE_SERVER_BASE.replace(/\/+$/, "");
  const path = base + "/price/" + asset.toUpperCase();
  return scenario ? path + "?scenario=" + scenario : path;
}

// Build the news URL the judge fetches, scenario-matched.
export function newsUrl(asset: string, scenario?: Scenario): string {
  const base = PRICE_SERVER_BASE.replace(/\/+$/, "");
  const path = base + "/news/" + asset.toUpperCase();
  return scenario ? path + "?scenario=" + scenario : path;
}

// Peg status thresholds for the PegLine visual.
export function pegStatus(price: number): "holding" | "strained" | "broken" {
  if (price >= 0.98) return "holding";
  if (price >= 0.95) return "strained";
  return "broken";
}

// Money is whole genUSDC units on-chain now (no 18-decimal wei), so the
// frontend passes plain integers straight through.