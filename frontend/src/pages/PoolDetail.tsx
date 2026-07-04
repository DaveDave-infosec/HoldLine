import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PegLine from "../components/PegLine";
import PoolStats from "../components/PoolStats";
import CoverageCalculator from "../components/CoverageCalculator";
import { usePool } from "../hooks/usePool";
import { useWallet } from "../hooks/useWallet";
import type { PoolStats as Stats, ProviderPosition } from "../hooks/usePool";
import { ASSETS, priceUrl } from "../lib/constants";

type Tab = "coverage" | "liquidity";

export default function PoolDetail() {
  const { asset } = useParams<{ asset: string }>();
  const symbol = (asset || "usdc").toUpperCase();
  const cfg = ASSETS[symbol];
  const navigate = useNavigate();

  const { address, isConnected } = useWallet();
  const pool = usePool(symbol);

  const [price, setPrice] = useState(1.0);
  const [tab, setTab] = useState<Tab>("coverage");
  const [stats, setStats] = useState<Stats | null>(null);
  const [depositAmt, setDepositAmt] = useState(50000);
  const [sharePct, setSharePct] = useState<number | null>(null);
  const [myPos, setMyPos] = useState<ProviderPosition | null>(null);
  const [notice, setNotice] = useState("");

  const refresh = useCallback(async () => {
    const s = await pool.readStats();
    setStats(s);
    if (s && isConnected && address) {
      const pos = await pool.readPosition(address);
      setMyPos(pos);
      const total = s.totalDeposits;
      const mine = pos ? pos.value : 0;
      setSharePct(total > 0 ? (mine / total) * 100 : 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected, symbol]);

  useEffect(() => {
    let alive = true;
    async function tickPrice() {
      try {
        const res = await fetch(priceUrl(symbol));
        const data = await res.json();
        if (alive && typeof data.price === "number") setPrice(data.price);
      } catch {
        // hold last
      }
    }
    tickPrice();
    refresh();
    const id = setInterval(tickPrice, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);

  if (!cfg) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Unknown asset.</div>;
  }

  const onPurchase = async (coverage: number) => {
    if (!address) {
      setNotice("Connect a wallet first.");
      return;
    }
    setNotice("");
    const ok = await pool.purchasePolicy(coverage, address);
    if (ok) {
      setNotice("Policy purchased. View it under My Positions.");
      refresh();
    }
  };

  const onDeposit = async () => {
    if (!address) {
      setNotice("Connect a wallet first.");
      return;
    }
    setNotice("");
    const ok = await pool.deposit(depositAmt, address);
    if (ok) {
      setNotice("Liquidity deposited.");
      refresh();
    }
  };

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        style={{ background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 24 }}
      >
        BACK TO MARKETS
      </button>

      <div style={{ display: "flex", alignItems: "baseline", gap: 16, marginBottom: 24 }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontSize: 40, fontWeight: 600 }}>{symbol}</h1>
        <span style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)" }}>
          {"Threshold $" + cfg.threshold + "  /  premium " + (cfg.premiumRateBps / 100).toFixed(1) + "%"}
        </span>
      </div>

      <div style={{ border: "1px solid var(--gridline)", background: "var(--surface)", padding: 24, marginBottom: 32 }}>
        <PegLine price={price} mode="live" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40 }}>
        <div>
          <div style={{ display: "flex", gap: 4, marginBottom: 24 }}>
            <button
              onClick={() => setTab("coverage")}
              style={{
                flex: 1,
                background: tab === "coverage" ? "var(--elevated)" : "transparent",
                color: tab === "coverage" ? "var(--text-primary)" : "var(--text-muted)",
                border: "1px solid var(--gridline)",
                padding: "10px 0",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              Buy Coverage
            </button>
            <button
              onClick={() => setTab("liquidity")}
              style={{
                flex: 1,
                background: tab === "liquidity" ? "var(--elevated)" : "transparent",
                color: tab === "liquidity" ? "var(--text-primary)" : "var(--text-muted)",
                border: "1px solid var(--gridline)",
                padding: "10px 0",
                fontFamily: "var(--font-body)",
                fontSize: 13,
              }}
            >
              Provide Liquidity
            </button>
          </div>

          {tab === "coverage" ? (
            <CoverageCalculator premiumRateBps={cfg.premiumRateBps} busy={pool.busy} onPurchase={onPurchase} />
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
                Deposit Amount (genUSDC)
              </label>
              <input
                value={String(depositAmt)}
                onChange={(e) => setDepositAmt(Number(e.target.value.replace(/[^0-9]/g, "")) || 0)}
                inputMode="numeric"
                style={{ background: "var(--void)", border: "1px solid var(--gridline)", color: "var(--text-primary)", padding: "12px 14px", fontSize: 18 }}
              />
              <button
                disabled={pool.busy}
                onClick={onDeposit}
                style={{ background: pool.busy ? "var(--gridline)" : "var(--accent)", color: pool.busy ? "var(--text-muted)" : "var(--void)", padding: "13px 0", fontSize: 14, fontWeight: 600 }}
              >
                {pool.busy ? "PROCESSING..." : "DEPOSIT"}
              </button>
              {myPos && myPos.deposit > 0 && (
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", lineHeight: 1.8, borderTop: "1px solid var(--gridline)", paddingTop: 12 }}>
                  <div style={{ letterSpacing: "0.08em", marginBottom: 4 }}>YOUR POSITION</div>
                  <div>{"Deposited  " + myPos.deposit.toLocaleString()}</div>
                  <div>{"Value  " + myPos.value.toLocaleString()}</div>
                  <div>
                    {"P&L  "}
                    <span style={{ color: myPos.pnl >= 0 ? "var(--peg-holding)" : "var(--peg-broken)" }}>
                      {(myPos.pnl >= 0 ? "+" : "") + myPos.pnl.toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {notice && (
            <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--peg-holding)" }}>{notice}</div>
          )}
          {pool.error && (
            <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--peg-broken)" }}>{pool.error}</div>
          )}
        </div>

        <div>
          <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
            POOL STATUS
          </div>
          <PoolStats stats={stats} yourSharePct={sharePct} />
        </div>
      </div>
    </div>
  );
}