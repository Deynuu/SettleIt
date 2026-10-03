import { trackerStates } from "@/lib/settleit/protocol";
import { shortHash } from "@/lib/settleit/format";
import { txUrl } from "@/lib/genlayer/config";
import type { TxFlow } from "@/lib/genlayer/hooks";

/** Shows exactly what the network reports, the pre-sign plan with fee info, and recovery actions. */
export function TxTracker({ flow }: { flow: TxFlow }) {
  const { lifecycle, hash, error, plan } = flow;
  if (lifecycle.stage === "idle" && !error) return null;
  const steps = trackerStates(lifecycle);
  const recoverable = flow.canRetry;
  return (
    <section className="panel ink stack" aria-label="Transaction progress" data-testid="tx-tracker" data-stage={lifecycle.stage}>
      <div className="eyebrow">Transaction</div>
      <h3>{lifecycle.label}</h3>
      <p aria-live="polite" role="status">{lifecycle.detail}</p>

      {plan && (
        <div className="stack" data-testid="tx-plan">
          <p><strong>{plan.summary}</strong></p>
          <p className="muted">{plan.simulated ? "Simulation passed on StudioNet." : "This node did not offer a simulation; the contract will still validate everything when you sign."}</p>
          <p className="muted" data-testid="tx-fee">{plan.feeText}</p>
          {plan.feeRaw && <details><summary>Fee details</summary><pre className="mono">{JSON.stringify(plan.feeRaw, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2)}</pre></details>}
          <div className="row">
            <button className="btn" onClick={() => void flow.confirm()} data-testid="tx-confirm">Confirm and open wallet</button>
            <button className="btn ghost" onClick={flow.cancel}>Cancel</button>
          </div>
        </div>
      )}

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
        <p className="muted">Accepted is provisional. It becomes final only when GenLayer reports Finalized. The page re-reads the contract when that happens.</p>
      )}
      {lifecycle.stage === "undetermined" && (
        <p className="muted">Undetermined means validators could not agree this round. Nothing was recorded; you can try again.</p>
      )}
      {lifecycle.stage === "canceled" && <p className="muted">GenLayer cancelled this transaction. Nothing was recorded.</p>}
      {lifecycle.stage === "timeout" && <p className="muted">The network timed out on this transaction. Nothing was recorded; you can try again.</p>}
      {hash && (
        <p className="mono">Tx <a href={txUrl(hash)} target="_blank" rel="noreferrer noopener" data-testid="tx-link">{shortHash(hash)}</a> · <span>{hash}</span></p>
      )}
      {error && <p className="err" role="alert">{error}</p>}
      {recoverable && <button className="btn plasma" onClick={() => void flow.retry()} data-testid="tx-retry">Check again and retry</button>}
    </section>
  );
}
