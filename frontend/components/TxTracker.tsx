import { trackerStates, type Lifecycle } from "@/lib/settleit/protocol";
import { shortHash } from "@/lib/settleit/format";
import { txUrl } from "@/lib/genlayer/config";

export function TxTracker({ lifecycle, hash, error }: { lifecycle: Lifecycle; hash: string | null; error?: string | null }) {
  if (lifecycle.stage === "idle" && !error) return null;
  const steps = trackerStates(lifecycle);
  return (
    <section className="panel ink stack" aria-label="Transaction progress">
      <div className="eyebrow">Transaction</div>
      <h3>{lifecycle.label}</h3>
      <p aria-live="polite" role="status">{lifecycle.detail}</p>
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.id} className="step" data-state={s.state}>
            <span className="dot" aria-hidden="true" />
            <span>{s.label}</span>
            <span className="sr-only"> — {s.state}</span>
          </li>
        ))}
      </ol>
      {lifecycle.provisional && (
        <p className="muted">Accepted is provisional. It becomes final only when GenLayer reports Finalized.</p>
      )}
      {lifecycle.stage === "undetermined" && (
        <p className="muted">Undetermined means validators could not agree this round. Nothing was recorded; you can try again.</p>
      )}
      {hash && (
        <p className="mono">Tx <a href={txUrl(hash)} target="_blank" rel="noreferrer noopener">{shortHash(hash)}</a></p>
      )}
      {error && <p className="err" role="alert">{error}</p>}
    </section>
  );
}
