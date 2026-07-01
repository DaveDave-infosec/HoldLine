import { Routes, Route, Link, useLocation } from "react-router-dom";
import { useWallet } from "./hooks/useWallet";
import Home from "./pages/Home";
import PoolDetail from "./pages/PoolDetail";
import FileClaim from "./pages/FileClaim";
import VerdictResult from "./pages/VerdictResult";
import MyPositions from "./pages/MyPositions";
import Admin from "./pages/Admin";
import HowItWorks from "./pages/HowItWorks";

function short(addr: string): string {
  return addr ? addr.slice(0, 6) + "..." + addr.slice(-4) : "";
}

function Nav() {
  const { address, isConnected, isOwner, connecting, connect } = useWallet();
  const loc = useLocation();
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
          {isOwner && link("/admin", "Admin")}
        </nav>
      </div>

      <button
        onClick={connect}
        style={{
          background: isConnected ? "var(--elevated)" : "var(--accent)",
          color: isConnected ? "var(--text-primary)" : "var(--void)",
          border: isConnected ? "1px solid var(--gridline)" : "none",
          padding: "9px 18px",
          fontFamily: "var(--font-mono)",
          fontSize: 13,
          fontWeight: 500,
        }}
      >
        {connecting ? "CONNECTING..." : isConnected ? short(address) : "CONNECT WALLET"}
      </button>
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
        </Routes>
      </main>
    </div>
  );
}