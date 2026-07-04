import { useEffect, useState } from "react";

type Phase = "submitting" | "consensus";

interface JudgeLoaderProps {
  caseId: string;
  phase: Phase;
}

const STEPS: { key: Phase; n: string; label: string }[] = [
  { key: "submitting", n: "01", label: "SUBMIT CLAIM TRANSACTION" },
  { key: "consensus", n: "02", label: "GENLAYER VALIDATOR CONSENSUS" },
];

const SIGNALS = [
  "Live price across venues",
  "On-chain pool liquidity ratio",
  "News context for a reported cause",
];

function sweep(tick: number): string {
  const pos = tick % 16;
  let out = "";
  for (let i = 0; i < 16; i++) {
    out += i === pos || i === (pos + 15) % 16 ? "\u2588" : "\u2591";
  }
  return out;
}

export default function JudgeLoader({ caseId, phase }: JudgeLoaderProps) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 110);
    return () => clearInterval(id);
  }, []);

  const activeIndex = phase === "submitting" ? 0 : 1;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,11,13,0.96)",
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
          const done = i < activeIndex;
          const inProgress = i === activeIndex;
          const state = done ? "COMPLETE" : inProgress ? "IN PROGRESS" : "QUEUED";
          const color = done ? "var(--peg-holding)" : inProgress ? "var(--accent)" : "var(--text-muted)";
          const track = done ? "\u2588".repeat(16) : inProgress ? sweep(tick) : "\u2591".repeat(16);
          return (
            <div key={s.n} style={{ marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 13 }}>
                <span style={{ color: done || inProgress ? "var(--text-primary)" : "var(--text-muted)" }}>{"[ " + s.n + " ]  " + s.label}</span>
                <span style={{ color }}>{state}</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color, letterSpacing: "0.05em", marginTop: 6 }}>{track}</div>
            </div>
          );
        })}

        <div style={{ height: 1, background: "var(--gridline)", margin: "8px 0 16px" }} />

        {phase === "submitting" ? (
          <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6 }}>
            Confirm the transaction in your wallet. Nothing is read or judged until this claim is on-chain.
          </div>
        ) : (
          <div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 14 }}>
              Your claim is on-chain. GenLayer validators are executing the judge and reaching consensus. It reasons over three signals at once:
            </div>
            {SIGNALS.map((sig) => (
              <div key={sig} style={{ display: "flex", justifyContent: "space-between", fontFamily: "var(--font-mono)", fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--gridline)" }}>
                <span style={{ color: "var(--text-primary)" }}>{sig}</span>
                <span style={{ color: "var(--text-muted)" }}>UNDER REVIEW</span>
              </div>
            ))}
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 16 }}>
              TYPICALLY 30-90 SECONDS
            </div>
          </div>
        )}
      </div>
    </div>
  );
}