import { STUDIO_CHAIN_HEX } from "./constants";

// Wallet helpers only. All contract calls (judge + pool) go through
// genlayer-js now; there is no ethers/EVM contract layer anymore.

export function hasMetaMask(): boolean {
  return typeof (window as any).ethereum !== "undefined";
}

// Prompt connection, return the connected address as a plain string.
export async function connectWallet(): Promise<string> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found. Install MetaMask to continue.");
  const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
  if (!accounts || accounts.length === 0) throw new Error("No account authorized.");
  return accounts[0];
}

// Best-effort switch to GenLayer Studio. Never throws: if the wallet is
// already on Studio, or rejects programmatic switching (some wallets return
// non-standard error codes), we simply proceed. The connect flow must not
// abort just because a switch/add call was unnecessary or unsupported.
export async function ensureStudioNetwork(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("No wallet found. Install a browser wallet to continue.");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_HEX }],
    });
  } catch (switchErr: any) {
    // 4902 = chain not added. Try to add it, but do not abort on failure.
    if (switchErr && switchErr.code === 4902) {
      try {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: STUDIO_CHAIN_HEX,
              chainName: "GenLayer Studio",
              nativeCurrency: { name: "GEN", symbol: "GEN", decimals: 18 },
              rpcUrls: ["https://studio.genlayer.com/api"],
              blockExplorerUrls: [],
            },
          ],
        });
      } catch {
        // swallow: user can switch manually; connect still proceeds
      }
    }
    // Any other error (e.g. -32000 unsupported, or already on chain): ignore.
  }
}