import type { Verdict } from "../hooks/useJudgeVerdict";

interface VerdictPanelProps {
  verdict: Verdict;
}

function EvidenceRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", gap: 16, padding: "12px 0", borderBottom: "1px solid var(--gridline)" }}>
      <span style={{ flex: "0 0 140px", fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function VerdictPanel({ verdict }: VerdictPanelProps) {
  const confirmed = String(verdict.depeg_confirmed).toLowerCase() === "true";
  const headColor = confirmed ? "var(--peg-broken)" : "var(--peg-holding)";
  const severity = Number(verdict.severity_pct);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 8 }}>
        <div style={{ fontFamily: "var(--font-serif)", fontSize: 44, fontWeight: 400, lineHeight: 1, color: headColor }}>
          {confirmed ? "DEPEG CONFIRMED" : "DEPEG DENIED"}
        </div>
        {confirmed && (
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 18, color: headColor }}>{severity + "% SEVERITY"}</div>
        )}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", marginBottom: 28 }}>
        {"CONFIDENCE: " + (verdict.confidence_level || "").toUpperCase()}
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
        EVIDENCE REVIEWED
      </div>
      <div style={{ marginBottom: 28 }}>
        <EvidenceRow label="Observed Price" value={"$" + verdict.observed_price} />
        <EvidenceRow label="Duration" value={verdict.sustained_duration_assessment} />
        <EvidenceRow label="Pool Balance" value={verdict.pool_imbalance_assessment} />
        <EvidenceRow label="News Context" value={verdict.news_context_assessment} />
      </div>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 8 }}>
        JUDGE REASONING
      </div>
      <div
        style={{
          fontFamily: "var(--font-body)",
          fontWeight: 300,
          fontStyle: "italic",
          fontSize: 16,
          lineHeight: 1.7,
          color: "var(--text-primary)",
          borderLeft: "2px solid " + headColor,
          paddingLeft: 18,
        }}
      >
        {verdict.reasoning_summary}
      </div>
    </div>
  );
}