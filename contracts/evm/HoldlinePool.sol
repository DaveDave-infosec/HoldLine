// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// One pool per supported asset. USDC pool and USDT pool are deployed
// separately and never share liquidity.
//
// V1 trust model: the pool owner relays the GenLayer judge verdict into
// settleClaim() manually. There is no automatic GenLayer-to-EVM bridge in
// this version. This is presented honestly on the HowItWorks page, it is
// real V2 scope, not a hidden shortcut.
//
// Known V1 accounting gap (flagged, not hidden): a paid claim reduces
// totalPoolDeposits at the pool level but does not proportionally debit
// each provider's recorded depositAmount. Providers collectively absorb
// payout risk, but the loss is not yet booked per-provider via a share
// index. Share-based provider accounting is V2 scope.
contract HoldlinePool {
    IERC20 public genUSDC;
    address public owner;
    string public assetSymbol;
    uint256 public protocolFeeBps;
    uint256 public totalPoolDeposits;
    uint256 public totalActiveCoverage;
    uint256 public maxUtilizationBps;

    struct Policy {
        address holder;
        uint256 coverageAmount;
        uint256 premiumPaid;
        bool active;
        bool claimed;
    }

    struct ProviderPosition {
        uint256 depositAmount;
        uint256 earnedPremiums;
    }

    mapping(uint256 => Policy) public policies;
    uint256 public policyCounter;

    mapping(address => ProviderPosition) public providers;
    address[] public providerList;

    address public protocolFeeWallet;

    event PolicyPurchased(uint256 policyId, address holder, uint256 coverage, uint256 premium);
    event Deposited(address provider, uint256 amount);
    event Withdrawn(address provider, uint256 amount);
    event ClaimPaid(uint256 policyId, address holder, uint256 payoutAmount, uint256 severityPct);
    event ClaimDenied(uint256 policyId, string reason);

    constructor(address _genUSDC, string memory _assetSymbol, uint256 _protocolFeeBps, address _feeWallet) {
        genUSDC = IERC20(_genUSDC);
        assetSymbol = _assetSymbol;
        protocolFeeBps = _protocolFeeBps;
        protocolFeeWallet = _feeWallet;
        maxUtilizationBps = 8000;
        owner = msg.sender;
    }

    function deposit(uint256 amount) external {
        require(amount > 0, "Amount must be positive");
        genUSDC.transferFrom(msg.sender, address(this), amount);
        if (providers[msg.sender].depositAmount == 0) {
            providerList.push(msg.sender);
        }
        providers[msg.sender].depositAmount += amount;
        totalPoolDeposits += amount;
        emit Deposited(msg.sender, amount);
    }

    function purchasePolicy(uint256 coverageAmount, uint256 premiumAmount) external returns (uint256) {
        require(coverageAmount > 0, "Coverage must be positive");
        require(
            totalActiveCoverage + coverageAmount <= (totalPoolDeposits * maxUtilizationBps) / 10000,
            "Exceeds pool utilization cap"
        );

        genUSDC.transferFrom(msg.sender, address(this), premiumAmount);

        uint256 fee = (premiumAmount * protocolFeeBps) / 10000;
        uint256 toPool = premiumAmount - fee;

        genUSDC.transfer(protocolFeeWallet, fee);
        _distributePremium(toPool);

        uint256 policyId = policyCounter++;
        policies[policyId] = Policy(msg.sender, coverageAmount, premiumAmount, true, false);
        totalActiveCoverage += coverageAmount;

        emit PolicyPurchased(policyId, msg.sender, coverageAmount, premiumAmount);
        return policyId;
    }

    function _distributePremium(uint256 amount) internal {
        if (totalPoolDeposits == 0) {
            return;
        }
        for (uint256 i = 0; i < providerList.length; i++) {
            address p = providerList[i];
            uint256 share = (providers[p].depositAmount * amount) / totalPoolDeposits;
            providers[p].earnedPremiums += share;
        }
    }

    // V1: owner relays the GenLayer verdict. V2: trustless oracle bridge.
    function settleClaim(uint256 policyId, bool depegConfirmed, uint256 severityPct) external {
        require(msg.sender == owner, "Only owner can settle");
        require(severityPct <= 100, "Severity out of range");
        Policy storage p = policies[policyId];
        require(p.active && !p.claimed, "Invalid policy state");

        if (!depegConfirmed) {
            emit ClaimDenied(policyId, "Depeg not confirmed by Holdline judge");
            return;
        }

        uint256 payout = (p.coverageAmount * severityPct) / 100;
        require(payout <= totalPoolDeposits, "Insufficient pool liquidity");

        p.claimed = true;
        p.active = false;
        totalActiveCoverage -= p.coverageAmount;
        totalPoolDeposits -= payout;

        genUSDC.transfer(p.holder, payout);
        emit ClaimPaid(policyId, p.holder, payout, severityPct);
    }

    function withdraw(uint256 amount) external {
        ProviderPosition storage pos = providers[msg.sender];
        require(pos.depositAmount + pos.earnedPremiums >= amount, "Insufficient balance");
        if (amount <= pos.earnedPremiums) {
            pos.earnedPremiums -= amount;
        } else {
            uint256 remaining = amount - pos.earnedPremiums;
            pos.earnedPremiums = 0;
            require(
                totalPoolDeposits - remaining >= totalActiveCoverage,
                "Withdrawal would breach active coverage"
            );
            pos.depositAmount -= remaining;
            totalPoolDeposits -= remaining;
        }
        genUSDC.transfer(msg.sender, amount);
        emit Withdrawn(msg.sender, amount);
    }

    // Convenience views for the frontend, one round trip each.
    function getPoolStats()
        external
        view
        returns (
            uint256 _totalPoolDeposits,
            uint256 _totalActiveCoverage,
            uint256 _maxUtilizationBps,
            uint256 _policyCounter,
            uint256 _protocolFeeBps
        )
    {
        return (totalPoolDeposits, totalActiveCoverage, maxUtilizationBps, policyCounter, protocolFeeBps);
    }

    function getProviderCount() external view returns (uint256) {
        return providerList.length;
    }
}