/**
 * Protocol lifecycle model.
 *
 * A GenLayer write is NOT final when it is submitted, and not final when it is accepted.
 * This module turns the transaction status reported by the network into exactly the words
 * the product is allowed to use — and nothing more. There is deliberately no appeal
 * countdown here: no timing is invented; only what the protocol reports is shown.
 */

export type LifecycleStage =
  | "idle"
  | "preflight" // wallet/chain guard + simulation running, nothing signed
  | "confirm" // simulation done, waiting for the user to review the plan and confirm
  | "wallet" // waiting for the wallet to approve
  | "submitted" // hash exists, not yet seen by the network
  | "processing" // pending / proposing / committing / revealing
  | "accepted" // consensus accepted — provisional, still appealable
  | "ready_to_finalize"
  | "appeal" // an appeal round is running
  | "finalized"
  | "undetermined" // no consensus this round
  | "timeout"
  | "canceled"
  | "failed" // wallet rejected / submission failed / reverted
  ;

export interface Lifecycle {
  stage: LifecycleStage;
  /** Short badge text. */
  label: string;
  /** One honest sentence for the details line. */
  detail: string;
  /** Network has decided but has not finalized. */
  provisional: boolean;
  finalized: boolean;
  /** No further status change is expected without user action. */
  terminal: boolean;
  /** True while we should keep polling. */
  polling: boolean;
}

const make = (l: Lifecycle): Lifecycle => l;

export const LIFECYCLE_IDLE: Lifecycle = make({
  stage: "idle",
  label: "Not sent",
  detail: "Nothing has been submitted yet.",
  provisional: false,
  finalized: false,
  terminal: false,
  polling: false,
});

export const LIFECYCLE_PREFLIGHT: Lifecycle = make({
  stage: "preflight",
  label: "Checking",
  detail: "Checking your wallet network and account, and simulating the action. Nothing is signed yet.",
  provisional: false,
  finalized: false,
  terminal: false,
  polling: false,
});

export const LIFECYCLE_CONFIRM: Lifecycle = make({
  stage: "confirm",
  label: "Review before signing",
  detail: "The simulation succeeded. Review the plan and fee information, then confirm to open your wallet.",
  provisional: false,
  finalized: false,
  terminal: false,
  polling: false,
});

export const LIFECYCLE_WALLET: Lifecycle = make({
  stage: "wallet",
  label: "Wallet approval",
  detail: "Approve the request in your wallet. Nothing is on-chain yet.",
  provisional: false,
  finalized: false,
  terminal: false,
  polling: false,
});

export const LIFECYCLE_SUBMITTED: Lifecycle = make({
  stage: "submitted",
  label: "Submitted",
  detail: "Your transaction was sent. Waiting for GenLayer to pick it up.",
  provisional: false,
  finalized: false,
  terminal: false,
  polling: true,
});

export function lifecycleFailed(detail: string): Lifecycle {
  return make({
    stage: "failed",
    label: "Failed",
    detail,
    provisional: false,
    finalized: false,
    terminal: true,
    polling: false,
  });
}

const PROCESSING_DETAIL: Record<string, string> = {
  PENDING: "Queued on GenLayer.",
  PROPOSING: "A leader validator is proposing a result.",
  COMMITTING: "Independent validators are checking the proposed result.",
  REVEALING: "Validators are revealing their decisions.",
  LEADER_REVEALING: "The leader is revealing its result.",
  ACTIVATED: "Queued on GenLayer.",
};

/**
 * @param statusName transaction status name as reported by genlayer-js (e.g. "ACCEPTED").
 */
