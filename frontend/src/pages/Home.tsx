import { useEffect, useState } from "react";
import AssetCard from "../components/AssetCard";
import { usePool } from "../hooks/usePool";
import { ASSET_LIST, priceUrl } from "../lib/constants";

interface Row {
  symbol: string;
  price: number;
  poolDeposits: string;
  activePolicies: number;
}

export default function Home() {
  const [rows, setRows] = useState<Row[]>(
    ASSET_LIST.map((a) => ({ symbol: a.symbol, price: 1.0, poolDeposits: "0", activePolicies: 0 })),
  );

  const usdc = usePool("USDC");
  const usdt = usePool("USDT");
  const poolFor = (sym: string) => (sym === "USDC" ? usdc : usdt);

  useEffect(() => {
    let alive = true;

    async function tick() {
      const next: Row[] = [];
      for (const a of ASSET_LIST) {
        let price = 1.0;
        try {
          const res = await fetch(priceUrl(a.symbol));
          const data = await res.json();
          price = typeof data.price === "number" ? data.price : 1.0;
        } catch {
          price = 1.0;
        }
        let poolDeposits = "0";
        let activePolicies = 0;
        const stats = await poolFor(a.symbol).readStats();
        if (stats) {
          poolDeposits = Number(stats.totalDeposits).toLocaleString();
          activePolicies = stats.policyCount;
        }
        next.push({ symbol: a.symbol, price, poolDeposits, activePolicies });
      }
      if (alive) setRows(next);
    }

    tick();
    const id = setInterval(tick, 15000);
    return () => {
      alive = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 56, fontWeight: 600, lineHeight: 1.05 }}>HOLDLINE</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 17, color: "var(--text-muted)", marginTop: 12, marginBottom: 48 }}>
        The peg holds, or it doesn't. Holdline knows which.
      </p>

      <div style={{ height: 1, background: "var(--gridline)", marginBottom: 24 }} />

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {rows.map((r) => (
          <AssetCard
            key={r.symbol}
            symbol={r.symbol}
            price={r.price}
            poolDeposits={r.poolDeposits}
            activePolicies={r.activePolicies}
          />
        ))}
      </div>

      <div style={{ height: 1, background: "var(--gridline)", marginTop: 32 }} />
    </div>
  );
}