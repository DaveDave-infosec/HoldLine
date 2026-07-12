# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *


class HoldlinePool(gl.Contract):
    owner: str
    fee_wallet: str
    judge_address: str
    balances: TreeMap[str, u256]
    supported_assets: DynArray[str]
    protocol_fee_bps: TreeMap[str, u256]
    premium_rate_bps: TreeMap[str, u256]
    max_utilization_bps: TreeMap[str, u256]
    total_deposits: TreeMap[str, u256]
    total_active_coverage: TreeMap[str, u256]
    # Vault accounting. Assets for an asset live in total_deposits; ownership
    # is tracked as shares. Share price = total_deposits / total_shares.
    total_shares: TreeMap[str, u256]
    provider_shares: TreeMap[str, u256]
    provider_principal: TreeMap[str, u256]
    policy_ids: DynArray[str]
    policy_asset: TreeMap[str, str]
    policy_holder: TreeMap[str, str]
    policy_coverage: TreeMap[str, u256]
    policy_premium: TreeMap[str, u256]
    policy_active: TreeMap[str, str]
    policy_claimed: TreeMap[str, str]
    policy_counter: u256
    verdict_consumed: TreeMap[str, str]

    def __init__(self, owner_address: str, fee_wallet_address: str):
        self.owner = owner_address
        self.fee_wallet = fee_wallet_address
        self.judge_address = ""
        self.policy_counter = u256(0)

    # ------------------------------------------------------------------ #
    # Admin / setup
    # ------------------------------------------------------------------ #
    @gl.public.write
    def set_judge_address(self, judge_address: str, caller: str):
        if caller.lower() != self.owner.lower():
            raise Exception("Only owner can set judge")
        self.judge_address = judge_address

    @gl.public.write
    def add_asset(self, asset: str, protocol_fee_bps: int, premium_rate_bps: int, caller: str):
        if caller.lower() != self.owner.lower():
            raise Exception("Only owner can add assets")
        a = asset.upper()
        if a not in self.total_deposits:
            self.supported_assets.append(a)
        self.protocol_fee_bps[a] = u256(protocol_fee_bps)
        self.premium_rate_bps[a] = u256(premium_rate_bps)
        self.max_utilization_bps[a] = u256(8000)
        self.total_deposits[a] = u256(0)
        self.total_active_coverage[a] = u256(0)
        self.total_shares[a] = u256(0)

    @gl.public.write
    def mint(self, to_address: str, amount: int):
        to_address = to_address.lower()
        cur = self.balances[to_address] if to_address in self.balances else u256(0)
        self.balances[to_address] = u256(int(cur) + amount)

    # ------------------------------------------------------------------ #
    # Provider / liquidity (share based)
    # ------------------------------------------------------------------ #
    @gl.public.write
    def deposit(self, asset: str, amount: int, caller: str):
        caller = caller.lower()
        a = asset.upper()
        if a not in self.total_deposits:
            raise Exception("Unknown asset")
        if amount <= 0:
            raise Exception("Amount must be positive")
        bal = int(self.balances[caller]) if caller in self.balances else 0
        if bal < amount:
            raise Exception("Insufficient genUSDC balance")
        self.balances[caller] = u256(bal - amount)
        ta = int(self.total_deposits[a])
        ts = int(self.total_shares[a]) if a in self.total_shares else 0
        if ts == 0 or ta == 0:
            minted = amount
        else:
            minted = (amount * ts) // ta
        if minted <= 0:
            raise Exception("Deposit too small to mint shares")
        key = a + ":" + caller
        cur_sh = int(self.provider_shares[key]) if key in self.provider_shares else 0
        cur_pr = int(self.provider_principal[key]) if key in self.provider_principal else 0
        self.provider_shares[key] = u256(cur_sh + minted)
        self.provider_principal[key] = u256(cur_pr + amount)
        self.total_shares[a] = u256(ts + minted)
        self.total_deposits[a] = u256(ta + amount)

    @gl.public.write
    def withdraw(self, asset: str, amount: int, caller: str):
        caller = caller.lower()
        a = asset.upper()
        if amount <= 0:
            raise Exception("Amount must be positive")
        key = a + ":" + caller
        ps = int(self.provider_shares[key]) if key in self.provider_shares else 0
        if ps == 0:
            raise Exception("No liquidity position")
        ta = int(self.total_deposits[a])
        ts = int(self.total_shares[a]) if a in self.total_shares else 0
        if ts == 0:
            raise Exception("No shares outstanding")
        value = (ps * ta) // ts
        if amount > value:
            raise Exception("Insufficient position value")
        if ta - amount < int(self.total_active_coverage[a]):
            raise Exception("Withdrawal would breach active coverage")
        if amount == value:
            shares_to_burn = ps
        else:
            shares_to_burn = (amount * ts) // ta
            if shares_to_burn <= 0:
                shares_to_burn = 1
            if shares_to_burn > ps:
                shares_to_burn = ps
        pr = int(self.provider_principal[key]) if key in self.provider_principal else 0
        principal_out = (pr * shares_to_burn) // ps
        self.provider_shares[key] = u256(ps - shares_to_burn)
        self.provider_principal[key] = u256(pr - principal_out)
        self.total_shares[a] = u256(ts - shares_to_burn)
        self.total_deposits[a] = u256(ta - amount)
        bal = int(self.balances[caller]) if caller in self.balances else 0
        self.balances[caller] = u256(bal + amount)

    # ------------------------------------------------------------------ #
    # Policy / coverage
    # ------------------------------------------------------------------ #
    @gl.public.write
    def purchase_policy(self, asset: str, coverage_amount: int, caller: str) -> str:
        caller = caller.lower()
        a = asset.upper()
        if a not in self.total_deposits:
            raise Exception("Unknown asset")
        premium = (coverage_amount * int(self.premium_rate_bps[a])) // 10000
        cap = (int(self.total_deposits[a]) * int(self.max_utilization_bps[a])) // 10000
        if int(self.total_active_coverage[a]) + coverage_amount > cap:
            raise Exception("Exceeds pool utilization cap")
        bal = int(self.balances[caller]) if caller in self.balances else 0
        if bal < premium:
            raise Exception("Insufficient genUSDC for premium")
        self.balances[caller] = u256(bal - premium)
        fee = (premium * int(self.protocol_fee_bps[a])) // 10000
        to_pool = premium - fee
        fbal = int(self.balances[self.fee_wallet]) if self.fee_wallet in self.balances else 0
        self.balances[self.fee_wallet] = u256(fbal + fee)
        # Premium accrues to pool assets, lifting the share price for every LP.
        self.total_deposits[a] = u256(int(self.total_deposits[a]) + to_pool)
        pid = str(int(self.policy_counter))
        self.policy_ids.append(pid)
        self.policy_asset[pid] = a
        self.policy_holder[pid] = caller
        self.policy_coverage[pid] = u256(coverage_amount)
        self.policy_premium[pid] = u256(premium)
        self.policy_active[pid] = "true"
        self.policy_claimed[pid] = "false"
        self.policy_counter = u256(int(self.policy_counter) + 1)
        self.total_active_coverage[a] = u256(int(self.total_active_coverage[a]) + coverage_amount)
        return pid

    @gl.public.write
    def settle_claim(self, policy_id: str, depeg_confirmed: str, severity_pct: int, caller: str) -> str:
        caller = caller.lower()
        if caller != self.owner.lower():
            raise Exception("Only owner can settle")
        if policy_id not in self.policy_active:
            raise Exception("Unknown policy")
        if self.policy_active[policy_id] != "true" or self.policy_claimed[policy_id] != "false":
            raise Exception("Invalid policy state")
        a = self.policy_asset[policy_id]
        coverage = int(self.policy_coverage[policy_id])
        if str(depeg_confirmed).lower() != "true":
            self.policy_active[policy_id] = "false"
            self.total_active_coverage[a] = u256(int(self.total_active_coverage[a]) - coverage)
            return "denied"
        sev = severity_pct
        if sev < 0:
            sev = 0
        if sev > 100:
            sev = 100
        payout = (coverage * sev) // 100
        if payout > int(self.total_deposits[a]):
            raise Exception("Insufficient pool liquidity")
        self.policy_claimed[policy_id] = "true"
        self.policy_active[policy_id] = "false"
        self.total_active_coverage[a] = u256(int(self.total_active_coverage[a]) - coverage)
        self.total_deposits[a] = u256(int(self.total_deposits[a]) - payout)
        holder = self.policy_holder[policy_id]
        hbal = int(self.balances[holder]) if holder in self.balances else 0
        self.balances[holder] = u256(hbal + payout)
        return "paid:" + str(payout)

    @gl.public.write
    def settle_from_verdict(self, verdict_id: str) -> str:
        if self.judge_address == "":
            raise Exception("Judge not configured")
        if verdict_id in self.verdict_consumed and self.verdict_consumed[verdict_id] == "true":
            raise Exception("Verdict already settled")
        judge = gl.get_contract_at(Address(self.judge_address))
        v = judge.view().get_verdict(verdict_id)
        if not v or "policy_id" not in v:
            raise Exception("Verdict not found")
        policy_id = str(v["policy_id"])
        if policy_id == "":
            raise Exception("Verdict has no bound policy")
        if policy_id not in self.policy_active:
            raise Exception("Unknown policy")
        if self.policy_active[policy_id] != "true" or self.policy_claimed[policy_id] != "false":
            raise Exception("Invalid policy state")
        v_requester = str(v["requester"]).lower()
        v_asset = str(v["asset_symbol"]).upper()
        if self.policy_holder[policy_id].lower() != v_requester:
            raise Exception("Verdict requester does not hold this policy")
        if self.policy_asset[policy_id].upper() != v_asset:
            raise Exception("Asset mismatch")
        self.verdict_consumed[verdict_id] = "true"
        a = self.policy_asset[policy_id]
        coverage = int(self.policy_coverage[policy_id])
        confirmed = str(v["depeg_confirmed"]).lower() == "true"
        if not confirmed:
            self.policy_active[policy_id] = "false"
            self.total_active_coverage[a] = u256(int(self.total_active_coverage[a]) - coverage)
            return "denied"
        sev = int(v["severity_pct"])
        if sev < 0:
            sev = 0
        if sev > 100:
            sev = 100
        payout = (coverage * sev) // 100
        if payout > int(self.total_deposits[a]):
            raise Exception("Insufficient pool liquidity")
        self.policy_claimed[policy_id] = "true"
        self.policy_active[policy_id] = "false"
        self.total_active_coverage[a] = u256(int(self.total_active_coverage[a]) - coverage)
        self.total_deposits[a] = u256(int(self.total_deposits[a]) - payout)
        holder = self.policy_holder[policy_id]
        hbal = int(self.balances[holder]) if holder in self.balances else 0
        self.balances[holder] = u256(hbal + payout)
        return "paid:" + str(payout)

    # ------------------------------------------------------------------ #
    # Views
    # ------------------------------------------------------------------ #
    @gl.public.view
    def get_judge_address(self) -> str:
        return self.judge_address

    @gl.public.view
    def is_verdict_consumed(self, verdict_id: str) -> str:
        return self.verdict_consumed[verdict_id] if verdict_id in self.verdict_consumed else "false"

    @gl.public.view
    def balance_of(self, address: str) -> int:
        address = address.lower()
        return int(self.balances[address]) if address in self.balances else 0

    @gl.public.view
    def get_pool_stats(self, asset: str) -> dict:
        a = asset.upper()
        if a not in self.total_deposits:
            return {}
        return {
            "asset": a,
            "total_deposits": int(self.total_deposits[a]),
            "total_active_coverage": int(self.total_active_coverage[a]),
            "total_shares": int(self.total_shares[a]) if a in self.total_shares else 0,
            "max_utilization_bps": int(self.max_utilization_bps[a]),
            "protocol_fee_bps": int(self.protocol_fee_bps[a]),
            "premium_rate_bps": int(self.premium_rate_bps[a]),
            "policy_count": int(self.policy_counter),
        }

    @gl.public.view
    def get_provider_position(self, asset: str, address: str) -> dict:
        a = asset.upper()
        key = a + ":" + address.lower()
        ps = int(self.provider_shares[key]) if key in self.provider_shares else 0
        pr = int(self.provider_principal[key]) if key in self.provider_principal else 0
        ta = int(self.total_deposits[a]) if a in self.total_deposits else 0
        ts = int(self.total_shares[a]) if a in self.total_shares else 0
        value = (ps * ta) // ts if ts > 0 else 0
        return {
            "shares": ps,
            "principal": pr,
            "value": value,
            "deposit": pr,
            "earned": (value - pr) if value > pr else 0,
        }

    def _build_policy(self, pid: str) -> dict:
        return {
            "policy_id": pid,
            "asset": self.policy_asset[pid],
            "holder": self.policy_holder[pid],
            "coverage": int(self.policy_coverage[pid]),
            "premium": int(self.policy_premium[pid]),
            "active": self.policy_active[pid],
            "claimed": self.policy_claimed[pid],
        }

    @gl.public.view
    def get_policy(self, policy_id: str) -> dict:
        if policy_id not in self.policy_asset:
            return {}
        return self._build_policy(policy_id)

    @gl.public.view
    def get_all_policies(self) -> list:
        out = []
        for i in range(len(self.policy_ids) - 1, -1, -1):
            out.append(self._build_policy(self.policy_ids[i]))
        return out

    @gl.public.view
    def get_policies_by_holder(self, address: str) -> list:
        address = address.lower()
        out = []
        for i in range(len(self.policy_ids) - 1, -1, -1):
            pid = self.policy_ids[i]
            if self.policy_holder[pid].lower() == address:
                out.append(self._build_policy(pid))
        return out