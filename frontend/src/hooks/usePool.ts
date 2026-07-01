import { useState, useCallback } from "react";
import { ethers } from "ethers";
import { getSigner, getBrowserProvider, genUSDCContract, poolContract } from "../lib/contracts";
import { GENUSDC_DECIMALS } from "../lib/constants";

export interface PoolStats {
  totalPoolDeposits: string;
  totalActiveCoverage: string;
  maxUtilizationBps: number;
  policyCounter: number;
  protocolFeeBps: number;
  utilizationPct: number;
}

export interface ProviderPosition {
  depositAmount: string;
  earnedPremiums: string;
}

function fmt(v: bigint): string {
  return ethers.formatUnits(v, GENUSDC_DECIMALS);
}

function parse(v: string): bigint {
  return ethers.parseUnits(v || "0", GENUSDC_DECIMALS);
}

export function usePool(asset: string) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>("");

  const readStats = useCallback(async (): Promise<PoolStats | null> => {
    try {
      const provider = getBrowserProvider();
      const pool = poolContract(asset, provider);
      const s = await pool.getPoolStats();
      const deposits = s[0] as bigint;
      const coverage = s[1] as bigint;
      const utilizationPct =
        deposits === 0n ? 0 : Number((coverage * 10000n) / deposits) / 100;
      return {
        totalPoolDeposits: fmt(deposits),
        totalActiveCoverage: fmt(coverage),
        maxUtilizationBps: Number(s[2]),
        policyCounter: Number(s[3]),
        protocolFeeBps: Number(s[4]),
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
        const provider = getBrowserProvider();
        const pool = poolContract(asset, provider);
        const pos = await pool.providers(who);
        return { depositAmount: fmt(pos[0] as bigint), earnedPremiums: fmt(pos[1] as bigint) };
      } catch (err: any) {
        setError(err?.message || "Failed to read position");
        return null;
      }
    },
    [asset],
  );

  const deposit = useCallback(
    async (amount: string) => {
      setBusy(true);
      setError("");
      try {
        const signer = await getSigner();
        const me = await signer.getAddress();
        const token = genUSDCContract(signer);
        const pool = poolContract(asset, signer);
        const poolAddr = await pool.getAddress();
        const want = parse(amount);

        const allowance = (await token.allowance(me, poolAddr)) as bigint;
        if (allowance < want) {
          const tx = await token.approve(poolAddr, want);
          await tx.wait();
        }
        const tx2 = await pool.deposit(want);
        await tx2.wait();
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
    async (coverage: string, premium: string) => {
      setBusy(true);
      setError("");
      try {
        const signer = await getSigner();
        const me = await signer.getAddress();
        const token = genUSDCContract(signer);
        const pool = poolContract(asset, signer);
        const poolAddr = await pool.getAddress();
        const premiumWei = parse(premium);

        const allowance = (await token.allowance(me, poolAddr)) as bigint;
        if (allowance < premiumWei) {
          const tx = await token.approve(poolAddr, premiumWei);
          await tx.wait();
        }
        const tx2 = await pool.purchasePolicy(parse(coverage), premiumWei);
        await tx2.wait();
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
    async (amount: string) => {
      setBusy(true);
      setError("");
      try {
        const signer = await getSigner();
        const pool = poolContract(asset, signer);
        const tx = await pool.withdraw(parse(amount));
        await tx.wait();
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
    async (policyId: number, depegConfirmed: boolean, severityPct: number) => {
      setBusy(true);
      setError("");
      try {
        const signer = await getSigner();
        const pool = poolContract(asset, signer);
        const tx = await pool.settleClaim(policyId, depegConfirmed, severityPct);
        await tx.wait();
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

  return { busy, error, readStats, readPosition, deposit, purchasePolicy, withdraw, settleClaim };
}