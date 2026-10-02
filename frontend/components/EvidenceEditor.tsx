"use client";
import type { EvidenceDraft } from "@/lib/settleit/types";
import { LIMITS } from "@/lib/settleit/constants";

export function EvidenceEditor({ idPrefix, items, onChange }: { idPrefix: string; items: EvidenceDraft[]; onChange: (v: EvidenceDraft[]) => void }) {
  const set = (i: number, p: Partial<EvidenceDraft>) => onChange(items.map((e, k) => (k === i ? { ...e, ...p } : e)));
  return (
    <div className="stack">
      {items.map((e, i) => (
        <fieldset key={i} className="panel ink stack" style={{ border: 0 }}>
          <legend className="sr-only">Evidence {i + 1}</legend>
          <div>
            <label htmlFor={`${idPrefix}-k-${i}`}>Type</label>
            <select id={`${idPrefix}-k-${i}`} value={e.kind} onChange={(ev) => set(i, { kind: ev.target.value as EvidenceDraft["kind"] })}>
              <option value="TEXT">Text (what a message/receipt says)</option>
              <option value="URL">Link (never opened by the jury)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-c-${i}`}>Content</label>
            <textarea id={`${idPrefix}-c-${i}`} maxLength={LIMITS.evidenceContent} value={e.content} onChange={(ev) => set(i, { content: ev.target.value })} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-p-${i}`}>Caption (optional)</label>
            <input id={`${idPrefix}-p-${i}`} maxLength={LIMITS.evidenceCaption} value={e.caption} onChange={(ev) => set(i, { caption: ev.target.value })} />
          </div>
          <button type="button" className="btn ghost" onClick={() => onChange(items.filter((_, k) => k !== i))}>Remove evidence {i + 1}</button>
        </fieldset>
      ))}
      {items.length < LIMITS.evidencePerSide && (
        <button type="button" className="btn ghost" onClick={() => onChange([...items, { kind: "TEXT", content: "", caption: "" }])}>+ Add evidence</button>
      )}
      <p className="hint">Links are shown to people but the jury never fetches them — paste what matters as text.</p>
    </div>
  );
}
