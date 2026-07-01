import { useNavigate } from "react-router-dom";
import PegLine from "./PegLine";

interface AssetCardProps {
  symbol: string;
  price: number;
  poolDeposits: string;
  activePolicies: number;
}

export default function AssetCard({ symbol, price, poolDeposits, activePolicies }: AssetCardProps) {
  const navigate = useNavigate();
  const priceColor =
    price >= 0.98 ? "var(--peg-holding)" : price >= 0.95 ? "var(--peg-strained)" : "var(--peg-broken)";

  return (
    <div
      onClick={() => navigate("/pool/" + symbol.toLowerCase())}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "var(--surface)",
        border: "1px solid var(--gridline)",
        padding: "24px 28px",
        cursor: "pointer",
        gap: 24,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 600 }}>{symbol}</div>
        <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginTop: 6 }}>
          {"Pool: " + poolDeposits + " genUSDC  /  " + activePolicies + " policies active"}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
        <div
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 24,
            fontWeight: 500,
            color: priceColor,
            whiteSpace: "nowrap",
          }}
        >
          {"$" + price.toFixed(4)}
        </div>
        <PegLine price={price} mode="mini" />
      </div>
    </div>
  );
}