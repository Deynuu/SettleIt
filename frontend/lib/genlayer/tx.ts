/** Poll a transaction and report only what the network reports (see protocol.ts). */
import { getReadClient } from "./client";
import { lifecycleFromStatus, type Lifecycle } from "../settleit/protocol";

export interface TxSnapshot { lifecycle: Lifecycle; statusName: string; reverted: boolean; error?: string }

function statusName(tx: any): string {
  return String(tx?.statusName ?? tx?.status_name ?? tx?.status ?? "");
}

export async function fetchTx(hash: `0x${string}`): Promise<TxSnapshot> {
  try {
    const tx: any = await getReadClient().getTransaction({ hash });
    const name = statusName(tx);
    const exec = String(tx?.txExecutionResultName ?? "");
    const decided = !!name && !["PENDING", "PROPOSING", "COMMITTING", "REVEALING", "LEADER_REVEALING", "UNINITIALIZED", "ACTIVATED"].includes(name.toUpperCase());
    return { lifecycle: lifecycleFromStatus(name), statusName: name, reverted: decided && exec === "FINISHED_WITH_ERROR" };
  } catch (e) {
    return { lifecycle: lifecycleFromStatus("PENDING"), statusName: "", reverted: false, error: (e as Error)?.message };
  }
}

/** Calls onUpdate each poll until a terminal stage or abort. Resolves with the last snapshot. */
export async function trackTx(
  hash: `0x${string}`,
  onUpdate: (s: TxSnapshot) => void,
  signal?: AbortSignal,
  intervalMs = 3000,
  stopAt: "accepted" | "finalized" = "finalized",
): Promise<TxSnapshot> {
  let last: TxSnapshot = await fetchTx(hash);
  onUpdate(last);
  while (!signal?.aborted) {
    const l = last.lifecycle;
    if (l.terminal || (stopAt === "accepted" && (l.stage === "accepted" || l.stage === "ready_to_finalize"))) break;
    await new Promise((r) => setTimeout(r, intervalMs));
    if (signal?.aborted) break;
    last = await fetchTx(hash);
    onUpdate(last);
  }
  return last;
}
