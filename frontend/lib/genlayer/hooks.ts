"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as C from "./contract";
import { CONTRACT_ADDRESS } from "./config";
import { trackTx, type TxSnapshot } from "./tx";
import { humanizeError, isUserRejection } from "../settleit/errors";
import { LIFECYCLE_IDLE, LIFECYCLE_SUBMITTED, LIFECYCLE_WALLET, lifecycleFailed, type Lifecycle } from "../settleit/protocol";

const enabled = !!CONTRACT_ADDRESS;

export const useCase = (id: number, poll = false) =>
  useQuery({ queryKey: ["case", id], queryFn: () => C.getCase(id), enabled: enabled && id > 0, refetchInterval: poll ? 5000 : false });
export const useEvidence = (id: number) => useQuery({ queryKey: ["evidence", id], queryFn: () => C.getEvidence(id), enabled: enabled && id > 0 });
export const useVerdict = (id: number, poll = false) =>
  useQuery({ queryKey: ["verdict", id], queryFn: () => C.getVerdict(id), enabled: enabled && id > 0, refetchInterval: poll ? 5000 : false });
export const useVotes = (id: number) => useQuery({ queryKey: ["votes", id], queryFn: () => C.getVoteSummary(id), enabled: enabled && id > 0 });
export const useMyVote = (id: number, who: string | null) =>
  useQuery({ queryKey: ["myvote", id, who], queryFn: () => C.getUserVote(id, who!), enabled: enabled && id > 0 && !!who });
export const useFeed = (limit = 20) =>
  useQuery({
    queryKey: ["feed", limit],
    enabled,
    queryFn: async () => {
      const n = await C.getCaseCount();
      const offset = Math.max(0, n - limit);
      const rows = await C.getCases(offset, limit);
      return { total: n, rows: rows.filter((r) => r.visibility === "PUBLIC").reverse() };
    },
  });

export interface TxFlow {
  lifecycle: Lifecycle;
  hash: `0x${string}` | null;
  error: string | null;
  busy: boolean;
  run: (send: () => Promise<`0x${string}`>) => Promise<`0x${string}` | null>;
  reset: () => void;
  attach: (hash: `0x${string}`) => void;
}

/** Runs one wallet write and tracks it honestly: wallet → submitted → network statuses. */
export function useTxFlow(onDecided?: () => void): TxFlow {
  const qc = useQueryClient();
  const [lifecycle, setLifecycle] = useState<Lifecycle>(LIFECYCLE_IDLE);
  const [hash, setHash] = useState<`0x${string}` | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const cb = useRef(onDecided);
  cb.current = onDecided;

  useEffect(() => () => abort.current?.abort(), []);

  const track = useCallback(async (h: `0x${string}`) => {
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    let decided = false;
    await trackTx(h, (s: TxSnapshot) => {
      setLifecycle(s.lifecycle);
      setError(s.reverted ? "The contract rejected this action (it ran but returned an error). Nothing was recorded." : null);
      if (!decided && !s.reverted && (s.lifecycle.stage === "accepted" || s.lifecycle.finalized)) {
        decided = true;
        void qc.invalidateQueries();
        cb.current?.();
      }
    }, ac.signal);
    void qc.invalidateQueries();
  }, [qc]);

  const run = useCallback(async (send: () => Promise<`0x${string}`>) => {
    setError(null);
    setHash(null);
    setLifecycle(LIFECYCLE_WALLET);
    try {
      const h = await send();
      setHash(h);
      setLifecycle(LIFECYCLE_SUBMITTED);
      void track(h);
      return h;
    } catch (e) {
      setError(humanizeError(e));
      setLifecycle(isUserRejection(e) ? LIFECYCLE_IDLE : lifecycleFailed(humanizeError(e)));
      return null;
    }
  }, [track]);

  const attach = useCallback((h: `0x${string}`) => { setHash(h); setError(null); setLifecycle(LIFECYCLE_SUBMITTED); void track(h); }, [track]);
  const reset = useCallback(() => { abort.current?.abort(); setHash(null); setError(null); setLifecycle(LIFECYCLE_IDLE); }, []);

  const busy = lifecycle.stage === "wallet" || lifecycle.stage === "submitted" || lifecycle.stage === "processing";
  return { lifecycle, hash, error, busy, run, reset, attach };
}

/** Remember a verdict tx hash per case so a refresh can resume tracking. */
export function saveVerdictHash(caseId: number, hash: string) {
  try { localStorage.setItem(`settleit:verdict-tx:${caseId}`, hash); } catch { /* storage unavailable */ }
}
export function loadVerdictHash(caseId: number): `0x${string}` | null {
  try {
    const v = localStorage.getItem(`settleit:verdict-tx:${caseId}`);
    return v && /^0x[0-9a-fA-F]{64}$/.test(v) ? (v as `0x${string}`) : null;
  } catch { return null; }
}
