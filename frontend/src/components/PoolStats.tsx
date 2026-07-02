import type { PoolStats as Stats } from "../hooks/usePool";

interface PoolStatsProps {
  stats: Stats | null;
  yourSharePct?: number | null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--gridline)" }}>
      <span style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>{label}</span>
      <span style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--text-primary)" }}>{value}</span>
    </div>
  );
}

export default function PoolStats({ stats, yourSharePct }: PoolStatsProps) {
  if (!stats) {
    return <div style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 13 }}>Loading pool stats...</div>;
  }
  return (
    <div style={{ background: "var(--elevated)", border: "1px solid var(--gridline)", padding: "8px 20px 16px" }}>
      <Row label="Total Deposits" value={stats.totalDeposits.toLocaleString() + " genUSDC"} />
      <Row label="Active Coverage" value={stats.totalActiveCoverage.toLocaleString() + " genUSDC"} />
      <Row label="Utilization" value={stats.utilizationPct.toFixed(1) + "%  of  " + (stats.maxUtilizationBps / 100).toFixed(0) + "% cap"} />
      <Row label="Policies Written" value={String(stats.policyCount)} />
      <Row label="Protocol Fee" value={(stats.protocolFeeBps / 100).toFixed(1) + "%"} />
      {yourSharePct != null && <Row label="Your Pool Share" value={yourSharePct.toFixed(2) + "%"} />}
    </div>
  );
}