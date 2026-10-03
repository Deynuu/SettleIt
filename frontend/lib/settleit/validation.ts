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

const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".lan", ".home", ".corp", ".intranet", ".arpa"];

/** Mirrors the contract's _validate_url. The contract is the authority; this only saves a wasted tx. */
export function validateUrl(raw: string): string | null {
  const u = raw.trim();
  if (!u) return "link is empty.";
  if (u.length > LIMITS.url) return `link must be ${LIMITS.url} characters or fewer.`;
  if (/[\u0000-\u0020\u007f]/.test(u)) return "link must not contain spaces or control characters.";
  if (!u.startsWith("https://")) return "only https:// links are accepted.";
  const rest = u.slice("https://".length);
  const ends = ["/", "?", "#"].map((c) => rest.indexOf(c)).filter((i) => i >= 0);
  const authority = ends.length ? rest.slice(0, Math.min(...ends)) : rest;
  if (!authority) return "link has no host.";
  if (authority.includes("@") || authority.includes(":")) return "links with credentials or a port are not accepted.";
  if (/[\[\]\\]/.test(authority)) return "link host is not valid.";
  const host = authority.toLowerCase();
  if (host === "localhost" || BLOCKED_SUFFIXES.some((s) => host.endsWith(s))) return "local or private hosts are not accepted.";
  const labels = host.split(".");
  if (labels.length < 2) return "link must use a public domain name.";
  for (const l of labels) {
    if (!l || l.length > 63 || l.startsWith("-") || l.endsWith("-") || !/^[a-z0-9-]+$/.test(l)) return "link host is not valid.";
  }
  if (/^\d+$/.test(labels[labels.length - 1])) return "IP addresses are not accepted; use a domain name.";
  return null;
}

export function validateEvidence(items: EvidenceDraft[]): string | null {
  if (items.length > LIMITS.evidencePerSide) return `At most ${LIMITS.evidencePerSide} evidence items.`;
  for (const [i, e] of items.entries()) {
    const n = i + 1;
    if (!e.content.trim()) return `Evidence ${n} is empty.`;
    if (e.content.length > LIMITS.evidenceContent) return `Evidence ${n} is over ${LIMITS.evidenceContent} characters.`;
    if (e.caption.length > LIMITS.evidenceCaption) return `Evidence ${n} caption is too long.`;
    if (e.kind === "URL") {
      const u = validateUrl(e.content);
      if (u) return `Evidence ${n}: ${u}`;
    }
  }
  return null;
}

export function validateGrounds(s: string): string | null {
  return len(s, LIMITS.reviewGrounds, "Review grounds");
}

/** Review evidence: 1..3 items, every item valid. */
export function validateReviewEvidence(items: EvidenceDraft[]): string | null {
  if (items.length === 0) return "A review needs at least one NEW piece of evidence.";
  if (items.length > LIMITS.reviewEvidence) return `At most ${LIMITS.reviewEvidence} evidence items for a review.`;
  return validateEvidence(items);
}

/** Evidence JSON exactly as the contract expects. */
export function evidenceToJson(items: EvidenceDraft[]): string {
  return JSON.stringify(items.map((e) => ({ kind: e.kind, content: e.content.trim(), caption: e.caption.trim() })));
}
