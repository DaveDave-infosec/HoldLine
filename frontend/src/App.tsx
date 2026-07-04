import { useState, useEffect, useCallback } from "react";
import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import { usePool } from "./hooks/usePool";
import { poolMint } from "./lib/genlayer";
import Home from "./pages/Home";
import PoolDetail from "./pages/PoolDetail";
import FileClaim from "./pages/FileClaim";
import VerdictResult from "./pages/VerdictResult";
import MyPositions from "./pages/MyPositions";
import Admin from "./pages/Admin";
import HowItWorks from "./pages/HowItWorks";
import Guide from "./pages/Guide";

function short(addr: string): string {
  return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

function Nav() {
  const { address, isConnected, isOwner, connecting, connect, disconnect } = useWallet();
  const { readBalance } = usePool("USDC");
  const [balance, setBalance] = useState<number | null>(null);
  const [fauceting, setFauceting] = useState(false);
  const loc = useLocation();

  const loadBalance = useCallback(async () => {
    if (!isConnected || !address) {
      setBalance(null);
      return;
    }
    try {
      const b = await readBalance(address);
      setBalance(b);
    } catch {
      // ignore transient read errors
    }
  }, [address, isConnected, readBalance]);

  useEffect(() => {
    loadBalance();
    const id = setInterval(loadBalance, 15000);
    return () => clearInterval(id);
  }, [loadBalance]);

  const onFaucet = async () => {
    if (!address) return;
    setFauceting(true);
    try {
      await poolMint(address, 50000, address);
      for (let i = 0; i < 5; i++) {
        await new Promise((r) => setTimeout(r, 2500));
        await loadBalance();
      }
    } catch {
      // ignore
    } finally {
      setFauceting(false);
    }
  };

  const link = (to: string, label: string) => {
    const on = loc.pathname === to;
    return (
      <Link
        to={to}
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 14,
          color: on ? "var(--text-primary)" : "var(--text-muted)",
          paddingBottom: 4,
          borderBottom: on ? "1px solid var(--accent)" : "1px solid transparent",
        }}
      >
        {label}
      </Link>
    );
  };

  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 40px",
        borderBottom: "1px solid var(--gridline)",
        position: "sticky",
        top: 0,
        background: "var(--void)",
        zIndex: 10,
        flexWrap: "wrap",
        gap: 16,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 32, flexWrap: "wrap" }}>
        <Link to="/" style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 700, letterSpacing: "0.02em" }}>
          HOLDLINE
        </Link>
        <nav style={{ display: "flex", gap: 24, alignItems: "center" }}>
          {link("/", "Markets")}
          {link("/positions", "My Positions")}
          {link("/how-it-works", "How It Works")}
          {link("/guide", "Guide")}
          {isOwner && link("/admin", "Admin")}
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {isConnected && (
          <button
            onClick={onFaucet}
            disabled={fauceting}
            title="Mint 50,000 test genUSDC to your wallet"
            style={{
              background: "transparent",
              color: "var(--accent)",
              border: "1px solid var(--accent)",
              padding: "9px 14px",
              fontFamily: "var(--font-mono)",
              fontSize: 12,
              fontWeight: 500,
              cursor: fauceting ? "default" : "pointer",
              opacity: fauceting ? 0.6 : 1,
            }}
          >
            {fauceting ? "MINTING..." : "GET TEST genUSDC"}
          </button>
        )}
        {isConnected && balance !== null && (
          <div title="Your genUSDC wallet balance" style={{ fontFamily: "var(--font-mono)", fontSize: 13, color: "var(--text-muted)" }}>
            <span style={{ color: "var(--peg-holding)" }}>{balance.toLocaleString()}</span> genUSDC
          </div>
        )}
        <button
          onClick={isConnected ? disconnect : connect}
          title={isConnected ? "Click to disconnect" : "Connect wallet"}
          style={{
            background: isConnected ? "var(--elevated)" : "var(--accent)",
            color: isConnected ? "var(--text-primary)" : "var(--void)",
            border: isConnected ? "1px solid var(--gridline)" : "none",
            padding: "9px 18px",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          {connecting ? "CONNECTING..." : isConnected ? short(address) + "  \u00D7" : "CONNECT WALLET"}
        </button>
      </div>
    </header>
  );
}

export default function App() {
  return (
    <div style={{ minHeight: "100vh" }}>
      <Nav />
      <main style={{ maxWidth: 1080, margin: "0 auto", padding: "40px 40px 80px" }}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/pool/:asset" element={<PoolDetail />} />
          <Route path="/claim" element={<FileClaim />} />
          <Route path="/verdict/:verdictId" element={<VerdictResult />} />
          <Route path="/positions" element={<MyPositions />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/guide" element={<Guide />} />
        </Routes>
      </main>
    </div>
  );
}
