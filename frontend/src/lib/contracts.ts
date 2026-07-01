import { ethers } from "ethers";
import { GENUSDC_ADDRESS, POOL_ADDRESSES, STUDIO_CHAIN_HEX, STUDIO_CHAIN_ID } from "./constants";

export const GENUSDC_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function mint(address to, uint256 amount)",
  "function decimals() view returns (uint8)",
];

export const POOL_ABI = [
  "function deposit(uint256 amount)",
  "function purchasePolicy(uint256 coverageAmount, uint256 premiumAmount) returns (uint256)",
  "function settleClaim(uint256 policyId, bool depegConfirmed, uint256 severityPct)",
  "function withdraw(uint256 amount)",
  "function policies(uint256) view returns (address holder, uint256 coverageAmount, uint256 premiumPaid, bool active, bool claimed)",
  "function providers(address) view returns (uint256 depositAmount, uint256 earnedPremiums)",
  "function policyCounter() view returns (uint256)",
  "function totalPoolDeposits() view returns (uint256)",
  "function totalActiveCoverage() view returns (uint256)",
  "function maxUtilizationBps() view returns (uint256)",
  "function protocolFeeBps() view returns (uint256)",
  "function assetSymbol() view returns (string)",
  "function owner() view returns (address)",
  "function getPoolStats() view returns (uint256 _totalPoolDeposits, uint256 _totalActiveCoverage, uint256 _maxUtilizationBps, uint256 _policyCounter, uint256 _protocolFeeBps)",
  "function getProviderCount() view returns (uint256)",
  "event PolicyPurchased(uint256 policyId, address holder, uint256 coverage, uint256 premium)",
  "event ClaimPaid(uint256 policyId, address holder, uint256 payoutAmount, uint256 severityPct)",
  "event ClaimDenied(uint256 policyId, string reason)",
];

export function getBrowserProvider(): ethers.BrowserProvider {
  const eth = (window as any).ethereum;
  if (!eth) {
    throw new Error("MetaMask not found. Install MetaMask to continue.");
  }
  return new ethers.BrowserProvider(eth);
}

export async function getSigner(): Promise<ethers.Signer> {
  const provider = getBrowserProvider();
  await provider.send("eth_requestAccounts", []);
  return await provider.getSigner();
}

export async function ensureStudioNetwork(): Promise<void> {
  const eth = (window as any).ethereum;
  if (!eth) throw new Error("MetaMask not found.");
  try {
    await eth.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: STUDIO_CHAIN_HEX }],
    });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({
        method: "wallet_addEthereumChain",
        params: [
          {
            chainId: STUDIO_CHAIN_HEX,
            chainName: "GenLayer Studio Network",
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

export function genUSDCContract(signerOrProvider: ethers.Signer | ethers.Provider) {
  return new ethers.Contract(GENUSDC_ADDRESS, GENUSDC_ABI, signerOrProvider);
}

export function poolContract(asset: string, signerOrProvider: ethers.Signer | ethers.Provider) {
  const addr = POOL_ADDRESSES[asset.toUpperCase()];
  if (!addr) throw new Error("No pool deployed for asset " + asset);
  return new ethers.Contract(addr, POOL_ABI, signerOrProvider);
}

export const STUDIO_CHAIN_ID_NUM = STUDIO_CHAIN_ID;