export function lifecycleFromStatus(statusName: string | null | undefined): Lifecycle {
  const s = (statusName ?? "").toUpperCase();
  switch (s) {
    case "":
    case "UNINITIALIZED":
      return LIFECYCLE_SUBMITTED;
    case "PENDING":
    case "ACTIVATED":
    case "PROPOSING":
    case "COMMITTING":
    case "REVEALING":
    case "LEADER_REVEALING":
      return make({
        stage: "processing",
        label: "GenLayer processing",
        detail: PROCESSING_DETAIL[s] ?? "GenLayer is processing the transaction.",
        provisional: false,
        finalized: false,
        terminal: false,
        polling: true,
      });
    case "ACCEPTED":
      return make({
        stage: "accepted",
        label: "Accepted — provisional",
        detail:
          "Validators reached consensus. The result is accepted but not final: it is not final until GenLayer reports Finalized.",
        provisional: true,
        finalized: false,
        terminal: false,
        polling: true,
      });
    case "READY_TO_FINALIZE":
      return make({
        stage: "ready_to_finalize",
        label: "Accepted — ready to finalize",
        detail: "Accepted by consensus and waiting for GenLayer to finalize it.",
        provisional: true,
        finalized: false,
        terminal: false,
        polling: true,
      });
    case "APPEAL_COMMITTING":
    case "APPEAL_REVEALING":
      return make({
        stage: "appeal",
        label: "Appeal in progress",
        detail: "The result is being re-evaluated in an appeal round.",
        provisional: true,
        finalized: false,
        terminal: false,
        polling: true,
      });
    case "FINALIZED":
      return make({
        stage: "finalized",
        label: "Finalized",
        detail: "Finalized on GenLayer. This outcome is permanent.",
        provisional: false,
        finalized: true,
        terminal: true,
        polling: false,
      });
    case "UNDETERMINED":
      return make({
        stage: "undetermined",
        label: "No consensus",
        detail: "No consensus reached in this round. Nothing was recorded — you can request the verdict again.",
        provisional: false,
        finalized: false,
        terminal: true,
        polling: false,
      });
    case "LEADER_TIMEOUT":
    case "VALIDATORS_TIMEOUT":
      return make({
        stage: "timeout",
        label: "Timed out",
        detail: "The validators timed out in this round. Nothing was recorded — you can try again.",
        provisional: false,
        finalized: false,
        terminal: true,
        polling: false,
      });
    case "CANCELED":
      return make({
        stage: "canceled",
        label: "Canceled",
        detail: "The transaction was canceled.",
        provisional: false,
        finalized: false,
        terminal: true,
        polling: false,
      });
    default:
      return make({
        stage: "processing",
        label: "GenLayer processing",
        detail: "GenLayer is processing the transaction.",
        provisional: false,
        finalized: false,
        terminal: false,
        polling: true,
      });
  }
}

/** True once the network has reached any decision (accepted, finalized, or a failed round). */
export function isDecidedStage(stage: LifecycleStage): boolean {
  return (
    stage === "accepted" ||
    stage === "ready_to_finalize" ||
    stage === "appeal" ||
    stage === "finalized" ||
    stage === "undetermined" ||
    stage === "timeout" ||
    stage === "canceled"
  );
}

/** Steps shown in the transaction tracker, in order. */
export const TRACKER_STEPS: readonly { id: string; label: string }[] = [
  { id: "wallet", label: "Wallet approval" },
  { id: "submitted", label: "Submitted" },
  { id: "processing", label: "GenLayer processing" },
  { id: "decided", label: "Consensus decision" },
  { id: "finalized", label: "Finalized" },
];

export type StepState = "done" | "active" | "todo" | "failed";

/** Map a lifecycle to the state of each tracker step (never marks Finalized early). */
export function trackerStates(l: Lifecycle): { id: string; label: string; state: StepState }[] {
  const order = ["wallet", "submitted", "processing", "decided", "finalized"];
  let active = 0;
  switch (l.stage) {
    case "idle":
    case "preflight":
    case "confirm":
      active = -1;
      break;
    case "wallet":
      active = 0;
      break;
    case "submitted":
      active = 1;
      break;
    case "processing":
      active = 2;
      break;
    case "accepted":
    case "ready_to_finalize":
    case "appeal":
      active = 3;
      break;
    case "finalized":
      active = 5; // everything done
      break;
    case "undetermined":
    case "timeout":
    case "canceled":
      active = 3;
      break;
    case "failed":
      active = -2;
      break;
  }
  const failedAt = l.stage === "failed" ? 0 : l.stage === "undetermined" || l.stage === "timeout" || l.stage === "canceled" ? 3 : -1;
  return TRACKER_STEPS.map((s, i) => {
    let state: StepState = "todo";
    if (failedAt >= 0 && i === failedAt && (l.stage === "failed" || l.stage === "undetermined" || l.stage === "timeout" || l.stage === "canceled")) {
      state = "failed";
    } else if (active >= 0 && i < active) {
      state = "done";
    } else if (active >= 0 && i === active) {
      state = "active";
    }
    // "decided" steps already complete once accepted (provisional) — Finalized stays todo.
    if ((l.stage === "accepted" || l.stage === "ready_to_finalize" || l.stage === "appeal") && i === 3) state = "done";
    if ((l.stage === "accepted" || l.stage === "ready_to_finalize" || l.stage === "appeal") && i === 4) state = "active";
    void order;
    return { id: s.id, label: s.label, state };
  });
}
