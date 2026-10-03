"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { currentAccount, currentChainHex, getProvider, isOnStudionet, requestAccount, switchToStudionet } from "./wallet";
import { humanizeError } from "../settleit/errors";

interface WalletState {
  account: `0x${string}` | null;
  hasProvider: boolean;
  onStudionet: boolean;
  /** Live chain id reported by the wallet (hex), or null. */
  chainHex: string | null;
  busy: boolean;
  error: string | null;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
}

const Ctx = createContext<WalletState | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<`0x${string}` | null>(null);
  const [chain, setChain] = useState<string | null>(null);
  const [hasProvider, setHasProvider] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setAccount(await currentAccount());
    setChain(await currentChainHex());
  }, []);

  useEffect(() => {
    const p = getProvider();
    setHasProvider(!!p);
    if (!p) return;
    void refresh();
    const onAccounts = (a: string[]) => setAccount((a?.[0] as `0x${string}`) ?? null);
    const onChain = (c: string) => setChain(String(c).toLowerCase());
    p.on?.("accountsChanged", onAccounts);
    p.on?.("chainChanged", onChain);
    return () => {
      p.removeListener?.("accountsChanged", onAccounts);
      p.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try { await fn(); } catch (e) { setError(humanizeError(e)); } finally { setBusy(false); }
  }, []);

  const connect = useCallback(() => run(async () => {
    const a = await requestAccount();
    setAccount(a);
    setChain(await currentChainHex());
  }), [run]);

  const switchNetwork = useCallback(() => run(async () => {
    await switchToStudionet();
    setChain(await currentChainHex());
  }), [run]);

  const value = useMemo<WalletState>(() => ({
    account, hasProvider, onStudionet: isOnStudionet(chain), chainHex: chain, busy, error,
    connect, switchNetwork, disconnect: () => setAccount(null),
  }), [account, chain, hasProvider, busy, error, connect, switchNetwork]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet(): WalletState {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWallet must be used inside <WalletProvider>");
  return v;
}
