import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { JUDGE_CONTRACT_ADDRESS, POOL_CONTRACT_ADDRESS } from "./constants";

let _client: ReturnType<typeof createClient> | null = null;
let _connectedAddress: string | null = null;

export function initClient(accountAddress: string) {
  _connectedAddress = accountAddress;
  _client = createClient({
    chain: studionet,
    account: accountAddress as any,
  });
  return _client;
}

function readClient() {
  if (_client) return _client;
  return createClient({ chain: studionet });
}

function writeClient() {
  if (!_client || !_connectedAddress) {
    throw new Error("Wallet not connected. Call initClient(address) first.");
  }
  return _client;
}

export function getConnectedAddress(): string | null {
  return _connectedAddress;
}

// ---------------------------------------------------------------- //
// Judge contract
// ---------------------------------------------------------------- //

export async function judgeDepeg(
  assetSymbol: string,
  priceEndpointUrl: string,
  newsQueryUrl: string,
  thresholdPrice: string,
  requesterAddress: string,
  requestedAt: string,
) {
  return await writeClient().writeContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "judge_depeg",
    args: [assetSymbol, priceEndpointUrl, newsQueryUrl, thresholdPrice, requesterAddress, requestedAt],
    value: 0n,
  });
}

export async function getVerdict(verdictId: string) {
  return await readClient().readContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "get_verdict",
    args: [verdictId],
  });
}

export async function getVerdictCount() {
  return await readClient().readContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "get_verdict_count",
    args: [],
  });
}

// ---------------------------------------------------------------- //
// Pool contract (money layer)
// ---------------------------------------------------------------- //

export async function poolMint(toAddress: string, amount: number) {
  return await writeClient().writeContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "mint",
    args: [toAddress, amount],
    value: 0n,
  });
}

export async function poolDeposit(asset: string, amount: number, caller: string) {
  return await writeClient().writeContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "deposit",
    args: [asset, amount, caller],
    value: 0n,
  });
}

export async function poolWithdraw(asset: string, amount: number, caller: string) {
  return await writeClient().writeContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "withdraw",
    args: [asset, amount, caller],
    value: 0n,
  });
}

export async function poolPurchasePolicy(asset: string, coverageAmount: number, caller: string) {
  return await writeClient().writeContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "purchase_policy",
    args: [asset, coverageAmount, caller],
    value: 0n,
  });
}

export async function poolSettleClaim(
  policyId: string,
  depegConfirmed: string,
  severityPct: number,
  caller: string,
) {
  return await writeClient().writeContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "settle_claim",
    args: [policyId, depegConfirmed, severityPct, caller],
    value: 0n,
  });
}

export async function poolBalanceOf(address: string) {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "balance_of",
    args: [address],
  });
}

export async function poolGetStats(asset: string) {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "get_pool_stats",
    args: [asset],
  });
}

export async function poolGetProviderPosition(asset: string, address: string) {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "get_provider_position",
    args: [asset, address],
  });
}

export async function poolGetPolicy(policyId: string) {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "get_policy",
    args: [policyId],
  });
}

export async function poolGetAllPolicies() {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "get_all_policies",
    args: [],
  });
}

export async function poolGetPoliciesByHolder(address: string) {
  return await readClient().readContract({
    address: POOL_CONTRACT_ADDRESS as any,
    functionName: "get_policies_by_holder",
    args: [address],
  });
}