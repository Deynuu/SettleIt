"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as C from "./contract";
import { CONTRACT_ADDRESS } from "./config";
import { trackTx, type TxSnapshot } from "./tx";
import { prepareWrite, sendWrite, type WriteSpec } from "./contract";
import type { Plan } from "./preflight";
import { WalletGuardError } from "./wallet";
import { humanizeError, isUserRejection } from "../settleit/errors";
import { LIFECYCLE_CONFIRM, LIFECYCLE_IDLE, LIFECYCLE_PREFLIGHT, LIFECYCLE_SUBMITTED, LIFECYCLE_WALLET, lifecycleFailed, type Lifecycle } from "../settleit/protocol";

const enabled = !!CONTRACT_ADDRESS;

export const useCase = (id: number, poll = false) =>
  useQuery({ queryKey: ["case", id], queryFn: () => C.getCase(id), enabled: enabled && id > 0, refetchInterval: poll ? 5000 : false });
export const useEvidence = (id: number) => useQuery({ queryKey: ["evidence", id], queryFn: () => C.getEvidence(id), enabled: enabled && id > 0 });
export const useVerdict = (id: number, poll = false) =>
  useQuery({ queryKey: ["verdict", id], queryFn: () => C.getVerdict(id), enabled: enabled && id > 0, refetchInterval: poll ? 5000 : false });
export const useReview = (id: number, enabledFlag: boolean) =>
  useQuery({ queryKey: ["review", id], queryFn: () => C.getReviewVerdict(id), enabled: enabled && enabledFlag && id > 0 });
export const useHistory = (id: number) => useQuery({ queryKey: ["history", id], queryFn: () => C.getCaseHistory(id, 0, 20), enabled: enabled && id > 0 });
export const useProtocol = () => useQuery({ queryKey: ["protocol"], queryFn: C.getProtocolInfo, enabled, staleTime: 5 * 60_000 });
export const useVotes = (id: number) => useQuery({ queryKey: ["votes", id], queryFn: () => C.getVoteSummary(id), enabled: enabled && id > 0 });
export const useMyVote = (id: number, who: string | null) =>
  useQuery({ queryKey: ["myvote", id, who], queryFn: () => C.getUserVote(id, who!), enabled: enabled && id > 0 && !!who });
/** Public cases, newest first, one bounded page at a time (the contract caps pages at 20). */
export const useFeed = (page = 0, limit = 20) =>
  useQuery({
    queryKey: ["feed", page, limit],
    enabled,
    queryFn: async () => {
      const [total, rows] = await Promise.all([C.getPublicCaseCount(), C.getCases(page * limit, limit)]);
      return { total, rows, hasMore: (page + 1) * limit < total };
    },
  });

export interface TxFlow {
  lifecycle: Lifecycle;
  hash: `0x${string}` | null;
  error: string | null;
  /** True from the first click until the action is decided or fails: buttons must be disabled. */
  busy: boolean;
  /** Simulation result + fee info while waiting for the user's confirmation. */
  plan: (Plan & { summary: string }) | null;
  /** The last spec, kept so a failed / undetermined / cancelled attempt can be retried. */
  canRetry: boolean;
  start: (spec: WriteSpec) => Promise<void>;
  confirm: () => Promise<`0x${string}` | null>;
  cancel: () => void;
  retry: () => Promise<void>;
  reset: () => void;
  attach: (hash: `0x${string}`) => void;
}

/**
 * One write, end to end: guard (chain + account) → simulate → user confirms → guard again →
 * wallet signs → track until Finalized → re-read contract state. Only the network's own reports
 * move the lifecycle past "submitted".
 */
