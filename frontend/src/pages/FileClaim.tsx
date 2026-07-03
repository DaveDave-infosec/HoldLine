import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import JudgeLoader from "../components/JudgeLoader";
import { useWallet } from "../hooks/useWallet";
import { usePolicy } from "../hooks/usePolicy";
import type { PolicyView } from "../hooks/usePolicy";
import { useJudgeVerdict } from "../hooks/useJudgeVerdict";
import { ASSETS, priceUrl, newsUrl } from "../lib/constants";
import type { Scenario } from "../lib/constants";

interface ClaimablePolicy extends PolicyView {
  asset: string;
}

const SCENARIOS: { key: Scenario; label: string }[] = [
  { key: "stable", label: "Live / Stable" },
  { key: "mild", label: "Mild Dip (0.97)" },
  { key: "severe", label: "Severe Depeg (0.85)" },
  { key: "wick", label: "Flash Wick (0.92)" },
];

export default function FileClaim() {
  const { address, isConnected } = useWallet();
  const navigate = useNavigate();
  const { filing, error, fileClaim, fetchCount } = useJudgeVerdict();

  const policies = usePolicy();

  const [claimable, setClaimable] = useState<ClaimablePolicy[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [scenario, setScenario] = useState<Scenario>("severe");
  const [caseLabel, setCaseLabel] = useState("");

  useEffect(() => {
    if (!isConnected || !address) return;
    let alive = true;
    (async () => {
      const rows: ClaimablePolicy[] = [];
      const mine = await policies.listMine(address);
      mine
        .filter((p) => p.active && !p.claimed)
        .forEach((p) => rows.push({ ...p, asset: p.asset }));
      if (alive) {
        setClaimable(rows);
        if (rows.length > 0) setSelected(rows[0].asset + ":" + rows[0].policyId);
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address, isConnected]);

  if (!isConnected) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Connect a wallet to file a claim.</div>;
  }

  const onFile = async () => {
    if (!selected) return;
    const [asset] = selected.split(":");
    const cfg = ASSETS[asset];
    if (!cfg) return;

    const countBefore = await fetchCount();
    setCaseLabel("holdline_" + countBefore);

    const requestedAt = new Date().toISOString();
    const url = priceUrl(asset, scenario);

    const returned = await fileClaim(asset, url, newsUrl(asset, scenario), cfg.threshold, address, requestedAt, address);

    let verdictId = returned && returned.startsWith("holdline_") ? returned : "";
    if (!verdictId) {
      const countAfter = await fetchCount();
      if (countAfter > countBefore) verdictId = "holdline_" + (countAfter - 1);
    }

    if (verdictId) {
      navigate("/verdict/" + verdictId);
    }
  };

  return (
    <div>
      {filing && <JudgeLoader caseId={caseLabel || "pending"} />}

      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, marginBottom: 8 }}>FILE A CLAIM</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 40, maxWidth: 560 }}>
        Filing a claim triggers the Holdline judge on GenLayer. It reads live price across exchanges, pool liquidity,
        and news context, then reasons over all of it to confirm or deny a genuine depeg.
      </p>

      {claimable.length === 0 ? (
        <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
          No active policies to claim against. Buy coverage first.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 28, maxWidth: 560 }}>
          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>Policy</label>
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              style={{ width: "100%", marginTop: 8, background: "var(--void)", border: "1px solid var(--gridline)", color: "var(--text-primary)", padding: "12px 14px", fontSize: 14 }}
            >
              {claimable.map((p) => (
                <option key={p.asset + ":" + p.policyId} value={p.asset + ":" + p.policyId}>
                  {p.asset + "  #" + p.policyId}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>
              Price Scenario (demo)
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
              {SCENARIOS.map((s) => (
                <button
                  key={s.key}
                  onClick={() => setScenario(s.key)}
                  style={{
                    background: scenario === s.key ? "var(--elevated)" : "transparent",
                    color: scenario === s.key ? "var(--text-primary)" : "var(--text-muted)",
                    border: "1px solid " + (scenario === s.key ? "var(--accent)" : "var(--gridline)"),
                    padding: "11px 0",
                    fontFamily: "var(--font-mono)",
                    fontSize: 12,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <button
            disabled={filing}
            onClick={onFile}
            style={{ background: filing ? "var(--gridline)" : "var(--accent)", color: filing ? "var(--text-muted)" : "var(--void)", padding: "14px 0", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {filing ? "JUDGE REASONING..." : "FILE CLAIM & REQUEST JUDGMENT"}
          </button>

          {error && <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--peg-broken)" }}>{error}</div>}
        </div>
      )}
    </div>
  );
}