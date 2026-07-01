import { useEffect, useState } from "react";

interface JudgeLoaderProps {
  caseId: string;
}

const STEPS = [
  { n: "01", label: "FETCHING LIVE PRICE DATA", detail: "Querying Coinbase, Binance, Kraken" },
  { n: "02", label: "READING POOL LIQUIDITY", detail: "Checking on-chain pool ratios" },
  { n: "03", label: "SCANNING NEWS CONTEXT", detail: "Searching for reported cause" },
  { n: "04", label: "JUDGE REASONING", detail: "Validators weighing combined evidence" },
];

function bar(pct: number): string {
  const filled = Math.round(pct * 16);
  return "#".repeat(filled).replace(/#/g, "\u2588") + "\u2591".repeat(16 - filled);
}

export default function JudgeLoader({ caseId }: JudgeLoaderProps) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((a) => (a < STEPS.length ? a + 1 : a));
    }, 4000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(6,8,10,0.96)",
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, border: "1px solid var(--gridline)", background: "var(--surface)", padding: 32 }}>
        <div style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, letterSpacing: "0.04em" }}>
          HOLDLINE RISK DESK
        </div>
        <div style={{ height: 1, background: "var(--gridline)", margin: "16px 0" }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
          {"CLAIM FILED  CASE " + caseId}
        </div>

        {STEPS.map((s, i) => {
          const done = i < active;
          const inProgress = i === active;
          const state = done ? "COMPLETE" : inProgress ? "IN PROGRESS" : "QUEUED";
          const pct = done ? 1 : inProgress ? 0.55 : 0;
          const color = done ? "var(--peg-holding)" : inProgress ? "var(--accent)" : "var(--text-muted)";
          return (
            <div key={s.n} style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                <span style={{ color: "var(--text-primary)" }}>{"[ " + s.n + " ]  " + s.label}</span>
                <span style={{ color }}>{state}</span>
              </div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-muted)", margin: "4px 0 6px" }}>
                {s.detail}
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, letterSpacing: "0.05em" }}>{bar(pct)}</div>
            </div>
          );
        })}

        <div style={{ height: 1, background: "var(--gridline)", margin: "8px 0 16px" }} />
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
          ESTIMATED COMPLETION: 30-90 SECONDS
        </div>
      </div>
    </div>
  );
}