export function useTxFlow(onDecided?: (hash: `0x${string}`) => void): TxFlow {
  const qc = useQueryClient();
  const [lifecycle, setLifecycle] = useState<Lifecycle>(LIFECYCLE_IDLE);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [plan, setPlan] = useState<(Plan & { summary: string }) | null>(null);
  const spec = useRef<WriteSpec | null>(null);
  const lock = useRef(false); // synchronous guard against double clicks
  const abort = useRef<AbortController | null>(null);
  const cb = useRef(onDecided);
  cb.current = onDecided;

  useEffect(() => () => abort.current?.abort(), []);

  const track = useCallback(async (h: `0x${string}`) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    let decided = false;
    const last = await trackTx(h, (s: TxSnapshot) => {
      setLifecycle(s.lifecycle);
      setError(s.reverted ? "The contract rejected this action (it ran but returned an error). Nothing was recorded." : null);
      if (!decided && !s.reverted && (s.lifecycle.stage === "accepted" || s.lifecycle.finalized)) {
        decided = true;
        void qc.invalidateQueries();
      }
    }, ac.signal);
    // authoritative re-read: never trust optimistic UI after a write
    await qc.invalidateQueries();
    await qc.refetchQueries({ type: "active" });
    if (!ac.signal.aborted && !last.reverted && last.lifecycle.finalized) cb.current?.(h);
    lock.current = false;
  }, [qc]);

  const fail = useCallback((e: unknown) => {
    const msg = e instanceof WalletGuardError ? e.message : humanizeError(e);
    setError(msg);
    setPlan(null);
    setLifecycle(isUserRejection(e) ? LIFECYCLE_IDLE : lifecycleFailed(msg));
    lock.current = false;
  }, []);

  const start = useCallback(async (s: WriteSpec) => {
    if (lock.current) return;
    lock.current = true;
    spec.current = s;
    setError(null); setHash(null); setPlan(null);
    setLifecycle(LIFECYCLE_PREFLIGHT);
    try {
      const p = await prepareWrite(s);
      setPlan({ ...p, summary: s.summary });
      setLifecycle(LIFECYCLE_CONFIRM);
    } catch (e) { fail(e); }
  }, [fail]);

  const confirm = useCallback(async () => {
    const s = spec.current;
    if (!s || lifecycleRef.current !== "confirm") return null;
    setLifecycle(LIFECYCLE_WALLET);
    setPlan(null);
    try {
      const h = await sendWrite(s);
      setHash(h);
      setLifecycle(LIFECYCLE_SUBMITTED);
      saveTxHash(txKey(s), h);
      void track(h);
      return h;
    } catch (e) { fail(e); return null; }
  }, [fail, track]);

  const cancel = useCallback(() => { setPlan(null); setError(null); setLifecycle(LIFECYCLE_IDLE); lock.current = false; }, []);
  const retry = useCallback(async () => {
    const s = spec.current;
    if (!s) return;
    lock.current = false;
    await start(s);
  }, [start]);
  const attach = useCallback((h: `0x${string}`) => { lock.current = true; setHash(h); setError(null); setLifecycle(LIFECYCLE_SUBMITTED); void track(h); }, [track]);
  const reset = useCallback(() => { abort.current?.abort(); setHash(null); setError(null); setPlan(null); setLifecycle(LIFECYCLE_IDLE); lock.current = false; }, []);

  const lifecycleRef = useRef<Lifecycle["stage"]>("idle");
  lifecycleRef.current = lifecycle.stage;

  const busy = ["preflight", "confirm", "wallet", "submitted", "processing"].includes(lifecycle.stage);
  const canRetry = !!spec.current && ["failed", "undetermined", "timeout", "canceled"].includes(lifecycle.stage);
  return { lifecycle, hash, error, busy, plan, canRetry, start, confirm, cancel, retry, reset, attach };
}

/** Remember a tx hash per action so a refresh can resume tracking instead of losing it. */
export const txKey = (s: WriteSpec) => `settleit:tx:${s.functionName}:${String(s.args[0] ?? "")}`;
export function saveTxHash(key: string, hash: string) {
  try { localStorage.setItem(key, hash); } catch { /* storage unavailable */ }
}
export function loadTxHash(key: string): `0x${string}` | null {
  try {
    const v = localStorage.getItem(key);
    return v && /^0x[0-9a-fA-F]{64}$/.test(v) ? (v as `0x${string}`) : null;
  } catch { return null; }
}
export const verdictTxKey = (caseId: number) => `settleit:tx:request_verdict:${caseId}`;
export const reviewTxKey = (caseId: number) => `settleit:tx:request_review:${caseId}`;
