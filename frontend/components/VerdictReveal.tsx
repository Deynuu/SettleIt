import type { Verdict } from "@/lib/settleit/types";
import { FAVORED_LABEL, QUALITY_LABEL, REASON_CODE_LABEL, BASIS_LABEL, COPY } from "@/lib/settleit/constants";
import { ResponsibilityBar } from "./ResponsibilityBar";

/** One verdict record. Consensus-bound fields and leader-written text are visibly separated. */
export function VerdictReveal({ v, finalized, title }: { v: Verdict; finalized: boolean | null; title?: string }) {
  if (!v.exists || !v.favoredParty) return null;
  const inconclusive = v.favoredParty === "INCONCLUSIVE";
  const round = v.round === 2 ? "Review verdict (round 2)" : "Original verdict (round 1)";
  return (
    <section className="panel stack" aria-label={title ?? round} data-testid={`verdict-round-${v.round}`}>
      <div className="eyebrow">{title ?? round} · {COPY.spoken}</div>

      <div className="stack" data-testid="verdict-consensus">
        <p className="hint"><strong>Consensus-bound.</strong> {COPY.consensusBound}</p>
        <div className="verdict-banner">{FAVORED_LABEL[v.favoredParty]}</div>
        <p className="muted">
          {finalized === true ? COPY.finalized : finalized === false ? COPY.accepted : "Recorded on GenLayer. Check the transaction for its finality status."}
        </p>
        {!inconclusive && <ResponsibilityBar claimantFault={v.claimantFault} respondentFault={v.respondentFault} />}
        <div>
          {v.confidence && <span className="chip">Confidence {v.confidence}</span>}
          {v.evidenceQuality && <span className="chip">Evidence {QUALITY_LABEL[v.evidenceQuality]}</span>}
          {v.primaryReason && <span className="chip">Primary reason: {REASON_CODE_LABEL[v.primaryReason] ?? v.primaryReason}</span>}
          {inconclusive && v.insufficiencyBasis && v.insufficiencyBasis !== "NONE" && (
            <span className="chip">Why not enough: {BASIS_LABEL[v.insufficiencyBasis] ?? v.insufficiencyBasis}</span>
          )}
        </div>
        {v.evidenceDigest ? (
          <details>
            <summary>Evidence the validators saw (SHA-256 digest)</summary>
            <p className="mono" data-testid="evidence-digest">{v.evidenceDigest}</p>
            <ul>{v.evidenceSources.map((s) => <li key={s.url} className="mono">{s.url}<br />sha256 {s.sha256}</li>)}</ul>
            <p className="hint">Each hash is of the normalized page text (whitespace collapsed, first 6000 characters). Validators had to fetch identical text for this verdict to be accepted. It proves what they saw, not that the page is true.</p>
          </details>
        ) : (
          <p className="hint">No link evidence was fetched for this verdict.</p>
        )}
      </div>

      <div className="stack panel ink" data-testid="verdict-nonauth">
        <p className="hint"><strong>Non-authoritative suggestions.</strong> {COPY.nonAuthoritative}</p>
        <p>{v.summary}</p>
        {v.remedy && <p><strong>Suggested remedy:</strong> {v.remedy}</p>}
        {v.secondaryReasonCodes.length > 0 && (
          <div>{v.secondaryReasonCodes.map((r) => <span key={r} className="chip">{REASON_CODE_LABEL[r] ?? r} (suggested)</span>)}</div>
        )}
      </div>
      <p className="hint">{COPY.jurisdiction}</p>
    </section>
  );
}
