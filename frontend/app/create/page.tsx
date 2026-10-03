"use client";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CATEGORIES, COPY, LIMITS } from "@/lib/settleit/constants";
import { evidenceToJson, validateEvidence, validateQuestion, validateRespondent, validateStatement, validateTitle } from "@/lib/settleit/validation";
import type { Category, EvidenceDraft, Visibility } from "@/lib/settleit/types";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { createCaseSpec, getLastCaseId } from "@/lib/genlayer/contract";
import { useTxFlow } from "@/lib/genlayer/hooks";
import { CONTRACT_ADDRESS } from "@/lib/genlayer/config";
import { EvidenceEditor } from "@/components/EvidenceEditor";
import { TxTracker } from "@/components/TxTracker";

const DRAFT_KEY = "settleit:create-draft";
interface Draft { category: Category; visibility: Visibility; respondent: string; title: string; question: string; statement: string; evidence: EvidenceDraft[] }
const EMPTY: Draft = { category: "FRIENDS", visibility: "PUBLIC", respondent: "", title: "", question: "", statement: "", evidence: [] };
const STEPS = ["Court", "Other side", "The case", "Your side", "Evidence", "Visibility", "Review", "Sign"];

function Wizard() {
  const w = useWallet();
  const router = useRouter();
  const qp = useSearchParams();
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Draft>(EMPTY);
  const [ack, setAck] = useState(false);
  const [touched, setTouched] = useState(false);
  const flow = useTxFlow(() => { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) setD({ ...EMPTY, ...JSON.parse(raw) });
    } catch { /* ignore corrupt draft */ }
    const cat = qp.get("category");
    if (cat && CATEGORIES.some((c) => c.id === cat)) setD((p) => ({ ...p, category: cat as Category }));
  }, [qp]);
  useEffect(() => { try { localStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* storage unavailable */ } }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const errs: (string | null)[] = [
    null,
    validateRespondent(d.respondent, w.account),
    validateTitle(d.title) ?? validateQuestion(d.question),
    validateStatement(d.statement),
    validateEvidence(d.evidence),
    null, null, null,
  ];
  const err = errs[step];
  const next = () => { setTouched(true); if (!err) { setTouched(false); setStep((s) => Math.min(s + 1, STEPS.length - 1)); } };

  const submit = async () => {
    if (!w.account) return;
    const acct = w.account;
    await flow.start(createCaseSpec(acct, {
      category: d.category, visibility: d.visibility, respondent: d.respondent.trim(), title: d.title.trim(),
      question: d.question.trim(), statement: d.statement.trim(), evidenceJson: evidenceToJson(d.evidence),
    }));
  };

  useEffect(() => {
    if (flow.lifecycle.stage === "accepted" || flow.lifecycle.finalized) {
      if (w.account) void getLastCaseId(w.account).then((id) => { if (id > 0) router.push(`/case/${id}`); }).catch(() => undefined);
    }
  }, [flow.lifecycle.stage, flow.lifecycle.finalized, w.account, router]);

  const showErr = touched && err;
  return (
    <div className="stack">
      <h1>Start a case</h1>
      <p className="muted" aria-live="polite">Step {step + 1} of {STEPS.length}: {STEPS[step]}</p>
      <div className="panel stack">
        {step === 0 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label">Which court?</legend>
            <div className="grid two">
              {CATEGORIES.map((c) => (
                <label key={c.id} className="check panel" style={{ ["--accent" as string]: d.category === c.id ? c.accent : "var(--line)", cursor: "pointer", textTransform: "none" }}>
                  <input type="radio" name="cat" checked={d.category === c.id} onChange={() => set("category", c.id)} />
                  <span><strong>{c.emoji} {c.label}</strong><br /><span className="muted">{c.blurb}</span></span>
                </label>
              ))}
            </div>
          </fieldset>
        )}
        {step === 1 && (
          <div>
            <label htmlFor="resp">Their wallet address</label>
            <input id="resp" autoComplete="off" spellCheck={false} placeholder="0x…" value={d.respondent} onChange={(e) => set("respondent", e.target.value)} aria-invalid={!!showErr} aria-describedby="resp-h" />
            <p id="resp-h" className="hint">Only this wallet can respond. {COPY.walletWhy}</p>
          </div>
        )}
        {step === 2 && (
          <>
            <div>
              <label htmlFor="title">Title</label>
              <input id="title" maxLength={LIMITS.title} value={d.title} onChange={(e) => set("title", e.target.value)} />
              <div className="counter">{d.title.length}/{LIMITS.title}</div>
            </div>
            <div>
              <label htmlFor="q">The question for the jury</label>
              <textarea id="q" maxLength={LIMITS.question} style={{ minHeight: 90 }} value={d.question} onChange={(e) => set("question", e.target.value)} />
              <div className="counter">{d.question.length}/{LIMITS.question}</div>
            </div>
          </>
        )}
        {step === 3 && (
          <div>
            <label htmlFor="stmt">Your side</label>
            <textarea id="stmt" maxLength={LIMITS.statement} value={d.statement} onChange={(e) => set("statement", e.target.value)} />
            <div className="counter">{d.statement.length}/{LIMITS.statement}</div>
            <p className="hint">{COPY.jurisdiction}</p>
          </div>
        )}
        {step === 4 && <EvidenceEditor idPrefix="ev" items={d.evidence} onChange={(v) => set("evidence", v)} />}
        {step === 5 && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="label">Visibility</legend>
            {(["PUBLIC", "UNLISTED"] as Visibility[]).map((v) => (
              <div key={v} className="check" style={{ marginBottom: 10 }}>
                <input id={`vis-${v}`} type="radio" name="vis" checked={d.visibility === v} onChange={() => set("visibility", v)} />
                <label htmlFor={`vis-${v}`}><strong>{v === "PUBLIC" ? "Public" : "Unlisted"}</strong> — {v === "PUBLIC" ? "shown in the browse feed." : "not featured in the feed."}</label>
              </div>
            ))}
            <p className="hint">{COPY.unlisted}</p>
          </fieldset>
        )}
        {step === 6 && (
          <div className="stack">
            <h2>{d.title}</h2>
            <p>{d.question}</p>
            <p className="mono">vs {d.respondent}</p>
            <p>{d.statement}</p>
            <p className="muted">{d.evidence.length} evidence item(s) · {d.visibility === "PUBLIC" ? "Public" : "Unlisted"} · {d.category}</p>
          </div>
        )}
        {step === 7 && (
          <div className="stack">
            <p>{COPY.publishWarning}</p>
            <div className="check">
              <input id="ack" type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} />
              <label htmlFor="ack">I understand this may be permanent and publicly inspectable, and I have not included secrets or private identifying information.</label>
            </div>
            {!CONTRACT_ADDRESS && <p className="err" role="alert">Contract address is not configured.</p>}
            {!w.account ? (
              <button className="btn" onClick={w.connect}>Connect wallet</button>
            ) : !w.onStudionet ? (
              <button className="btn plasma" onClick={w.switchNetwork}>Switch to StudioNet</button>
            ) : (
              <button className="btn block" disabled={!ack || flow.busy || !CONTRACT_ADDRESS} onClick={submit}>Review &amp; file the case</button>
            )}
          </div>
        )}
        {showErr && <p className="err" role="alert">{err}</p>}
      </div>
      <TxTracker flow={flow} />
      <div className="row">
        {step > 0 && <button className="btn ghost" onClick={() => setStep(step - 1)}>Back</button>}
        {step < STEPS.length - 1 && <button className="btn" onClick={next}>Next</button>}
      </div>
    </div>
  );
}

export default function Create() {
  return <Suspense fallback={<p role="status">Loading…</p>}><Wizard /></Suspense>;
}
