import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PegLine from "../components/PegLine";
import VerdictPanel from "../components/VerdictPanel";
import { useJudgeVerdict } from "../hooks/useJudgeVerdict";
import type { Verdict } from "../hooks/useJudgeVerdict";
import { usePool } from "../hooks/usePool";
import { useWallet } from "../hooks/useWallet";

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

  const onRelay = async () => {
    setRelayNotice("");
    const asset = verdict.asset_symbol.toUpperCase();
    const pool = asset === "USDC" ? usdcPool : usdtPool;
    if (!address) {
      setRelayNotice("Connect the owner wallet to settle.");
      return;
    }
    const pid = window.prompt("Policy ID to settle for this verdict:");
    if (pid === null || pid.trim() === "") return;
    const ok = await pool.settleClaim(pid.trim(), confirmed, severity, address);
    if (ok) setRelayNotice("Settlement relayed to the " + asset + " pool for policy #" + pid + ".");
  };

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
            onClick={onRelay}
            disabled={usdcPool.busy || usdtPool.busy}
            style={{ background: "var(--peg-broken)", color: "var(--void)", padding: "14px 28px", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}
          >
            {usdcPool.busy || usdtPool.busy ? "RELAYING..." : "RELAY TO POOL FOR SETTLEMENT"}
          </button>
          {relayNotice && (
            <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--peg-holding)" }}>{relayNotice}</div>
          )}
        </div>
      )}
    </div>
  );
}