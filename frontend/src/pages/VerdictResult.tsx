import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PegLine from "../components/PegLine";
import VerdictPanel from "../components/VerdictPanel";
import { useJudgeVerdict } from "../hooks/useJudgeVerdict";
import type { Verdict } from "../hooks/useJudgeVerdict";
import { usePool } from "../hooks/usePool";
import { usePolicy } from "../hooks/usePolicy";
import type { PolicyView } from "../hooks/usePolicy";
import { useWallet } from "../hooks/useWallet";

function short(addr: string): string {
  return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

export default function VerdictResult() {
  const { verdictId } = useParams<{ verdictId: string }>();
  const navigate = useNavigate();
  const { fetchVerdict } = useJudgeVerdict();
  const { address, isOwner } = useWallet();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(true);
  const [relayNotice, setRelayNotice] = useState("");
  const usdcPool = usePool("USDC");
  const usdtPool = usePool("USDT");
  const policies = usePolicy();

  const [showSettle, setShowSettle] = useState(false);
  const [targets, setTargets] = useState<PolicyView[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [settlePid, setSettlePid] = useState("");
  const [manualPid, setManualPid] = useState("");

  useEffect(() => {
    if (!verdictId) return;
    let alive = true;
    let tries = 0;
    async function poll() {
      const v = await fetchVerdict(verdictId as string);
      if (v && alive) {
        setVerdict(v);
        setLoading(false);
        return;
      }
      tries += 1;
      if (tries < 30 && alive) {
        setTimeout(poll, 3000);
      } else if (alive) {
        setLoading(false);
      }
    }
    poll();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verdictId]);

  if (loading) {
    return (
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
        {"Awaiting consensus for case " + verdictId + "..."}
      </div>
    );
  }
  if (!verdict) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Verdict not found.</div>;
  }

  const confirmed = String(verdict.depeg_confirmed).toLowerCase() === "true";
  const frozenPrice = parseFloat(verdict.observed_price) || 1.0;
  const severity = Number(verdict.severity_pct);
  const annotation = confirmed ? "DEPEG CONFIRMED  " + severity + "% SEVERITY" : "PEG HELD  CLAIM DENIED";

  const openSettle = async () => {
    setRelayNotice("");
    if (!address) {
      setRelayNotice("Connect the owner wallet to settle.");
      return;
    }
    setSettlePid("");
    setManualPid("");
    setTargets([]);
    setShowSettle(true);
    setLoadingTargets(true);
    try {
      const mine = await policies.listMine(verdict.requester);
      const open = mine.filter(
        (p) => p.asset.toUpperCase() === verdict.asset_symbol.toUpperCase() && p.active && !p.claimed,
      );
      setTargets(open);
      if (open.length > 0) setSettlePid(String(open[0].policyId));
    } catch {
      setTargets([]);
    } finally {
      setLoadingTargets(false);
    }
  };

  const doSettle = async () => {
    const pid = (settlePid || manualPid).trim();
    if (!pid) return;
    const asset = verdict.asset_symbol.toUpperCase();
    const pool = asset === "USDC" ? usdcPool : usdtPool;
    const ok = await pool.settleClaim(pid, confirmed, severity, address);
    setShowSettle(false);
    if (ok) setRelayNotice("Settlement relayed to the " + asset + " pool for policy #" + pid + ".");
    else setRelayNotice("Settlement did not complete. Try again.");
  };

  const busy = usdcPool.busy || usdtPool.busy;
  const canConfirm = !!(settlePid || manualPid.trim());

  return (
    <div>
      <button
        onClick={() => navigate("/")}
        style={{ background: "transparent", color: "var(--text-muted)", fontFamily: "var(--font-mono)", fontSize: 12, marginBottom: 24 }}
      >
        BACK TO MARKETS
      </button>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)", marginBottom: 24 }}>
        {"CASE " + verdict.verdict_id}
      </div>
      <div style={{ border: "1px solid var(--gridline)", background: "var(--surface)", padding: 24, marginBottom: 40 }}>
        <PegLine
          price={frozenPrice}
          mode="frozen"
          annotation={annotation}
          forceStatus={confirmed ? "broken" : "holding"}
        />
      </div>
      <VerdictPanel verdict={verdict} />
      {isOwner && confirmed && (
        <div style={{ marginTop: 40 }}>
          <button
            onClick={openSettle}
            disabled={busy}
            style={{ background: "var(--peg-broken)", color: "var(--void)", padding: "14px 28px", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {busy ? "RELAYING..." : "RELAY TO POOL FOR SETTLEMENT"}
          </button>
          {relayNotice && (
            <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--peg-holding)" }}>{relayNotice}</div>
          )}
        </div>
      )}

      {showSettle && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(10,11,13,0.96)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ width: "100%", maxWidth: 480, border: "1px solid var(--gridline)", background: "var(--surface)", padding: 28 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, letterSpacing: "0.04em", marginBottom: 6 }}>
              RELAY SETTLEMENT
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginBottom: 20 }}>
              {"CASE " + verdict.verdict_id + "  /  " + severity + "% SEVERITY"}
            </div>
            <div style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginBottom: 8 }}>
              {"Policy to settle  (holder " + short(verdict.requester) + ")"}
            </div>
            {loadingTargets ? (
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>Loading open policies...</div>
            ) : targets.length > 0 ? (
              <select
                value={settlePid}
                onChange={(e) => setSettlePid(e.target.value)}
                style={{ width: "100%", background: "var(--void)", border: "1px solid var(--gridline)", color: "var(--text-primary)", padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 14 }}
              >
                {targets.map((p) => (
                  <option key={p.policyId} value={String(p.policyId)}>
                    {"#" + p.policyId + "   coverage " + p.coverage.toLocaleString()}
                  </option>
                ))}
              </select>
            ) : (
              <div>
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginBottom: 8 }}>
                  No open policies found for this holder. Enter a policy ID manually.
                </div>
                <input
                  value={manualPid}
                  onChange={(e) => setManualPid(e.target.value)}
                  placeholder="Policy ID"
                  style={{ width: "100%", background: "var(--void)", border: "1px solid var(--gridline)", color: "var(--text-primary)", padding: "12px 14px", fontFamily: "var(--font-mono)", fontSize: 14 }}
                />
              </div>
            )}
            <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
              <button
                onClick={doSettle}
                disabled={busy || !canConfirm}
                style={{ background: "var(--accent)", color: "var(--void)", padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 13, fontWeight: 600, opacity: busy || !canConfirm ? 0.5 : 1 }}
              >
                {busy ? "RELAYING..." : "CONFIRM SETTLEMENT"}
              </button>
              <button
                onClick={() => setShowSettle(false)}
                disabled={busy}
                style={{ background: "transparent", color: "var(--text-muted)", border: "1px solid var(--gridline)", padding: "12px 20px", fontFamily: "var(--font-mono)", fontSize: 13 }}
              >
                CANCEL
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}