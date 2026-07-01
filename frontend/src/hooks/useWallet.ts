import { useState, useEffect, useCallback } from "react";
import { ensureStudioNetwork, getSigner } from "../lib/contracts";
import { initClient } from "../lib/genlayer";
import { OWNER_ADDRESS } from "../lib/constants";

export function useWallet() {
  const [address, setAddress] = useState<string>("");
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string>("");

  const isConnected = address !== "";
  const isOwner = isConnected && address.toLowerCase() === OWNER_ADDRESS;

  const connect = useCallback(async () => {
    setConnecting(true);
    setError("");
    try {
      await ensureStudioNetwork();
      const signer = await getSigner();
      const addr = await signer.getAddress();
      initClient(addr);
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
    if (!eth) return;

    const onAccountsChanged = (accounts: string[]) => {
      if (!accounts || accounts.length === 0) {
        setAddress("");
      } else {
        initClient(accounts[0]);
        setAddress(accounts[0]);
      }
    };
    const onChainChanged = () => {
      window.location.reload();
    };

    eth.on("accountsChanged", onAccountsChanged);
    eth.on("chainChanged", onChainChanged);
    return () => {
      eth.removeListener("accountsChanged", onAccountsChanged);
      eth.removeListener("chainChanged", onChainChanged);
    };
  }, []);

  return { address, isConnected, isOwner, connecting, error, connect, disconnect };
}