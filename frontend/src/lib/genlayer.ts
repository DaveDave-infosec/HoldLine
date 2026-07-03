import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { JUDGE_CONTRACT_ADDRESS, POOL_CONTRACT_ADDRESS, STUDIO_CHAIN_HEX } from "./constants";

export const client = createClient({ chain: studionet });

const ADDRESS_REGEX = /^0x[0-9a-fA-F]{40}$/;

function asJsonRpcAccount(addr: string) {
  return { address: addr as `0x${string}`, type: "json-rpc" as const };
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

export async function connectWalletAndSwitch(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("Wallet not detected. Install a browser wallet to continue.");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  const address = accounts[0];
  await ensureChain();
  return address;
}

export function initClient(_accountAddress: string) {
  return client;
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
  accountAddress: string,
) {
  if (!ADDRESS_REGEX.test(accountAddress)) {
    throw new Error("Invalid account address. Reconnect your wallet and try again.");
  }
  await ensureChain();
  return await (client as any).writeContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "judge_depeg",
    args: [assetSymbol, priceEndpointUrl, newsQueryUrl, thresholdPrice, requesterAddress, requestedAt],
    account: asJsonRpcAccount(accountAddress),
    gas: 12_000_000n,
  });
}

export async function getVerdict(verdictId: string) {
  return await (client as any).readContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "get_verdict",
    args: [verdictId],
  });
}

export async function getVerdictCount() {
  return await (client as any).readContract({
    address: JUDGE_CONTRACT_ADDRESS,
    functionName: "get_verdict_count",
    args: [],
  });
}

// ---------------------------------------------------------------- //
// Pool contract (money layer)
// ---------------------------------------------------------------- //

async function poolWrite(functionName: string, args: any[], accountAddress: string) {
  if (!ADDRESS_REGEX.test(accountAddress)) {
    throw new Error("Invalid account address. Reconnect your wallet and try again.");
  }
  await ensureChain();
  return await (client as any).writeContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName,
    args,
    account: asJsonRpcAccount(accountAddress),
    gas: 8_000_000n,
  });
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

export async function poolBalanceOf(address: string) {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "balance_of",
    args: [address],
  });
}

export async function poolGetStats(asset: string) {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_pool_stats",
    args: [asset],
  });
}

export async function poolGetProviderPosition(asset: string, address: string) {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_provider_position",
    args: [asset, address],
  });
}

export async function poolGetPolicy(policyId: string) {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_policy",
    args: [policyId],
  });
}

export async function poolGetAllPolicies() {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_all_policies",
    args: [],
  });
}

export async function poolGetPoliciesByHolder(address: string) {
  return await (client as any).readContract({
    address: POOL_CONTRACT_ADDRESS,
    functionName: "get_policies_by_holder",
    args: [address],
  });
}