/**
 * Preflight for a write: simulate it against StudioNet BEFORE asking the wallet to sign, and
 * report whatever fee information the node actually gives us. Nothing here is invented: when the
 * node reports no fee data the UI says so.
 */
import { getWriteClient } from "./client";

export interface Plan {
  /** True when the simulation ran and the contract did not reject the call. */
  simulated: boolean;
  /** Human text about fees, or an honest statement that none was reported. */
  feeText: string;
  /** Raw fee accounting from the node, if any (shown in a <details> for reviewers). */
  feeRaw: Record<string, unknown> | null;
}

export const NO_FEE_INFO = "No fee estimate was reported by StudioNet for this call. Your wallet will show the network fee it will charge before you sign.";

function describeFees(acct: Record<string, unknown> | null): string {
  if (!acct) return NO_FEE_INFO;
  const bits: string[] = [];
  for (const [k, v] of Object.entries(acct)) {
    if (typeof v === "string" || typeof v === "number" || typeof v === "bigint") bits.push(`${k}: ${String(v)}`);
  }
  return bits.length ? `Estimated by StudioNet — ${bits.slice(0, 6).join(", ")}` : NO_FEE_INFO;
}

/** Throws the node's error (including contract EXPECTED:* codes) if the simulation fails. */
export async function preflightWrite(
  account: `0x${string}`,
  address: `0x${string}`,
  functionName: string,
  args: unknown[],
): Promise<Plan> {
  const client = getWriteClient(account) as unknown as {
    simulateWriteContract?: (a: Record<string, unknown>) => Promise<unknown>;
  };
  if (typeof client.simulateWriteContract !== "function") {
    return { simulated: false, feeText: NO_FEE_INFO, feeRaw: null };
  }
  // leaderOnly: preflight asks one node to run the call; full validator consensus only happens when you sign.
  const base = { address, functionName, args, value: BigInt(0), leaderOnly: true };
  let feeRaw: Record<string, unknown> | null = null;
  try {
    // includeReceipt asks StudioNet for fee accounting on newer nodes/SDKs.
    const withReceipt = (await client.simulateWriteContract({ ...base, includeReceipt: true })) as { feeAccounting?: Record<string, unknown> } | undefined;
    feeRaw = withReceipt && typeof withReceipt === "object" && withReceipt.feeAccounting ? withReceipt.feeAccounting : null;
  } catch (e) {
    // A contract rejection must surface; an unsupported option must not.
    if (/(EXPECTED|LLM_ERROR|TRANSIENT|EXTERNAL):[A-Z_]+/.test(String((e as Error)?.message ?? e))) throw e;
    await client.simulateWriteContract({ ...base });
  }
  return { simulated: true, feeText: describeFees(feeRaw), feeRaw };
}
