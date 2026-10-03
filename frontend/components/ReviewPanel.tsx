"use client";
import { useState } from "react";
import { LIMITS } from "@/lib/settleit/constants";
import { evidenceToJson, validateGrounds, validateReviewEvidence } from "@/lib/settleit/validation";
import type { CaseDetail, EvidenceDraft } from "@/lib/settleit/types";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { reviewSpec } from "@/lib/genlayer/contract";
import { reviewTxKey, loadTxHash, useTxFlow } from "@/lib/genlayer/hooks";
import { EvidenceEditor } from "./EvidenceEditor";
import { TxTracker } from "./TxTracker";
import { useEffect } from "react";

/** The only way to challenge a verdict: one round, parties only, new evidence required. */
export function ReviewPanel({ c }: { c: CaseDetail }) {
  const w = useWallet();
  const flow = useTxFlow();
  const [grounds, setGrounds] = useState("");
  const [evid, setEvid] = useState<EvidenceDraft[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const h = loadTxHash(reviewTxKey(c.id));
    if (h && flow.lifecycle.stage === "idle") flow.attach(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.id]);

  const submit = () => {
    const e = validateGrounds(grounds) ?? validateReviewEvidence(evid);
    setErr(e);
    if (e || !w.account) return;
    void flow.start(reviewSpec(w.account, c.id, grounds.trim(), evidenceToJson(evid)));
  };

  return (
    <section className="panel stack" aria-label="Request review" data-testid="review-panel">
      <div className="eyebrow">One review round</div>
      <h2>Think the jury missed something?</h2>
      <p className="muted">A review needs at least one <strong>new</strong> piece of evidence. It produces a second verdict stored next to the original — the original is never replaced, and there is no administrator who can override either.</p>
      <div>
        <label htmlFor="rv-grounds">Grounds for review</label>
        <textarea id="rv-grounds" maxLength={LIMITS.reviewGrounds} value={grounds} onChange={(e) => setGrounds(e.target.value)} />
        <div className="counter">{grounds.length}/{LIMITS.reviewGrounds}</div>
      </div>
      <EvidenceEditor idPrefix="rv" items={evid} onChange={setEvid} max={LIMITS.reviewEvidence} />
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn block" disabled={flow.busy || !w.account} onClick={submit} data-testid="review-submit">Review &amp; request review</button>
      <TxTracker flow={flow} />
    </section>
  );
}
