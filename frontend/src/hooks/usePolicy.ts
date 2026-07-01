import { useState, useCallback } from "react";
import { getBrowserProvider, poolContract } from "../lib/contracts";

export interface PolicyView {
  policyId: number;
  holder: string;
  coverageAmount: bigint;
  premiumPaid: bigint;
  active: boolean;
  claimed: boolean;
}

export function usePolicy(asset: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const listAll = useCallback(async (): Promise<PolicyView[]> => {
    setLoading(true);
    setError("");
    try {
      const provider = getBrowserProvider();
      const pool = poolContract(asset, provider);
      const counter = Number(await pool.policyCounter());
      const out: PolicyView[] = [];
      for (let i = 0; i < counter; i++) {
        const p = await pool.policies(i);
        out.push({
          policyId: i,
          holder: p[0] as string,
          coverageAmount: p[1] as bigint,
          premiumPaid: p[2] as bigint,
          active: p[3] as boolean,
          claimed: p[4] as boolean,
        });
      }
      return out;
    } catch (err: any) {
      setError(err?.message || "Failed to load policies");
      return [];
    } finally {
      setLoading(false);
    }
  }, [asset]);

  const listMine = useCallback(
    async (who: string): Promise<PolicyView[]> => {
      const all = await listAll();
      const lower = who.toLowerCase();
      return all.filter((p) => p.holder.toLowerCase() === lower);
    },
    [listAll],
  );

  return { loading, error, listAll, listMine };
}