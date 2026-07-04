import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import PegLine from "../components/PegLine";
import VerdictPanel from "../components/VerdictPanel";
import { useJudgeVerdict } from "../hooks/useJudgeVerdict";
import type { Verdict } from "../hooks/useJudgeVerdict";
import { usePool } from "../hooks/usePool";
import { useWallet } from "../hooks/useWallet";
import { poolGetPolicy } from "../lib/genlayer";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export default function VerdictResult() {
  const { verdictId } = useParams<{ verdictId: string }>();
  const navigate = useNavigate();
  const { fetchVerdict } = useJudgeVerdict();
  const { address, isOwner } = useWallet();
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [loading, setLoading] = useState(true);
  const usdcPool = usePool("USDC");
  const usdtPool = usePool("USDT");

  const [settled, setSettled] = useState(false);
  const [settling, setSettling] = useState(false);
  const [settleNotice, setSettleNotice] = useState("");

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

  // On load, check whether this verdict's policy is already settled.
  useEffect(() => {
    if (!verdict || !verdict.policy_id) return;
    let alive = true;
    (async () => {
      try {
        const p: any = await poolGetPolicy(String(verdict.policy_id));
        if (alive && p && String(p.claimed) === "true") setSettled(true);
      } catch {
        // ignore
      }
    })();
    return () => {
      alive = false;
    };
  }, [verdict]);

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

  const asset = verdict.asset_symbol.toUpperCase();
  const pool = asset === "USDC" ? usdcPool : usdtPool;
  const isHolder = !!address && verdict.requester.toLowerCase() === address.toLowerCase();
  const canSettle = confirmed && !!verdict.policy_id && !settled && (isHolder || isOwner);
  const holderShort = verdict.requester.slice(0, 6) + "..." + verdict.requester.slice(-4);

  const onSettle = async () => {
    if (!address) {
      setSettleNotice("Connect the wallet that filed this claim to settle.");
      return;
    }
    setSettleNotice("");
    setSettling(true);
    const ok = await pool.settleFromVerdict(verdict.verdict_id, address);
    if (!ok) {
      setSettling(false);
      setSettleNotice("Settlement did not go through. It may already be settled, or the pool is short on liquidity.");
      return;
    }
    for (let i = 0; i < 20; i++) {
      await sleep(3000);
      try {
        const p: any = await poolGetPolicy(String(verdict.policy_id));
        if (p && String(p.claimed) === "true") {
          setSettled(true);
          setSettling(false);
          setSettleNotice("Claim settled. Payout sent to the policy holder.");
          return;
        }
      } catch {
        // keep polling
      }
    }
    setSettling(false);
    setSettleNotice("Settlement submitted. It may take a moment to finalize, check My Positions shortly.");
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

      {confirmed && (
        <div style={{ marginTop: 40 }}>
          {settled ? (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--peg-holding)" }}>
              {"SETTLED  /  policy #" + verdict.policy_id + " paid out"}
            </div>
          ) : canSettle ? (
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--accent)", marginBottom: 12, letterSpacing: "0.03em" }}>
                CLAIM CONFIRMED. ONE STEP LEFT: SETTLE TO RECEIVE YOUR PAYOUT.
              </div>
              <button
                onClick={onSettle}
                disabled={settling || pool.busy}
                style={{ background: "var(--accent)", color: "var(--void)", padding: "14px 28px", fontSize: 14, fontWeight: 600, letterSpacing: "0.02em" }}
              >
                {settling ? "SETTLING..." : "SETTLE CLAIM"}
              </button>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 12, maxWidth: 520, lineHeight: 1.6 }}>
                {"Reads the verdict straight from the judge and pays policy #" + verdict.policy_id + ". No owner relay, the pool settles from the on-chain verdict."}
              </div>
            </div>
          ) : (
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
              {"Settleable by the policy holder (" + holderShort + ")."}
            </div>
          )}
          {settleNotice && (
            <div style={{ marginTop: 16, fontFamily: "var(--font-mono)", fontSize: 12, color: settled ? "var(--peg-holding)" : "var(--text-muted)" }}>
              {settleNotice}
            </div>
          )}
        </div>
      )}
    </div>
  );
}