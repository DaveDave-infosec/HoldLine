# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
import json


HOLDLINE_PROMPT = """You are Holdline, a depeg verdict judge reasoning over live evidence.

ASSET: {asset}
CURRENT PRICE: {price}
PRICE SOURCES (multiple exchanges): {sources}
POOL LIQUIDITY RATIO: {pool_ratio}
BASELINE THRESHOLD SET BY POOL: {threshold}
RELEVANT NEWS CONTEXT: {news}

Your task is to judge whether this represents a GENUINE, SUSTAINED depeg
event or temporary noise. Weigh ALL of these signals together, never rely
on price alone:

1. PRICE: How far below the threshold, and is it consistent across multiple
   sources, or does one source disagree (suggesting manipulation or noise on
   a single venue)?

2. POOL IMBALANCE: Does the liquidity pool ratio show structural imbalance
   (e.g. 80/20 instead of roughly 50/50)? Real depegs show pool imbalance
   as holders flee. Balanced pools despite a price dip suggest a wick, not
   a real event.

3. NEWS CONTEXT: Is there a real-world cause reported (reserve issues,
   bank exposure, hack, regulatory action)? Real depegs have causes.
   Manipulated wicks usually do not.

4. SEVERITY: If a genuine depeg is confirmed, how severe is it as a
   percentage deviation from peg? A 3 percent deviation is mild. A 30
   percent or greater deviation is severe.

Be conservative. A momentary price dip with no pool imbalance and no news
cause should NOT be confirmed as a depeg, even if the price briefly
crossed the threshold. The threshold is a rough goalpost. Your job is the
nuanced judgment inside it.

Respond ONLY as valid JSON, no markdown, no preamble:
{{
  "depeg_confirmed": "true" or "false",
  "severity_pct": 0-100,
  "confidence_level": "High" or "Moderate" or "Low" or "Contested",
  "sustained_duration_assessment": "1 sentence on duration signal",
  "pool_imbalance_assessment": "1 sentence on what the pool ratio indicates",
  "news_context_assessment": "1 sentence on whether news supports a real cause",
  "reasoning_summary": "2-3 sentences explaining the overall verdict, written as a risk analyst would"
}}"""


