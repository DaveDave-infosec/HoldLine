import { useState } from "react";
import { useWallet } from "../hooks/useWallet";
import { PRICE_SERVER_BASE, ADMIN_KEY, ASSET_LIST } from "../lib/constants";

type ScenarioKey = "mild" | "severe" | "wick" | "stable";

const SCENARIO_PAYLOADS: Record<ScenarioKey, any> = {
  mild: { price: 0.97, sources: [{ exchange: "Coinbase", price: 0.971 }, { exchange: "Binance", price: 0.969 }, { exchange: "Kraken", price: 0.97 }], pool_ratio: { primary: 56, pair: 44 } },
  severe: { price: 0.85, sources: [{ exchange: "Coinbase", price: 0.851 }, { exchange: "Binance", price: 0.849 }, { exchange: "Kraken", price: 0.85 }], pool_ratio: { primary: 78, pair: 22 } },
  wick: { price: 0.92, sources: [{ exchange: "Coinbase", price: 1.0 }, { exchange: "Binance", price: 0.92 }, { exchange: "Kraken", price: 0.999 }], pool_ratio: { primary: 51, pair: 49 } },
  stable: { price: 1.0, sources: [{ exchange: "Coinbase", price: 1.0 }, { exchange: "Binance", price: 1.0 }, { exchange: "Kraken", price: 1.0 }], pool_ratio: { primary: 50, pair: 50 } },
};

export default function Admin() {
  const { isOwner, isConnected } = useWallet();
  const [asset, setAsset] = useState("USDC");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  if (!isConnected) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--text-muted)" }}>Connect a wallet.</div>;
  }
  if (!isOwner) {
    return <div style={{ fontFamily: "var(--font-mono)", color: "var(--peg-broken)" }}>Owner access only.</div>;
  }

  async function push(payload: any, label: string) {
    setBusy(true);
    setStatus("");
    try {
      const base = PRICE_SERVER_BASE.replace(/\/+$/, "");
      const res = await fetch(base + "/admin/update/" + asset.toUpperCase(), {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-key": ADMIN_KEY },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setStatus(label + " pushed to " + asset + ".");
      } else {
        setStatus("Push failed: " + res.status + " " + (await res.text()));
      }
    } catch (err: any) {
      setStatus("Push error: " + (err?.message || "unknown"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 600, marginBottom: 8 }}>ADMIN</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)", marginBottom: 32 }}>
        Mock price control. The deterministic scenario buttons below drive the demo. These POST live state to the mock
        server, which holds on a warm instance.
      </p>

      <label style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--text-muted)" }}>Asset</label>
      <select
        value={asset}
        onChange={(e) => setAsset(e.target.value)}
        style={{ width: "100%", margin: "8px 0 28px", background: "var(--void)", border: "1px solid var(--gridline)", color: "var(--text-primary)", padding: "12px 14px", fontSize: 14 }}
      >
        {ASSET_LIST.map((a) => (
          <option key={a.symbol} value={a.symbol}>{a.symbol}</option>
        ))}
      </select>

      <div style={{ fontFamily: "var(--font-display)", fontSize: 13, letterSpacing: "0.08em", color: "var(--text-muted)", marginBottom: 12 }}>
        QUICK SCENARIOS
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <button disabled={busy} onClick={() => push(SCENARIO_PAYLOADS.mild, "Mild depeg")} style={btn("var(--peg-strained)")}>
          Simulate Mild Depeg (0.97)
        </button>
        <button disabled={busy} onClick={() => push(SCENARIO_PAYLOADS.severe, "Severe depeg")} style={btn("var(--peg-broken)")}>
          Simulate Severe Depeg (0.85)
        </button>
        <button disabled={busy} onClick={() => push(SCENARIO_PAYLOADS.wick, "Flash wick")} style={btn("var(--accent)")}>
          Simulate Flash Wick (0.92)
        </button>
        <button disabled={busy} onClick={() => push(SCENARIO_PAYLOADS.stable, "Reset stable")} style={btn("var(--peg-holding)")}>
          Reset to Stable ($1.00)
        </button>
      </div>

      {status && (
        <div style={{ marginTop: 24, fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-primary)" }}>{status}</div>
      )}

      <div style={{ marginTop: 32, padding: 16, border: "1px solid var(--gridline)", background: "var(--elevated)", fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--text-muted)", lineHeight: 1.6 }}>
        Note: the demo claim flow files against deterministic scenario URLs that do not depend on this live state, so a
        cold mock server cannot break a claim. These buttons drive the Markets page peg lines for visual effect.
      </div>
    </div>
  );
}

function btn(accent: string): React.CSSProperties {
  return {
    background: "var(--surface)",
    color: "var(--text-primary)",
    border: "1px solid " + accent,
    padding: "13px 8px",
    fontFamily: "var(--font-mono)",
    fontSize: 12,
  };
}