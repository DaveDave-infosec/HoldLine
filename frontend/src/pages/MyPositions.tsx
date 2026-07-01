import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ethers } from "ethers";
import { useWallet } from "../hooks/useWallet";
import { usePolicy } from "../hooks/usePolicy";
import { usePool } from "../hooks/usePool";
import type { PolicyView } from "../hooks/usePolicy";
import { ASSET_LIST, GENUSDC_DECIMALS } from "../lib/constants";

interface PolicyRow extends PolicyView {
  asset: string;
}

function fmt(v: bigint): string {
  return Number(ethers.formatUnits(v, GENUSDC_DECIMALS)).toLocaleString();
}

export default function MyPositions() {
  const { address, isConnected } = useWallet();
  const navigate = useNavigate();
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [deposits, setDeposits] = useState<{ asset: string; deposit: string; earned: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const usdcPolicies = usePolicy("USDC");
  const usdtPolicies = usePolicy("USDT");
  const usdcPool = usePool("USDC");
  const usdtPool = usePool("USDT");

  useEffect(() => {
    if (!isConnected || !address) return;
    let alive = true;
    (async () => {
      setLoading(true);
      const polRows: PolicyRow[] = [];
      const usdcMine = await usdcPolicies.listMine(address);
      usdcMine.forEach((p) => polRows.push({ ...p, asset: "USDC" }));
      const usdtMine = await usdtPolicies.listMine(address);
      usdtMine.forEach((p) => polRows.push({ ...p, asset: "USDT" }));

      const depRows: { asset: string; deposit: string; earned: string }[] = [];
      for (const a of ASSET_LIST) {
        const pool = a.symbol === "USDC" ? usdcPool : usdtPool;
        const pos = await pool.readPosition(address);
        if (pos && (parseFloat(pos.depositAmount) > 0 || parseFloat(pos.earnedPremiums) > 0)) {
          depRows.push({
            asset: a.symbol,
            deposit: Number(pos.depositAmount).toLocaleString(),
            earned: Number(pos.earnedPremiums).toLocaleString(),
          });
        }
      }

      if (alive) {
        setPolicies(polRows);
        setDeposits(depRows);
        setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  if (!isConnected) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Connect a wallet to view positions.</div>;
  }

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, marginBottom: 32 }}>MY POSITIONS</h1>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
        POLICIES HELD
      </div>
      {policies.length === 0 ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", marginBottom: 40 }}>
          {loading ? "Loading..." : "No policies yet."}
        </div>
      ) : (
        <div style={{ marginBottom: 40, border: "1px solid var(--gridline)" }}>
          {policies.map((p) => {
            const state = p.claimed ? "CLAIMED" : p.active ? "ACTIVE" : "INACTIVE";
            const stateColor = p.claimed ? "var(--accent)" : p.active ? "var(--peg-holding)" : "var(--text-muted)";
            return (
              <div
                key={p.asset + "-" + p.policyId}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--gridline)", background: "var(--surface)" }}
              >
                <div>
                  <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{p.asset + "  #" + p.policyId}</div>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                    {"Coverage " + fmt(p.coverageAmount) + "  /  Premium " + fmt(p.premiumPaid)}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                  <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: stateColor }}>{state}</span>
                  {p.active && !p.claimed && (
                    <button
                      onClick={() => navigate("/claim")}
                      style={{ background: "var(--accent)", color: "var(--void)", padding: "8px 14px", fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 500 }}
                    >
                      FILE CLAIM
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
        LIQUIDITY PROVIDED
      </div>
      {deposits.length === 0 ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
          {loading ? "Loading..." : "No liquidity positions."}
        </div>
      ) : (
        <div style={{ border: "1px solid var(--gridline)" }}>
          {deposits.map((d) => (
            <div
              key={d.asset}
              style={{ display: "flex", justifyContent: "space-between", padding: "16px 20px", borderBottom: "1px solid var(--gridline)", background: "var(--surface)" }}
            >
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 14 }}>{d.asset + " Pool"}</div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
                {"Deposited " + d.deposit + "  /  Earned " + d.earned}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}