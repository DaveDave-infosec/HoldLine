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
        Reads live price across multiple exchanges, on-chain pool liquidity ratios, and news context. It weighs all
        signals together to confirm or deny a genuine depeg, and quantifies severity if one is confirmed. A momentary
        price dip with no pool imbalance and no reported cause is treated as noise, not a depeg.
      </Section>

      <Section title="The Threshold (set by the pool, not the AI)">
        Each pool defines a baseline goalpost, for example below $0.97. This gives policyholders and providers shared
        expectations. The judge's job is the nuanced reasoning inside that boundary, not setting the boundary itself.
      </Section>

      <Section title="The Pool (Solidity contract)">
        Holds GenUSDC deposits, collects premiums, and pays severity-scaled claims. In V1 the pool owner relays the
        judge's verdict into the settlement function manually. There is no automatic bridge between the GenLayer
        Intelligent Contract and the EVM pool contract in this version. A fully trustless oracle bridge is V2 scope,
        not yet built, and the interface shows the verdict and the owner-triggered settlement against that same case
        id so the relationship stays auditable.
      </Section>

      <Section title="Known V1 limitation: provider accounting">
        When a claim pays out, the pool balance drops, but each provider's individually recorded deposit is not yet
        proportionally debited. Providers collectively absorb payout risk by design in this version. Correct
        share-based accounting, where every payout debits each provider proportionally, is V2 scope. We flag this
        openly rather than hide it.
      </Section>

      <Section title="Why this needs GenLayer">
        A fixed price trigger is gameable by a momentary wick. A human DAO vote is slow and political. Holdline's
        judge reads price, liquidity, and news together, the kind of multi-signal reasoning no oracle network or
        rigid contract can perform trustlessly.
      </Section>
    </div>
  );
}