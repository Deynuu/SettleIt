import { LIMITS } from "./constants";
import type { EvidenceDraft } from "./types";
import { sameAddress } from "./format";

export const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/;
const ZERO = /^0x0{40}$/;

export function validateRespondent(addr: string, claimant?: string | null): string | null {
  const a = addr.trim();
  if (!ADDRESS_RE.test(a)) return "Enter a full 0x wallet address (42 characters).";
  if (ZERO.test(a)) return "That is the zero address.";
  if (claimant && sameAddress(a, claimant)) return "You can't challenge your own wallet.";
  return null;
}

function len(s: string, max: number, name: string): string | null {
  const t = s.trim();
  if (!t) return `${name} is required.`;
  if (t.length > max) return `${name} must be ${max} characters or fewer.`;
  return null;
}

export const validateTitle = (s: string) => len(s, LIMITS.title, "Title");
export const validateQuestion = (s: string) => len(s, LIMITS.question, "Question");
export const validateStatement = (s: string) => len(s, LIMITS.statement, "Statement");

export function validateEvidence(items: EvidenceDraft[]): string | null {
  if (items.length > LIMITS.evidencePerSide) return `At most ${LIMITS.evidencePerSide} evidence items.`;
  for (const [i, e] of items.entries()) {
    const n = i + 1;
    if (!e.content.trim()) return `Evidence ${n} is empty.`;
    if (e.content.length > LIMITS.evidenceContent) return `Evidence ${n} is over ${LIMITS.evidenceContent} characters.`;
    if (e.caption.length > LIMITS.evidenceCaption) return `Evidence ${n} caption is too long.`;
    if (e.kind === "URL" && !/^https?:\/\/\S+$/i.test(e.content.trim())) return `Evidence ${n} must be an http(s) link.`;
  }
  return null;
}

/** Evidence JSON exactly as the contract expects. */
export function evidenceToJson(items: EvidenceDraft[]): string {
  return JSON.stringify(items.map((e) => ({ kind: e.kind, content: e.content.trim(), caption: e.caption.trim() })));
}
