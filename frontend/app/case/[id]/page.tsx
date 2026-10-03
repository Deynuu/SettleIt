"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { COPY, STATUS_LABEL, categoryInfo } from "@/lib/settleit/constants";
import { caseNumber, sameAddress, shortAddress } from "@/lib/settleit/format";
import { challengeText, verdictText } from "@/lib/settleit/share";
import { evidenceToJson, validateEvidence, validateStatement } from "@/lib/settleit/validation";
import type { EvidenceDraft } from "@/lib/settleit/types";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { loadTxHash, saveTxHash, verdictTxKey, useCase, useEvidence, useReview, useTxFlow, useVerdict } from "@/lib/genlayer/hooks";
import { expireSpec, respondSpec, verdictSpec } from "@/lib/genlayer/contract";
import { LIMITS } from "@/lib/settleit/constants";
import { TxTracker } from "@/components/TxTracker";
import { VerdictReveal } from "@/components/VerdictReveal";
import { VotePanel } from "@/components/VotePanel";
import { ShareButtons } from "@/components/ShareButtons";
import { EvidenceEditor } from "@/components/EvidenceEditor";
import { ReviewPanel } from "@/components/ReviewPanel";
import { HistoryPanel } from "@/components/HistoryPanel";

export default function CasePage() {
  const params = useParams<{ id: string }>();
  const id = Number(params.id);
  const valid = Number.isInteger(id) && id > 0;
  const w = useWallet();
  const c = useCase(id, true);
  const ev = useEvidence(id);
  const hasVerdict = c.data?.hasVerdict ?? false;
  const verdict = useVerdict(id, c.data?.status === "READY");
  const review = useReview(id, c.data?.hasReview ?? false);
  const respondFlow = useTxFlow();
  const verdictFlow = useTxFlow();
  const expireFlow = useTxFlow();
  const [statement, setStatement] = useState("");
  const [evid, setEvid] = useState<EvidenceDraft[]>([]);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [manual, setManual] = useState("");

  // Resume tracking of a previously-submitted verdict tx after refresh.
  useEffect(() => {
    if (!valid) return;
    const h = loadTxHash(verdictTxKey(id));
    if (h && verdictFlow.lifecycle.stage === "idle") verdictFlow.attach(h);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, valid]);

  if (!valid) return <div className="panel alert"><h1>Bad case link</h1><p>That isn’t a valid case number.</p></div>;
  if (c.isLoading) return <p role="status">Loading {caseNumber(id)}…</p>;
  if (c.isError || !c.data) return <div className="panel alert"><h1>Case not found</h1><p>{caseNumber(id)} doesn’t exist, or StudioNet couldn’t be reached.</p></div>;

  const k = c.data;
  const cat = categoryInfo(k.category);
  const isClaimant = sameAddress(w.account, k.claimant);
  const isRespondent = sameAddress(w.account, k.respondent);
  const isParty = isClaimant || isRespondent;
  const claimEv = (ev.data ?? []).filter((e) => e.party === "CLAIMANT");
  const respEv = (ev.data ?? []).filter((e) => e.party === "RESPONDENT");
  const finalized: boolean | null = verdictFlow.lifecycle.finalized ? true : verdictFlow.hash ? false : null;
  const nowSec = Math.floor(Date.now() / 1000);
  const windowOpen = nowSec <= k.responseDeadline; // contract is the authority; this only disables a doomed click
  const deadlineText = k.responseDeadline ? new Date(k.responseDeadline * 1000).toUTCString() : "";

  const doRespond = async () => {
    const e = validateStatement(statement) ?? validateEvidence(evid);
    setFormErr(e);
    if (e || !w.account) return;
    const acct = w.account;
    await respondFlow.start(respondSpec(acct, id, statement.trim(), evidenceToJson(evid)));
  };
  const doVerdict = async () => {
    if (!w.account) return;
    await verdictFlow.start(verdictSpec(w.account, id));
  };
  const doExpire = async () => {
    if (!w.account) return;
    await expireFlow.start(expireSpec(w.account, id));
  };
  const attachManual = () => {
    if (/^0x[0-9a-fA-F]{64}$/.test(manual.trim())) { saveTxHash(verdictTxKey(id), manual.trim()); verdictFlow.attach(manual.trim() as `0x${string}`); }
  };

  const EvList = ({ items }: { items: typeof claimEv }) => (
    <ul>{items.map((e) => <li key={e.id}><strong>{e.caption || e.kind}</strong>: {e.kind === "URL" ? <a href={e.content} target="_blank" rel="noreferrer noopener nofollow">{e.content}</a> : e.content}</li>)}</ul>
  );

  return (
    <div className="stack">
      <div className="panel stack" style={{ ["--accent" as string]: cat.accent }}>
        <div className="eyebrow">{caseNumber(k.id)} · {cat.emoji} {cat.label} · {k.visibility === "PUBLIC" ? "Public" : "Unlisted"}</div>
        <h1>{k.title}</h1>
        <p style={{ fontSize: "1.1rem" }}>{k.question}</p>
        <p className="mono muted">Claimant {shortAddress(k.claimant)} vs Respondent {shortAddress(k.respondent)}</p>
        <div>
          <span className="chip" data-testid="case-status">{STATUS_LABEL[k.status] ?? k.status}</span>
          {isParty && <span className="chip">You are the {isClaimant ? "claimant" : "respondent"}</span>}
        </div>
        {!k.responded && k.status === "AWAITING_RESPONSE" && deadlineText && (
          <p className="muted" data-testid="deadline">Respond by {deadlineText} (inclusive). After that either party may close the case as unanswered.</p>
        )}
      </div>

      <section className="panel stack" aria-label="Claimant side">
        <h2>Claimant’s side</h2>
        <p>{k.claimantStatement}</p>
        {claimEv.length > 0 && <EvList items={claimEv} />}
      </section>

      {k.responded ? (
        <section className="panel ink stack" aria-label="Respondent side">
          <h2>Respondent’s side</h2>
          <p>{k.respondentStatement}</p>
          {respEv.length > 0 && <EvList items={respEv} />}
        </section>
      ) : isRespondent ? (
        <section className="panel stack" aria-label="Respond">
          <div className="eyebrow">{COPY.challenged}</div>
          <h2>{COPY.challengedSub}</h2>
          <div>
            <label htmlFor="resp-stmt">Your side</label>
            <textarea id="resp-stmt" maxLength={LIMITS.statement} value={statement} onChange={(e) => setStatement(e.target.value)} />
            <div className="counter">{statement.length}/{LIMITS.statement}</div>
          </div>
          <EvidenceEditor idPrefix="rev" items={evid} onChange={setEvid} />
          {formErr && <p className="err" role="alert">{formErr}</p>}
          <button className="btn block" disabled={respondFlow.busy || !windowOpen} onClick={doRespond} data-testid="respond-submit">Review &amp; lock in my response</button>
          {!windowOpen && <p className="err" role="alert">The response window has closed.</p>}
          {!w.onStudionet && <button className="btn plasma" onClick={w.switchNetwork}>Switch to StudioNet</button>}
          <TxTracker flow={respondFlow} />
        </section>
      ) : k.status === "EXPIRED" ? (
        <section className="panel stack" aria-label="Expired">
          <h2>Closed without a response</h2>
          <p className="muted">The respondent did not answer before the deadline. This case is closed and cannot be judged.</p>
        </section>
      ) : (
        <section className="panel stack">
          <h2>Waiting for the respondent</h2>
          <p className="muted">Only {shortAddress(k.respondent)} can respond. Share the link below.</p>
          {!w.account && <button className="btn" onClick={w.connect}>Connect wallet</button>}
          {isParty && !windowOpen && (
            <>
              <button className="btn ghost" disabled={expireFlow.busy} onClick={doExpire} data-testid="expire-submit">Close as unanswered</button>
              <TxTracker flow={expireFlow} />
            </>
          )}
        </section>
      )}

      {k.status === "READY" && (
        <section className="panel stack" aria-label="Request verdict">
          <div className="eyebrow">{verdictFlow.busy ? COPY.deliberating : COPY.locked}</div>
          <h2>{verdictFlow.busy ? COPY.deliberating : COPY.locked}</h2>
          <p className="muted">{COPY.jurisdiction}</p>
          {isParty ? (
            <button className="btn block" disabled={verdictFlow.busy} onClick={doVerdict} data-testid="verdict-submit">Review &amp; summon the jury</button>
          ) : <p className="muted">Only the two parties can summon the jury.</p>}
        </section>
      )}

      <TxTracker flow={verdictFlow} />

      {hasVerdict && verdict.data && <VerdictReveal v={verdict.data} finalized={k.hasReview ? null : finalized} />}
      {k.hasReview && review.data && <VerdictReveal v={review.data} finalized={null} />}
      {k.hasReview && (
        <p className="hint" data-testid="review-note">Review requested by the {k.reviewRequestedBy?.toLowerCase()}. Grounds (a party’s argument, not a finding): “{k.reviewGrounds}”. Both verdicts are preserved.</p>
      )}
      {k.status === "VERDICT_RECORDED" && isParty && <ReviewPanel c={k} />}
      {hasVerdict && finalized === null && (
        <section className="panel stack" aria-label="Finality check">
          <h3>Check finality</h3>
          <p className="muted">Paste the verdict transaction hash to see whether it has been Finalized.</p>
          <label htmlFor="mh">Transaction hash</label>
          <input id="mh" className="mono" value={manual} onChange={(e) => setManual(e.target.value)} placeholder="0x…" />
          <button className="btn ghost" onClick={attachManual}>Track</button>
        </section>
      )}

      {hasVerdict && <VotePanel c={k} verdict={k.hasReview ? review.data : verdict.data} />}

      <HistoryPanel id={k.id} />

      <section className="panel stack" aria-label="Share">
        <h2>Share</h2>
        <ShareButtons id={k.id} text={hasVerdict && verdict.data?.exists && verdict.data.favoredParty ? verdictText(k, verdict.data, finalized === true) : challengeText(k)} />
        <p className="hint">{COPY.unlisted}</p>
      </section>
    </div>
  );
}
