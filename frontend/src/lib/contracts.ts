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

// Ensure MetaMask is on GenLayer Studio Network, prompting a switch/add.
export async function ensureStudioNetwork(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found.");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_HEX }],
    });
  } catch (err: any) {
    // 4902 = chain not added yet.
    if (err && err.code === 4902) {
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
    } else {
      throw err;
    }
  }
}