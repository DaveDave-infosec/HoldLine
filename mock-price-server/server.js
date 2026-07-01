const express = require("express");
const app = express();
app.use(express.json());

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type, x-admin-key");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

function freshAsset(asset) {
  return {
    asset,
    price: 1.0,
    sources: [
      { exchange: "Coinbase", price: 1.0 },
      { exchange: "Binance", price: 1.0 },
      { exchange: "Kraken", price: 1.0 },
    ],
    pool_ratio: { primary: 50, pair: 50 },
    last_updated: new Date().toISOString(),
  };
}

function scenarioAsset(asset, scenario) {
  const now = new Date().toISOString();

  if (scenario === "mild") {
    return {
      asset,
      price: 0.97,
      sources: [
        { exchange: "Coinbase", price: 0.971 },
        { exchange: "Binance", price: 0.969 },
        { exchange: "Kraken", price: 0.970 },
      ],
      pool_ratio: { primary: 56, pair: 44 },
      last_updated: now,
    };
  }

  if (scenario === "severe") {
    return {
      asset,
      price: 0.85,
      sources: [
        { exchange: "Coinbase", price: 0.851 },
        { exchange: "Binance", price: 0.849 },
        { exchange: "Kraken", price: 0.850 },
      ],
      pool_ratio: { primary: 78, pair: 22 },
      last_updated: now,
    };
  }

  if (scenario === "wick") {
    return {
      asset,
      price: 0.92,
      sources: [
        { exchange: "Coinbase", price: 1.0 },
        { exchange: "Binance", price: 0.92 },
        { exchange: "Kraken", price: 0.999 },
      ],
      pool_ratio: { primary: 51, pair: 49 },
      last_updated: now,
    };
  }

  return freshAsset(asset);
}

// Deterministic news context per scenario. Returns stable plain text so the
// GenLayer strict_eq consensus on news content passes across validator calls.
function scenarioNews(asset, scenario) {
  if (scenario === "severe") {
    return (
      "BREAKING: " + asset + " under sustained pressure as reserve concerns mount. " +
      "Multiple desks report large redemptions through the session after questions " +
      "surfaced over the backing attestation for " + asset + ". On-chain data shows " +
      "holders rotating out of the asset across major venues. Analysts describe the " +
      "move as a credible, cause-driven depeg rather than transient market noise. " +
      "Liquidity pools have skewed heavily as providers step back."
    );
  }
  if (scenario === "mild") {
    return (
      "Market note: " + asset + " slipped modestly below peg during low-liquidity " +
      "hours before partially recovering. No reserve or counterparty concerns have " +
      "been reported. Desks characterize the move as routine intraday volatility " +
      "with no identifiable structural cause."
    );
  }
  if (scenario === "wick") {
    return (
      "Market note: a brief price dislocation in " + asset + " was observed on a " +
      "single venue and did not propagate to other exchanges. No news, reserve, or " +
      "counterparty events have been reported. Liquidity remained balanced and the " +
      "quote normalized quickly, consistent with a localized wick rather than a " +
      "fundamental event."
    );
  }
  return (
    asset + " is trading at peg with no notable news. Reserves, redemptions, and " +
    "liquidity are all reported as normal across monitored venues."
  );
}

let priceData = {
  USDC: freshAsset("USDC"),
  USDT: freshAsset("USDT"),
};

app.get("/", (req, res) => {
  res.json({
    service: "holdline-mock-price-server",
    assets: Object.keys(priceData),
    scenarios: ["stable", "mild", "severe", "wick"],
  });
});

app.get("/price/:asset", (req, res) => {
  const asset = req.params.asset.toUpperCase();
  const scenario = req.query.scenario;

  if (scenario) {
    return res.json(scenarioAsset(asset, String(scenario).toLowerCase()));
  }

  if (!priceData[asset]) {
    return res.status(404).json({ error: "Asset not found" });
  }
  priceData[asset].last_updated = new Date().toISOString();
  res.json(priceData[asset]);
});

// News context endpoint. Scenario-driven and deterministic, cold-start safe.
app.get("/news/:asset", (req, res) => {
  const asset = req.params.asset.toUpperCase();
  const scenario = String(req.query.scenario || "stable").toLowerCase();
  res.type("text/plain").send(scenarioNews(asset, scenario));
});

app.post("/admin/update/:asset", (req, res) => {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const asset = req.params.asset.toUpperCase();
  if (!priceData[asset]) {
    priceData[asset] = freshAsset(asset);
  }
  priceData[asset] = {
    ...priceData[asset],
    ...req.body,
    asset,
    last_updated: new Date().toISOString(),
  };
  res.json({ success: true, data: priceData[asset] });
});

app.post("/admin/reset/:asset", (req, res) => {
  if (req.headers["x-admin-key"] !== process.env.ADMIN_KEY) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const asset = req.params.asset.toUpperCase();
  priceData[asset] = freshAsset(asset);
  res.json({ success: true, data: priceData[asset] });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log("holdline mock price server listening on " + PORT);
});

module.exports = app;
