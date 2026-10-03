"use client";
import { useHistory } from "@/lib/genlayer/hooks";
import { shortAddress } from "@/lib/settleit/format";

/** Append-only log of every state transition, read straight from the contract. */
export function HistoryPanel({ id }: { id: number }) {
  const h = useHistory(id);
  return (
    <section className="panel stack" aria-label="Case history" data-testid="history-panel">
      <div className="eyebrow">On-chain history</div>
      <h2>Every transition, publicly readable</h2>
      {h.isLoading ? <p role="status">Reading…</p> : h.data && h.data.length ? (
        <ol>
          {h.data.map((e) => (
            <li key={e.seq}><strong>{e.action}</strong> · <span className="mono">{shortAddress(e.actor)}</span> · <span className="mono">{e.at}</span>{e.detail ? <> · <span className="muted">{e.detail}</span></> : null}</li>
          ))}
        </ol>
      ) : <p className="muted">No history available.</p>}
    </section>
  );
}
