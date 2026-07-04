import { useState, useCallback } from "react";
import {
  poolGetStats,
  poolGetProviderPosition,
  poolDeposit,
  poolWithdraw,
  poolPurchasePolicy,
  poolSettleClaim,
  poolSettleFromVerdict,
  poolBalanceOf,
} from "../lib/genlayer";

export interface PoolStats {
  asset: string;
  totalDeposits: number;
  totalActiveCoverage: number;
  maxUtilizationBps: number;
  protocolFeeBps: number;
  premiumRateBps: number;
  policyCount: number;
  utilizationPct: number;
}

export interface ProviderPosition {
  deposit: number;
  earned: number;
}

export function usePool(asset: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const readStats = useCallback(async (): Promise<PoolStats | null> => {
    try {
      const raw = (await poolGetStats(asset)) as any;
      if (!raw || !raw.asset) return null;
      const deposits = Number(raw.total_deposits) || 0;
      const coverage = Number(raw.total_active_coverage) || 0;
      const utilizationPct = deposits === 0 ? 0 : (coverage / deposits) * 100;
      return {
        asset: raw.asset,
        totalDeposits: deposits,
        totalActiveCoverage: coverage,
        maxUtilizationBps: Number(raw.max_utilization_bps) || 0,
        protocolFeeBps: Number(raw.protocol_fee_bps) || 0,
        premiumRateBps: Number(raw.premium_rate_bps) || 0,
        policyCount: Number(raw.policy_count) || 0,
        utilizationPct,
      };
    } catch (err: any) {
      setError(err?.message || "Failed to read pool stats");
      return null;
    }
  }, [asset]);

  const readPosition = useCallback(
    async (who: string): Promise<ProviderPosition | null> => {
      try {
        const raw = (await poolGetProviderPosition(asset, who)) as any;
        return {
          deposit: Number(raw?.deposit) || 0,
          earned: Number(raw?.earned) || 0,
        };
      } catch (err: any) {
        setError(err?.message || "Failed to read position");
        return null;
      }
    },
    [asset],
  );

  const readBalance = useCallback(async (who: string): Promise<number> => {
    try {
      const raw = await poolBalanceOf(who);
      return Number(raw) || 0;
    } catch (err: any) {
      setError(err?.message || "Failed to read balance");
      return 0;
    }
  }, []);

  const deposit = useCallback(
    async (amount: number, caller: string) => {
      setBusy(true);
      setError("");
      try {
        await poolDeposit(asset, amount, caller);
        return true;
      } catch (err: any) {
        setError(err?.message || "Deposit failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [asset],
  );

  const purchasePolicy = useCallback(
    async (coverage: number, caller: string) => {
      setBusy(true);
      setError("");
      try {
        await poolPurchasePolicy(asset, coverage, caller);
        return true;
      } catch (err: any) {
        setError(err?.message || "Policy purchase failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [asset],
  );

  const withdraw = useCallback(
    async (amount: number, caller: string) => {
      setBusy(true);
      setError("");
      try {
        await poolWithdraw(asset, amount, caller);
        return true;
      } catch (err: any) {
        setError(err?.message || "Withdraw failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [asset],
  );

  const settleClaim = useCallback(
    async (policyId: string, depegConfirmed: boolean, severityPct: number, caller: string) => {
      setBusy(true);
      setError("");
      try {
        await poolSettleClaim(policyId, depegConfirmed ? "true" : "false", severityPct, caller);
        return true;
      } catch (err: any) {
        setError(err?.message || "Settlement failed");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [asset],
  );

  const settleFromVerdict = useCallback(async (verdictId: string, caller: string) => {
    setBusy(true);
    setError("");
    try {
      await poolSettleFromVerdict(verdictId, caller);
      return true;
    } catch (err: any) {
      setError(err?.message || "Settlement failed");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);
  return { busy, error, readStats, readPosition, readBalance, deposit, purchasePolicy, withdraw, settleClaim, settleFromVerdict };
}