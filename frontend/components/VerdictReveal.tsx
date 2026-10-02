import type { Verdict } from "@/lib/settleit/types";
import { FAVORED_LABEL, QUALITY_LABEL, REASON_CODE_LABEL, COPY } from "@/lib/settleit/constants";
import { ResponsibilityBar } from "./ResponsibilityBar";

export function VerdictReveal({ v, finalized }: { v: Verdict; finalized: boolean | null }) {
  if (!v.exists || !v.favoredParty) return null;
  const inconclusive = v.favoredParty === "INCONCLUSIVE";
  return (
    <section className="panel stack" aria-label="Verdict">
      <div className="eyebrow">{COPY.spoken}</div>
      <div className="verdict-banner">{FAVORED_LABEL[v.favoredParty]}</div>
      <p className="muted">
        {finalized === true ? COPY.finalized : finalized === false ? COPY.accepted : "Recorded on GenLayer. Check the transaction for its finality status."}
      </p>
      {!inconclusive && <ResponsibilityBar claimantFault={v.claimantFault} respondentFault={v.respondentFault} />}
      <p>{v.summary}</p>
      {v.remedy && <p><strong>Suggested remedy:</strong> {v.remedy}</p>}
      <div>
        {v.confidence && <span className="chip">Confidence {v.confidence}</span>}
        {v.evidenceQuality && <span className="chip">Evidence {QUALITY_LABEL[v.evidenceQuality]}</span>}
        {v.reasonCodes.map((r) => <span key={r} className="chip">{REASON_CODE_LABEL[r] ?? r}</span>)}
      </div>
      <p className="hint">{COPY.jurisdiction}</p>
    </section>
  );
}