class HoldlineJudge(gl.Contract):
    verdict_ids: DynArray[str]

    asset_symbol: TreeMap[str, str]
    price_endpoint_used: TreeMap[str, str]
    depeg_confirmed: TreeMap[str, str]
    severity_pct: TreeMap[str, u64]
    confidence_level: TreeMap[str, str]

    observed_price: TreeMap[str, str]
    sustained_duration_assessment: TreeMap[str, str]
    pool_imbalance_assessment: TreeMap[str, str]
    news_context_assessment: TreeMap[str, str]

    reasoning_summary: TreeMap[str, str]
    requester: TreeMap[str, str]
    requested_at: TreeMap[str, str]

    verdict_counter: u64

    def __init__(self):
        self.verdict_counter = 0

    @gl.public.write
    def judge_depeg(
        self,
        asset_symbol: str,
        price_endpoint_url: str,
        news_query_url: str,
        threshold_price: str,
        requester_address: str,
        requested_at: str,
    ) -> str:
        # Copy every input to a local before any non-det block.
        # self is not reachable inside the closures below.
        price_url_local = price_endpoint_url
        news_url_local = news_query_url
        asset_local = asset_symbol
        threshold_local = threshold_price

        # Step 1: price fetch, deterministic, strict_eq.
        # Volatile fields stripped INSIDE the closure before return,
        # so only stable fields ever enter consensus.
        def fetch_price_data() -> str:
            response = gl.nondet.web.get(price_url_local)
            data = json.loads(response.body.decode("utf-8"))
            stable_data = {
                "asset": data.get("asset"),
                "price": data.get("price"),
                "sources": data.get("sources"),
                "pool_ratio": data.get("pool_ratio"),
            }
            return json.dumps(stable_data, sort_keys=True)

        price_json_str = gl.eq_principle.strict_eq(fetch_price_data)
        price_data = json.loads(price_json_str)

        # Step 2: news fetch, deterministic, strict_eq, truncated to 6000.
        def fetch_news_data() -> str:
            news_content = gl.nondet.web.render(news_url_local, mode="text")
            return news_content[:6000]

        news_content = gl.eq_principle.strict_eq(fetch_news_data)

        # Step 3: copy fetched values to locals for the reasoning closure.
        price_local = str(price_data.get("price"))
        sources_local = json.dumps(price_data.get("sources"))
        pool_ratio_local = json.dumps(price_data.get("pool_ratio"))
        news_local = news_content

        # Step 4: LLM judgment, comparative consensus.
        def judge_fn() -> str:
            prompt = HOLDLINE_PROMPT.format(
                asset=asset_local,
                price=price_local,
                sources=sources_local,
                pool_ratio=pool_ratio_local,
                threshold=threshold_local,
                news=news_local,
            )
            result = gl.nondet.exec_prompt(prompt, response_format="json")
            if isinstance(result, str):
                parsed = json.loads(result)
            else:
                parsed = result
            return json.dumps(parsed, sort_keys=True)

        principle = (
            "The verdict must agree on depeg_confirmed (true or false) exactly. "
            "severity_pct may vary by up to 10 points and still be considered consistent. "
            "confidence_level should reflect genuine agreement on certainty."
        )

        judgment_str = gl.eq_principle.prompt_comparative(judge_fn, principle)
        judgment = json.loads(judgment_str)

        # Step 5: persist to flat parallel TreeMaps.
        verdict_id = "holdline_" + str(self.verdict_counter)

        confirmed_raw = str(judgment.get("depeg_confirmed", "false")).strip().lower()
        confirmed_clean = "true" if confirmed_raw == "true" else "false"

        severity_raw = judgment.get("severity_pct", 0)
        try:
            severity_int = int(severity_raw)
        except (TypeError, ValueError):
            severity_int = 0
        if severity_int < 0:
            severity_int = 0
        if severity_int > 100:
            severity_int = 100

        self.asset_symbol[verdict_id] = asset_symbol
        self.price_endpoint_used[verdict_id] = price_endpoint_url
        self.depeg_confirmed[verdict_id] = confirmed_clean
        self.severity_pct[verdict_id] = u64(severity_int)
        self.confidence_level[verdict_id] = str(judgment.get("confidence_level", "Low"))

        self.observed_price[verdict_id] = str(price_data.get("price"))
        self.sustained_duration_assessment[verdict_id] = str(judgment.get("sustained_duration_assessment", ""))
        self.pool_imbalance_assessment[verdict_id] = str(judgment.get("pool_imbalance_assessment", ""))
        self.news_context_assessment[verdict_id] = str(judgment.get("news_context_assessment", ""))

        self.reasoning_summary[verdict_id] = str(judgment.get("reasoning_summary", ""))
        self.requester[verdict_id] = requester_address
        self.requested_at[verdict_id] = requested_at

        self.verdict_ids.append(verdict_id)
        self.verdict_counter = self.verdict_counter + 1

        return verdict_id

    def _build_verdict(self, verdict_id: str) -> dict:
        return {
            "verdict_id": verdict_id,
            "asset_symbol": self.asset_symbol[verdict_id],
            "price_endpoint_used": self.price_endpoint_used[verdict_id],
            "depeg_confirmed": self.depeg_confirmed[verdict_id],
            "severity_pct": self.severity_pct[verdict_id],
            "confidence_level": self.confidence_level[verdict_id],
            "observed_price": self.observed_price[verdict_id],
            "sustained_duration_assessment": self.sustained_duration_assessment[verdict_id],
            "pool_imbalance_assessment": self.pool_imbalance_assessment[verdict_id],
            "news_context_assessment": self.news_context_assessment[verdict_id],
            "reasoning_summary": self.reasoning_summary[verdict_id],
            "requester": self.requester[verdict_id],
            "requested_at": self.requested_at[verdict_id],
        }

    @gl.public.view
    def get_verdict(self, verdict_id: str) -> dict:
        if verdict_id not in self.asset_symbol:
            return {}
        return self._build_verdict(verdict_id)

    @gl.public.view
    def get_all_verdicts(self) -> list:
        out = []
        for i in range(len(self.verdict_ids) - 1, -1, -1):
            out.append(self._build_verdict(self.verdict_ids[i]))
        return out

    @gl.public.view
    def get_verdicts_by_requester(self, addr: str) -> list:
        out = []
        for i in range(len(self.verdict_ids) - 1, -1, -1):
            vid = self.verdict_ids[i]
            if self.requester[vid] == addr:
                out.append(self._build_verdict(vid))
        return out

    @gl.public.view
    def get_verdict_count(self) -> u64:
        return u64(len(self.verdict_ids))