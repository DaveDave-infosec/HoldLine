import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";
import { JUDGE_CONTRACT_ADDRESS } from "./constants";

// GenLayer client for MetaMask signing.
// Per the GenLayer docs: for external-wallet (MetaMask) integration you pass
// just the connected ADDRESS STRING to createClient. MetaMask handles the
// actual signing. The per-call account override is the private-key path and
// is not used here. The account stays a plain string end to end.

let _client: ReturnType<typeof createClient> | null = null;
let _connectedAddress: string | null = null;

// Build (or rebuild) the client bound to a connected wallet address.
// Call this after the user connects MetaMask, passing their address.
export function initClient(accountAddress: string) {
  _connectedAddress = accountAddress;
  _client = createClient({
    chain: studionet,
    account: accountAddress as any, // address-string path; SDK + MetaMask sign
  });
  return _client;
}

// Read-only client, no account needed for view calls.
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

// Trigger the judge. requesterAddress and requestedAt are client-captured
// plain strings, passed as contract args, never read from gl.message.
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

export async function getAllVerdicts() {
  return await readClient().readContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "get_all_verdicts",
    args: [],
  });
}

export async function getVerdictsByRequester(addr: string) {
  return await readClient().readContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "get_verdicts_by_requester",
    args: [addr],
  });
}

export async function getVerdictCount() {
  return await readClient().readContract({
    address: JUDGE_CONTRACT_ADDRESS as any,
    functionName: "get_verdict_count",
    args: [],
  });
}
