"use client";
import type { EvidenceDraft } from "@/lib/settleit/types";
import { COPY, LIMITS } from "@/lib/settleit/constants";
import { validateUrl } from "@/lib/settleit/validation";

export function EvidenceEditor({ idPrefix, items, onChange, max = LIMITS.evidencePerSide }: { idPrefix: string; items: EvidenceDraft[]; onChange: (v: EvidenceDraft[]) => void; max?: number }) {
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
              <option value="URL">Link (validators fetch it at verdict time)</option>
            </select>
          </div>
          <div>
            <label htmlFor={`${idPrefix}-c-${i}`}>Content</label>
            {e.kind === "URL" && e.content.trim() !== "" && validateUrl(e.content) && (
              <p className="err" role="alert" data-testid="url-error">{validateUrl(e.content)}</p>
            )}
            <textarea id={`${idPrefix}-c-${i}`} maxLength={e.kind === "URL" ? LIMITS.url : LIMITS.evidenceContent} value={e.content} onChange={(ev) => set(i, { content: ev.target.value })} />
          </div>
          <div>
            <label htmlFor={`${idPrefix}-p-${i}`}>Caption (optional)</label>
            <input id={`${idPrefix}-p-${i}`} maxLength={LIMITS.evidenceCaption} value={e.caption} onChange={(ev) => set(i, { caption: ev.target.value })} />
          </div>
          <button type="button" className="btn ghost" onClick={() => onChange(items.filter((_, k) => k !== i))}>Remove evidence {i + 1}</button>
        </fieldset>
      ))}
      {items.length < max && (
        <button type="button" className="btn ghost" onClick={() => onChange([...items, { kind: "TEXT", content: "", caption: "" }])}>+ Add evidence</button>
      )}
      <p className="hint">{COPY.linkEvidence} Paste the important parts as text too — a page can change or disappear.</p>
    </div>
  );
}
