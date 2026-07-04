import { createContext, useContext, useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { connectWalletAndSwitch } from "../lib/genlayer";
import { OWNER_ADDRESS } from "../lib/constants";

interface WalletState {
  address: string;
  isConnected: boolean;
  isOwner: boolean;
  connecting: boolean;
  error: string;
  connect: () => Promise<void>;
  disconnect: () => void;
}

const WalletContext = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [address, setAddress] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>("");
  const isConnected = address !== "";
  const isOwner = isConnected && address.toLowerCase() === OWNER_ADDRESS;

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      const addr = await connectWalletAndSwitch();
      setAddress(addr);
    } catch (err: any) {
      setError(err?.message || "Failed to connect wallet");
    } finally {
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setAddress("");
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth || !eth.request) return;
    eth
      .request({ method: "eth_accounts" })
      .then((accounts: string[]) => {
        if (accounts && accounts.length > 0) setAddress(accounts[0]);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAddress("");
      } else {
        setAddress(accounts[0]);
      }
    };
    const onChainChanged = () => {
      window.location.reload();
    };
    if (eth.on) {
      eth.on("accountsChanged", onAccountsChanged);
      eth.on("chainChanged", onChainChanged);
    }
    return () => {
      if (eth.removeListener) {
        eth.removeListener("accountsChanged", onAccountsChanged);
        eth.removeListener("chainChanged", onChainChanged);
      }
    };
  }, []);

  const value: WalletState = { address, isConnected, isOwner, connecting, error, connect, disconnect };
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}