# Holdline

Parametric stablecoin depeg insurance on GenLayer Studio Network.

The peg holds, or it doesn't. Holdline knows which.

## What it is

Holdline insures against stablecoin depegs. Insured users pay premiums
scaled to their coverage. Liquidity providers deposit GenUSDC and earn those
premiums as yield, taking on payout risk. When a claim is filed, a GenLayer
Intelligent Contract reads live price across multiple exchanges, on-chain
pool liquidity ratios, and news context, then reasons over all of it to
confirm or deny a genuine depeg and quantify severity. The pool contract
pays out coverage scaled by that severity.

A fixed price trigger is gameable by a momentary wick. A human DAO vote is
slow and political. Holdline's judge reads price, liquidity, and news
together, the kind of multi-signal reasoning no oracle network or rigid
contract can perform trustlessly.

## Architecture

Three contracts plus a mock price feed.

- contracts/holdline_judge.py: the GenLayer Intelligent Contract. Fetches
  price and news deterministically (strict_eq), then reasons over combined
  evidence via comparative consensus (prompt_comparative). Stores verdicts
  in flat parallel TreeMaps.
- contracts/evm/GenUSDC.sol: mock ERC20 settlement token, open mint, testnet
  only.
- contracts/evm/HoldlinePool.sol: one pool per asset. Holds deposits,
  collects premiums, pays severity-scaled claims.
- mock-price-server/: standalone Express feed with deterministic demo
  scenarios via query param, plus a live admin control surface.
- frontend/: React + TypeScript + Vite. The Risk Desk UI.

Network: GenLayer Studio Network, Chain ID 61999 (0xF21F).

## V1 trust model, stated honestly

The pool owner relays the GenLayer verdict into settleClaim manually. There
is no automatic GenLayer-to-EVM bridge in V1. The UI shows the verdict and
the owner-triggered settlement against the same case id so it stays
auditable. A trustless oracle bridge is V2 scope.

Provider accounting in V1 socializes payout risk at the pool level. Each
provider's recorded deposit is not yet proportionally debited on payout.
Correct share-based accounting is V2 scope. Both limitations are surfaced on
the How It Works page in the app.

## Local development

Frontend:

    cd frontend
    npm install
    npm run dev

Mock price server:

    cd mock-price-server
    npm install
    # set ADMIN_KEY in the environment
    npm start

Contracts (compile check):

    cd contracts
    npm install
    npx hardhat compile

## Environment variables (frontend)

Set these on the host at deploy time.

- VITE_JUDGE_CONTRACT_ADDRESS
- VITE_GENUSDC_ADDRESS
- VITE_POOL_USDC_ADDRESS
- VITE_POOL_USDT_ADDRESS
- VITE_PRICE_SERVER_BASE
- VITE_NEWS_QUERY_URL (optional, has a default)
- VITE_OWNER_ADDRESS
- VITE_ADMIN_KEY (matches the mock server ADMIN_KEY)

## Deploy order

1. Deploy the mock price server, note its base URL, set ADMIN_KEY.
2. Deploy holdline_judge.py to GenLayer Studio, copy the address.
3. Smoke test the judge, confirm get_verdict_count returns 1.
4. Deploy GenUSDC.sol, then HoldlinePool.sol once per asset.
5. Mint test GenUSDC to test wallets.
6. Push to GitHub, deploy frontend to Vercel with root directory frontend
   and all env vars set.

## Demo scenarios

The mock server serves deterministic scenarios by query param, cold-start
safe: stable, mild (0.97), severe (0.85), wick (0.92). The severe scenario
should confirm a depeg. The wick scenario, one venue dipping while others
hold and the pool stays balanced, should be denied. That denial is the
proof the judge reasons rather than threshold-checks.