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

/** Add (if needed) and switch to StudioNet using the chain object from genlayer-js. */
export async function switchToStudionet(): Promise<void> {
  const p = getProvider();
  if (!p) throw new Error("No wallet provider found");
  try {
    await p.request({ method: "wallet_switchEthereumChain", params: [{ chainId: CHAIN_ID_HEX }] });
  } catch (e) {
    const code = (e as { code?: number })?.code;
    if (code === 4001) throw e;
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
}
