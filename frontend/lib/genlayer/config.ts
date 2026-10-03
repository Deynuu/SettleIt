/** Typed runtime config. The contract address comes ONLY from NEXT_PUBLIC_CONTRACT_ADDRESS. */
import { studionet } from "genlayer-js/chains";

export const CHAIN = studionet;
export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = "0xf22f";
export const NETWORK_LABEL = "GenLayer StudioNet";
export const EXPLORER_URL = "https://genlayer-explorer.vercel.app";

const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;

export function readContractAddress(raw: string | undefined = process.env.NEXT_PUBLIC_CONTRACT_ADDRESS): `0x${string}` | null {
  const v = (raw ?? "").trim();
  return ADDRESS_RE.test(v) && !/^0x0{40}$/.test(v) ? (v as `0x${string}`) : null;
}

export const CONTRACT_ADDRESS = readContractAddress();

export const BUILD_COMMIT = process.env.NEXT_PUBLIC_BUILD_COMMIT ?? "local";
export const BUILD_TIME = process.env.NEXT_PUBLIC_BUILD_TIME ?? "";
export const REPO_URL = "https://github.com/Deynuu/SettleIt";
export const commitUrl = (sha: string) => `${REPO_URL}/commit/${sha}`;
export const addressUrl = (a: string) => `${EXPLORER_URL}/address/${a}`;

export const txUrl = (hash: string) => `${EXPLORER_URL}/transactions/${hash}`;
