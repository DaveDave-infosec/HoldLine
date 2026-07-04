// frontend/src/lib/genlayer.ts
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { JUDGE_CONTRACT_ADDRESS, POOL_CONTRACT_ADDRESS, STUDIO_CHAIN_HEX } from "./constants";
export const publicClient: any = createClient({ chain: studionet } as any);
export function getWalletClient(account: string): any {
  return createClient({
    chain: studionet,
    account: account as `0x${string}`,
  } as any);
}
const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;
export async function connectWalletAndSwitch(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Wallet not detected. Install a browser wallet to continue.");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];
  await ensureChain();
  return address;
}
async function ensureChain(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Wallet not detected.");
  const currentChainId = await eth.request({ method: "eth_chainId" });
  if (typeof currentChainId === "string" && currentChainId.toLowerCase() === STUDIO_CHAIN_HEX.toLowerCase()) {
    return;
  }
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_HEX }],
    });
  } catch (e: any) {
    if (e?.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIO_CHAIN_HEX,
            chainName: "GenLayer Studio",
            nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
            rpcUrls: ["https://studio.genlayer.com/api"],
            blockExplorerUrls: ["https://explorer-studio.genlayer.com"],
          },
        ],
      });
    } else {
      throw new Error("Failed to switch wallet to Studio Network. " + (e?.message || ""));
    }
  }
}
export function initClient(_accountAddress: string) {
  return publicClient;
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
  policyId: string,
  accountAddress: string,
) {
  if (!ADDRESS_REGEX.test(accountAddress)) {
    throw new Error("Invalid account address. Reconnect your wallet and try again.");
  }
  await ensureChain();
  const client = getWalletClient(accountAddress);
  return await client.writeContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "judge_depeg",
    args: [assetSymbol, priceEndpointUrl, newsQueryUrl, thresholdPrice, requesterAddress, requestedAt, policyId],
    value: 0n,
  } as any);
}
export async function getVerdict(verdictId: string) {
  return await publicClient.readContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "get_verdict",
    args: [verdictId],
  } as any);
}
export async function getVerdictCount() {
  return await publicClient.readContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "get_verdict_count",
    args: [],
  } as any);
}
// ---------------------------------------------------------------- //
// Pool contract (money layer)
// ---------------------------------------------------------------- //
async function poolWrite(functionName: string, args: any[], accountAddress: string) {
  if (!ADDRESS_REGEX.test(accountAddress)) {
    throw new Error("Invalid account address. Reconnect your wallet and try again.");
  }
  await ensureChain();
  const client = getWalletClient(accountAddress);
  return await client.writeContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName,
    args,
    value: 0n,
  } as any);
}
export async function poolMint(toAddress: string, amount: number, caller: string) {
  return await poolWrite("mint", [toAddress, amount], caller);
}
export async function poolDeposit(asset: string, amount: number, caller: string) {
  return await poolWrite("deposit", [asset, amount, caller], caller);
}
export async function poolWithdraw(asset: string, amount: number, caller: string) {
  return await poolWrite("withdraw", [asset, amount, caller], caller);
}
export async function poolPurchasePolicy(asset: string, coverageAmount: number, caller: string) {
  return await poolWrite("purchase_policy", [asset, coverageAmount, caller], caller);
}
export async function poolSettleClaim(
  policyId: string,
  depegConfirmed: string,
  severityPct: number,
  caller: string,
) {
  return await poolWrite("settle_claim", [policyId, depegConfirmed, severityPct, caller], caller);
}
export async function poolSettleFromVerdict(verdictId: string, caller: string) {
  return await poolWrite("settle_from_verdict", [verdictId], caller);
}
export async function poolBalanceOf(address: string) {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "balance_of",
    args: [address],
  } as any);
}
export async function poolGetStats(asset: string) {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_pool_stats",
    args: [asset],
  } as any);
}
export async function poolGetProviderPosition(asset: string, address: string) {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_provider_position",
    args: [asset, address],
  } as any);
}
export async function poolGetPolicy(policyId: string) {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_policy",
    args: [policyId],
  } as any);
}
export async function poolGetAllPolicies() {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_all_policies",
    args: [],
  } as any);
}
export async function poolGetPoliciesByHolder(address: string) {
  return await publicClient.readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_policies_by_holder",
    args: [address],
  } as any);
}