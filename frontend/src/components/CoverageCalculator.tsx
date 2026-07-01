import { useState, useMemo } from "react";

interface CoverageCalculatorProps {
  premiumRateBps: number;
  busy: boolean;
  onPurchase: (coverage: string, premium: string) => void;
}

export default function CoverageCalculator({ premiumRateBps, busy, onPurchase }: CoverageCalculatorProps) {
  const [coverage, setCoverage] = useState("10000");

  const premium = useMemo(() => {
    const c = parseFloat(coverage || "0");
    if (!isFinite(c) || c <= 0) return 0;
    return (c * premiumRateBps) / 10000;
  }, [coverage, premiumRateBps]);

  const valid = parseFloat(coverage || "0") > 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
        Coverage Amount (genUSDC)
      </label>
      <input
        value={coverage}
        onChange={(e) => setCoverage(e.target.value.replace(/[^0-9.]/g, ""))}
        inputMode="decimal"
        style={{
          background: "var(--void)",
          border: "1px solid var(--gridline)",
          color: "var(--text-primary)",
          padding: "12px 14px",
          fontSize: 18,
        }}
      />

      <div
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 14,
          color: "var(--text-primary)",
          padding: "14px 16px",
          background: "var(--elevated)",
          border: "1px solid var(--gridline)",
        }}
      >
        {"Coverage: " + (parseFloat(coverage || "0") || 0).toLocaleString() + " genUSDC"}
        <br />
        {"Premium (" + (premiumRateBps / 100).toFixed(1) + "%): " + premium.toLocaleString() + " genUSDC"}
      </div>

      <button
        disabled={!valid || busy}
        onClick={() => onPurchase(coverage, String(premium))}
        style={{
          background: valid && !busy ? "var(--accent)" : "var(--gridline)",
          color: valid && !busy ? "var(--void)" : "var(--text-muted)",
          padding: "13px 0",
          fontSize: 14,
          fontWeight: 600,
          letterSpacing: "0.02em",
        }}
      >
        {busy ? "PROCESSING..." : "PURCHASE POLICY"}
      </button>
    </div>
  );
}