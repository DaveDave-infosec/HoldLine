# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *


class HoldlinePool(gl.Contract):
    owner: str
    fee_wallet: str

    balances: TreeMap[str, u256]

    supported_assets: DynArray[str]
    protocol_fee_bps: TreeMap[str, u256]
    premium_rate_bps: TreeMap[str, u256]
    max_utilization_bps: TreeMap[str, u256]
    total_deposits: TreeMap[str, u256]
    total_active_coverage: TreeMap[str, u256]

    provider_deposit: TreeMap[str, u256]
    provider_earned: TreeMap[str, u256]
    # Flat provider registry. One append-only list of "asset:address" keys,
    # plus a seen-guard so each provider is registered once per asset.
    provider_keys: DynArray[str]
    provider_seen: TreeMap[str, str]

    policy_ids: DynArray[str]
    policy_asset: TreeMap[str, str]
    policy_holder: TreeMap[str, str]
    policy_coverage: TreeMap[str, u256]
    policy_premium: TreeMap[str, u256]
    policy_active: TreeMap[str, str]
    policy_claimed: TreeMap[str, str]
    policy_counter: u256

    def __init__(self, owner_address: str, fee_wallet_address: str):
        self.owner = owner_address
        self.fee_wallet = fee_wallet_address
        self.policy_counter = u256(0)

    # ------------------------------------------------------------------ #
    # Admin / setup
    # ------------------------------------------------------------------ #

    @gl.public.write
    def add_asset(self, asset: str, protocol_fee_bps: int, premium_rate_bps: int, caller: str):
        if caller != self.owner:
            raise Exception("Only owner can add assets")
        a = asset.upper()
        if a not in self.total_deposits:
            self.supported_assets.append(a)
        self.protocol_fee_bps[a] = u256(protocol_fee_bps)
        self.premium_rate_bps[a] = u256(premium_rate_bps)
        self.max_utilization_bps[a] = u256(8000)
        self.total_deposits[a] = u256(0)
        self.total_active_coverage[a] = u256(0)

    @gl.public.write
    def mint(self, to_address: str, amount: int):
        cur = self.balances[to_address] if to_address in self.balances else u256(0)
        self.balances[to_address] = u256(int(cur) + amount)

    # ------------------------------------------------------------------ #
    # Provider / liquidity
    # ------------------------------------------------------------------ #

    @gl.public.write
    def deposit(self, asset: str, amount: int, caller: str):
        a = asset.upper()
        if a not in self.total_deposits:
            raise Exception("Unknown asset")
        bal = int(self.balances[caller]) if caller in self.balances else 0
        if bal < amount:
            raise Exception("Insufficient genUSDC balance")

        self.balances[caller] = u256(bal - amount)

        key = a + ":" + caller
        if key not in self.provider_deposit:
            self.provider_deposit[key] = u256(0)
            self.provider_earned[key] = u256(0)
            if key not in self.provider_seen:
                self.provider_seen[key] = "true"
                self.provider_keys.append(key)

        self.provider_deposit[key] = u256(int(self.provider_deposit[key]) + amount)
        self.total_deposits[a] = u256(int(self.total_deposits[a]) + amount)

    @gl.public.write
    def withdraw(self, asset: str, amount: int, caller: str):
        a = asset.upper()
        key = a + ":" + caller
        dep = int(self.provider_deposit[key]) if key in self.provider_deposit else 0
        earned = int(self.provider_earned[key]) if key in self.provider_earned else 0
        if dep + earned < amount:
            raise Exception("Insufficient position balance")

        if amount <= earned:
            self.provider_earned[key] = u256(earned - amount)
        else:
            remaining = amount - earned
            self.provider_earned[key] = u256(0)
            if int(self.total_deposits[a]) - remaining < int(self.total_active_coverage[a]):
                raise Exception("Withdrawal would breach active coverage")
            self.provider_deposit[key] = u256(dep - remaining)
            self.total_deposits[a] = u256(int(self.total_deposits[a]) - remaining)

        bal = int(self.balances[caller]) if caller in self.balances else 0
        self.balances[caller] = u256(bal + amount)

    # ------------------------------------------------------------------ #
    # Policy / coverage
    # ------------------------------------------------------------------ #

    @gl.public.write
    def purchase_policy(self, asset: str, coverage_amount: int, caller: str) -> str:
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

        self._distribute_premium(a, to_pool)

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

    def _distribute_premium(self, asset: str, amount: int):
        total = int(self.total_deposits[asset])
        if total == 0:
            return
        prefix = asset + ":"
        for key in self.provider_keys:
            if not key.startswith(prefix):
                continue
            share = (int(self.provider_deposit[key]) * amount) // total
            self.provider_earned[key] = u256(int(self.provider_earned[key]) + share)

    @gl.public.write
    def settle_claim(self, policy_id: str, depeg_confirmed: str, severity_pct: int, caller: str) -> str:
        if caller != self.owner:
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

    # ------------------------------------------------------------------ #
    # Views
    # ------------------------------------------------------------------ #

    @gl.public.view
    def balance_of(self, address: str) -> int:
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
            "max_utilization_bps": int(self.max_utilization_bps[a]),
            "protocol_fee_bps": int(self.protocol_fee_bps[a]),
            "premium_rate_bps": int(self.premium_rate_bps[a]),
            "policy_count": int(self.policy_counter),
        }

    @gl.public.view
    def get_provider_position(self, asset: str, address: str) -> dict:
        key = asset.upper() + ":" + address
        return {
            "deposit": int(self.provider_deposit[key]) if key in self.provider_deposit else 0,
            "earned": int(self.provider_earned[key]) if key in self.provider_earned else 0,
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
        out = []
        for i in range(len(self.policy_ids) - 1, -1, -1):
            pid = self.policy_ids[i]
            if self.policy_holder[pid] == address:
                out.append(self._build_policy(pid))
        return out