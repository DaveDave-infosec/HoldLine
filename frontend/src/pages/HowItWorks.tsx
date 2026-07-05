// frontend/src/pages/HowItWorks.tsx
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 40 }}>
      <h2 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--text-primary)" }}>
        {title}
      </h2>
      <div style={{ fontFamily: "var(--font-body)", fontSize: 15, lineHeight: 1.7, color: "var(--text-muted)", maxWidth: 680 }}>
        {children}
      </div>
    </div>
  );
}
export default function HowItWorks() {
  return (
    <div>
      <h1 style={{ fontFamily: "var(--font-display)", fontSize: 36, fontWeight: 600, marginBottom: 40 }}>HOW HOLDLINE WORKS</h1>
      <Section title="The Judge (GenLayer Intelligent Contract)">
        Reads price across multiple exchanges, on-chain pool liquidity ratios, and news context. It weighs all
        signals together to confirm or deny a genuine depeg, and quantifies severity if one is confirmed. A momentary
        price dip with no pool imbalance and no reported cause is treated as noise, not a depeg.
      </Section>
      <Section title="The Threshold (set by the pool, not the AI)">
        Each pool defines a baseline goalpost, for example below $0.97. This gives policyholders and providers shared
        expectations. The judge's job is the nuanced reasoning inside that boundary, not setting the boundary itself.
      </Section>
      <Section title="The Pool (GenLayer Intelligent Contract)">
        Holds genUSDC deposits, collects premiums, and pays severity-scaled claims. Both the pool and the judge are
        Python Intelligent Contracts on GenLayer. When a claim is confirmed, the pool reads the verdict directly from
        the judge through an on-chain contract-to-contract call and settles from it. Anyone can trigger settlement,
        but funds only ever move to the policy holder, and every figure comes from the judge, not the caller. There
        is no owner in the settlement path and no manual relay.
      </Section>
      <Section title="Provider accounting (share-based vault)">
        Liquidity providers hold shares in each pool, priced as pool assets divided by total shares. Deposits mint
        shares at the live price, premiums lift the price, and every payout lowers it, so each provider gains and
        loses in exact proportion to their stake, in real time. Withdrawals redeem shares at the current price. Your
        position shows what you put in, what it is worth now, and your running profit or loss.
      </Section>
      <Section title="Why this needs GenLayer">
        A fixed price trigger is gameable by a momentary wick. A human DAO vote is slow and political. Holdline's
        judge reads price, liquidity, and news together, the kind of multi-signal reasoning no oracle network or
        rigid contract can perform trustlessly. The pool then settles from that reasoning on-chain, with no
        intermediary.
      </Section>
      <Section title="About this demo">
        Everything runs on the GenLayer Studio test network with test genUSDC from the in-app faucet. The price and
        news feed is a deterministic harness, so the scenario buttons reproduce a severe depeg, a harmless wick, and
        so on, on demand. A production build points the same judge logic at live cross-exchange oracles and licensed
        news feeds, only the fetched URLs change. Share math is whole-integer for clarity rather than
        higher-precision production accounting.
      </Section>
    </div>
  );
}