import { useState, useCallback } from "react";
import { judgeDepeg, getVerdict, getVerdictCount } from "../lib/genlayer";

export interface Verdict {
  verdict_id: string;
  asset_symbol: string;
  price_endpoint_used: string;
  depeg_confirmed: string;
  severity_pct: number | bigint;
  confidence_level: string;
  observed_price: string;
  sustained_duration_assessment: string;
  pool_imbalance_assessment: string;
  news_context_assessment: string;
  reasoning_summary: string;
  requester: string;
  requested_at: string;
}

export function useJudgeVerdict() {
  const [filing, setFiling] = useState(false);
  const [error, setError] = useState<string>("");

  const fileClaim = useCallback(
    async (
      assetSymbol: string,
      priceEndpointUrl: string,
      newsQueryUrl: string,
      thresholdPrice: string,
      requesterAddress: string,
      requestedAt: string,
    ): Promise<string | null> => {
      setFiling(true);
      setError("");
      try {
        const result = await judgeDepeg(
          assetSymbol,
          priceEndpointUrl,
          newsQueryUrl,
          thresholdPrice,
          requesterAddress,
          requestedAt,
        );
        return typeof result === "string" ? result : String(result);
      } catch (err: any) {
        setError(err?.message || "Failed to file claim");
        return null;
      } finally {
        setFiling(false);
      }
    },
    [],
  );

  const fetchVerdict = useCallback(async (verdictId: string): Promise<Verdict | null> => {
    try {
      const v = (await getVerdict(verdictId)) as unknown as Verdict;
      if (!v || !v.verdict_id) return null;
      return v;
    } catch (err: any) {
      setError(err?.message || "Failed to fetch verdict");
      return null;
    }
  }, []);

  const fetchCount = useCallback(async (): Promise<number> => {
    try {
      const c = await getVerdictCount();
      return Number(c);
    } catch (err: any) {
      setError(err?.message || "Failed to fetch count");
      return 0;
    }
  }, []);

  return { filing, error, fileClaim, fetchVerdict, fetchCount };
}