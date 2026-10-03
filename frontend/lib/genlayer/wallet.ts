/** Injected-wallet helpers (window.ethereum). No custodial keys, no backend. */
import { CHAIN, CHAIN_ID_HEX } from "./config";

export interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
  on?(event: string, cb: (...a: any[]) => void): void;
  removeListener?(event: string, cb: (...a: any[]) => void): void;
}

export function getProvider(): Eip1193 | null {
  if (typeof window === "undefined") return null;
  return ((window as unknown as { ethereum?: Eip1193 }).ethereum) ?? null;
}

export async function requestAccount(): Promise<`0x${string}`> {
  const p = getProvider();
  if (!p) throw new Error("No wallet provider found");
  const accts = (await p.request({ method: "eth_requestAccounts" })) as string[];
  if (!accts?.[0]) throw new Error("No account returned");
  return accts[0] as `0x${string}`;
}

export async function currentAccount(): Promise<`0x${string}` | null> {
  const p = getProvider();
  if (!p) return null;
  try {
    const accts = (await p.request({ method: "eth_accounts" })) as string[];
    return (accts?.[0] as `0x${string}`) ?? null;
  } catch {
    return null;
  }
}

export async function currentChainHex(): Promise<string | null> {
  const p = getProvider();
  if (!p) return null;
  try {
    return String(await p.request({ method: "eth_chainId" })).toLowerCase();
  } catch {
    return null;
  }
}

export const isOnStudionet = (hex: string | null) => !!hex && hex.toLowerCase() === CHAIN_ID_HEX;

export class WalletGuardError extends Error {
  constructor(public readonly kind: "NO_WALLET" | "NO_ACCOUNT" | "WRONG_CHAIN" | "ACCOUNT_CHANGED", message: string) {
    super(message);
    this.name = "WalletGuardError";
  }
}

const sameAddr = (a: string | null | undefined, b: string | null | undefined) => !!a && !!b && a.toLowerCase() === b.toLowerCase();

/**
 * Add (if needed) and switch to StudioNet. `wallet_addEthereumChain` is only attempted when the
 * wallet says the chain is unknown (EIP-3326 code 4902); a user rejection (4001) is never retried.
 */
export async function switchToStudionet(p: Eip1193 | null = getProvider()): Promise<void> {
  if (!p) throw new WalletGuardError("NO_WALLET", "No wallet provider found");
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
    return;
  } catch (e) {
    const code = (e as { code?: number; data?: { originalError?: { code?: number } } })?.code;
    const nested = (e as { data?: { originalError?: { code?: number } } })?.data?.originalError?.code;
    if (code === 4001) throw e;
    if (code !== 4902 && nested !== 4902) throw e;
  }
  await p.request({
    method: "wallet_addEthereumChain",
    params: [
      {
        chainId: CHAIN_ID_HEX,
        chainName: CHAIN.name,
        rpcUrls: CHAIN.rpcUrls.default.http,
        nativeCurrency: CHAIN.nativeCurrency,
        blockExplorerUrls: CHAIN.blockExplorers?.default.url ? [CHAIN.blockExplorers.default.url] : undefined,
      },
    ],
  });
  await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
}

/**
 * Called immediately before EVERY write. Reads the wallet's live chain and account (never React
 * state), switches to StudioNet 61999 if needed, then verifies both again. Throws a
 * WalletGuardError instead of ever letting a stale account or wrong chain sign something.
 */
export async function ensureWriteReady(expected: string, p: Eip1193 | null = getProvider()): Promise<`0x${string}`> {
  if (!p) throw new WalletGuardError("NO_WALLET", "No wallet found. Install a browser wallet to continue.");
  const readAccount = async () => ((await p.request({ method: "eth_accounts" })) as string[])?.[0] ?? null;
  const readChain = async () => String(await p.request({ method: "eth_chainId" })).toLowerCase();

  let chain = await readChain();
  if (chain !== CHAIN_ID_HEX) {
    await switchToStudionet(p);
    chain = await readChain();
  }
  if (chain !== CHAIN_ID_HEX) {
    throw new WalletGuardError("WRONG_CHAIN", `Your wallet is not on GenLayer StudioNet (chain ${CHAIN_ID_HEX}). Switch networks and try again.`);
  }
  const acct = await readAccount();
  if (!acct) throw new WalletGuardError("NO_ACCOUNT", "Your wallet has no connected account. Connect it and try again.");
  if (!sameAddr(acct, expected)) {
    throw new WalletGuardError("ACCOUNT_CHANGED", "The active wallet account changed since this page loaded. Reconnect and review the action again.");
  }
  return acct as `0x${string}`;
}
