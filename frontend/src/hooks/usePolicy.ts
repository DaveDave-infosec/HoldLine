import { useState, useCallback } from "react";
import { poolGetPoliciesByHolder, poolGetAllPolicies } from "../lib/genlayer";

export interface PolicyView {
  policyId: string;
  asset: string;
  holder: string;
  coverage: number;
  premium: number;
  active: boolean;
  claimed: boolean;
}

function normalize(raw: any): PolicyView {
  return {
    policyId: String(raw.policy_id),
    asset: String(raw.asset),
    holder: String(raw.holder),
    coverage: Number(raw.coverage) || 0,
    premium: Number(raw.premium) || 0,
    active: String(raw.active).toLowerCase() === "true",
    claimed: String(raw.claimed).toLowerCase() === "true",
  };
}

export function usePolicy() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const listAll = useCallback(async (): Promise<PolicyView[]> => {
    setLoading(true);
    setError("");
    try {
      const raw = (await poolGetAllPolicies()) as any[];
      return Array.isArray(raw) ? raw.map(normalize) : [];
    } catch (err: any) {
      setError(err?.message || "Failed to load policies");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const listMine = useCallback(async (who: string): Promise<PolicyView[]> => {
    setLoading(true);
    setError("");
    try {
      const raw = (await poolGetPoliciesByHolder(who)) as any[];
      return Array.isArray(raw) ? raw.map(normalize) : [];
    } catch (err: any) {
      setError(err?.message || "Failed to load policies");
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, listAll, listMine };
}