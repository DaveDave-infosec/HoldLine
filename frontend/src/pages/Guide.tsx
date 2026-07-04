const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: "01",
    title: "Connect your wallet",
    body:
      "Click CONNECT WALLET in the top right. Holdline runs on the GenLayer Studio network, and your wallet is prompted to add or switch to it automatically.",
  },
  {
    n: "02",
    title: "Get test genUSDC",
    body:
      "Click GET TEST genUSDC in the top bar to mint 50,000 test genUSDC to your wallet. This is the currency for everything else. Click again whenever you need more.",
  },
  {
    n: "03",
    title: "Open a market",
    body:
      "From Markets, open USDC or USDT. Each market shows a live peg line and pool stats. From here you can either buy coverage or provide liquidity.",
  },
  {
    n: "04",
    title: "Buy coverage",
    body:
      "Choose a coverage amount and purchase a policy. You pay a small premium up front, 1% on USDC and 1.5% on USDT. Your policy then appears under My Positions.",
  },
  {
    n: "05",
    title: "Or provide liquidity",
    body:
      "Switch a market to Provide Liquidity and deposit genUSDC. You earn a share of every premium, and your deposit backs payouts if a depeg is confirmed.",
  },
  {
    n: "06",
    title: "File a claim",
    body:
      "From My Positions, file a claim on an active policy. This triggers the GenLayer judge, which reads price across venues, pool liquidity, and news context, then reasons over all three to confirm or deny a genuine depeg. Pick a demo scenario to see how it responds to a severe depeg versus a harmless wick.",
  },
  {
    n: "07",
    title: "Settle and get paid",
    body:
      "If the judge confirms a depeg, open the verdict and click SETTLE CLAIM. The pool reads the verdict straight from the judge on-chain and pays your policy, scaled by severity. No owner approval, no middleman.",
  },
];

export default function Guide() {
  return (
    <div style={{ maxWidth: 760 }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, marginBottom: 12 }}>USER GUIDE</h1>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", marginBottom: 40, lineHeight: 1.6, maxWidth: 620 }}>
        Holdline is parametric depeg insurance judged by AI. Here is the whole loop, from first connect to payout, in seven steps. Everything below uses test genUSDC on the GenLayer Studio network.
      </p>
      <div style={{ borderTop: "1px solid var(--gridline)" }}>
        {STEPS.map((s) => (
          <div key={s.n} style={{ display: "flex", gap: 20, padding: "22px 0", borderBottom: "1px solid var(--gridline)" }}>
            <div style={{ flex: "0 0 40px", fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--accent)", fontWeight: 500, paddingTop: 2 }}>{s.n}</div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 600, marginBottom: 6 }}>{s.title}</div>
              <div style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-muted)", lineHeight: 1.65 }}>{s.body}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)", marginTop: 28, lineHeight: 1.7 }}>
        DEMO NOTE: the price and news feed is a deterministic test harness, so the Stable, Mild, Severe, and Flash Wick scenarios let you trigger any judge outcome on demand. Amounts are whole genUSDC. Two markets are live, USDC and USDT.
      </div>
    </div>
  );
}