/**
 * Defensive parsing of contract view results.
 *
 * genlayer-js returns calldata maps as plain objects (jsonSafeReturn) but we also accept
 * `Map`s so a different SDK setting can't break the UI. Anything unexpected falls back to
 * a safe default instead of throwing in render.
 */
import type {
  CaseDetail,
  CaseStatus,
  CaseSummary,
  Category,
  ConfidenceBucket,
  Evidence,
  EvidenceKind,
  EvidenceQuality,
  FavoredParty,
  Party,
  Verdict,
  Visibility,
  VoteSummary,
} from "./types";

export function toPlain(value: unknown): unknown {
  if (value instanceof Map) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of value.entries()) out[String(k)] = toPlain(v);
    return out;
  }
  if (Array.isArray(value)) return value.map(toPlain);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = toPlain(v);
    return out;
  }
  if (typeof value === "bigint") {
    return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value.toString();
  }
  return value;
}

type Rec = Record<string, unknown>;

function asRec(value: unknown): Rec {
  const p = toPlain(value);
  return p && typeof p === "object" && !Array.isArray(p) ? (p as Rec) : {};
}
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
const num = (v: unknown, d = 0): number => (typeof v === "number" && Number.isFinite(v) ? v : d);
const bool = (v: unknown, d = false): boolean => (typeof v === "boolean" ? v : d);

function oneOf<T extends string>(v: unknown, allowed: readonly T[]): T | null {
  return typeof v === "string" && (allowed as readonly string[]).includes(v) ? (v as T) : null;
}

const CATEGORY_IDS = ["RELATIONSHIPS", "FRIENDS", "ROOMMATES", "FAMILY", "MONEY", "WORK", "GAMING", "CRYPTO", "PETTY"] as const;
const STATUSES = ["AWAITING_RESPONSE", "READY", "VERDICT_RECORDED"] as const;
const FAVORED = ["CLAIMANT", "RESPONDENT", "SPLIT", "INCONCLUSIVE"] as const;
const CONFIDENCE = ["LOW", "MEDIUM", "HIGH"] as const;
const QUALITY = ["WEAK", "MIXED", "STRONG"] as const;

export function parseCaseSummary(raw: unknown): CaseSummary {
  const r = asRec(raw);
  const category: Category = oneOf(r.category, CATEGORY_IDS) ?? "PETTY";
  const visibility: Visibility = r.visibility === "UNLISTED" ? "UNLISTED" : "PUBLIC";
  const status: CaseStatus = oneOf(r.status, STATUSES) ?? "AWAITING_RESPONSE";
  return {
    id: num(r.id),
    claimant: str(r.claimant),
    respondent: str(r.respondent),
    category,
    visibility,
    title: str(r.title),
    question: str(r.question),
    status,
    hasVerdict: bool(r.has_verdict),
    favoredParty: oneOf(r.favored_party, FAVORED),
    totalVotes: num(r.total_votes),
  };
}

export function parseCaseList(raw: unknown): CaseSummary[] {
  const p = toPlain(raw);
  return Array.isArray(p) ? p.map(parseCaseSummary) : [];
}

export function parseCaseDetail(raw: unknown): CaseDetail {
  const r = asRec(raw);
  return {
    ...parseCaseSummary(raw),
    claimantStatement: str(r.claimant_statement),
    respondentStatement: str(r.respondent_statement),
    responded: bool(r.responded),
    claimantEvidenceCount: num(r.claimant_evidence_count),
    respondentEvidenceCount: num(r.respondent_evidence_count),
    verdictVersion: num(r.verdict_version),
  };
}

export function parseEvidenceList(raw: unknown): Evidence[] {
  const p = toPlain(raw);
  if (!Array.isArray(p)) return [];
  return p.map((item) => {
    const r = asRec(item);
    const party: Party = r.party === "RESPONDENT" ? "RESPONDENT" : "CLAIMANT";
    const kind: EvidenceKind = r.kind === "URL" ? "URL" : "TEXT";
    return {
      id: num(r.id),
      caseId: num(r.case_id),
      party,
      kind,
      content: str(r.content),
      caption: str(r.caption),
    };
  });
}

export function parseVerdict(raw: unknown): Verdict {
  const r = asRec(raw);
  if (!bool(r.exists)) {
    return {
      exists: false,
      version: 0,
      favoredParty: null,
      claimantFault: 0,
      respondentFault: 0,
      confidence: null,
      evidenceQuality: null,
      reasonCodes: [],
      summary: "",
      remedy: "",
    };
  }
  const codes = Array.isArray(r.reason_codes) ? r.reason_codes.filter((c): c is string => typeof c === "string") : [];
  const confidence: ConfidenceBucket | null = oneOf(r.confidence_bucket, CONFIDENCE);
  const quality: EvidenceQuality | null = oneOf(r.evidence_quality, QUALITY);
  const favored: FavoredParty | null = oneOf(r.favored_party, FAVORED);
  return {
    exists: true,
    version: num(r.version),
    favoredParty: favored,
    claimantFault: num(r.claimant_fault),
    respondentFault: num(r.respondent_fault),
    confidence,
    evidenceQuality: quality,
    reasonCodes: codes,
    summary: str(r.summary),
    remedy: str(r.remedy),
  };
}

export function parseVoteSummary(raw: unknown): VoteSummary {
  const r = asRec(raw);
  return {
    claimant: num(r.claimant),
    respondent: num(r.respondent),
    split: num(r.split),
    insufficient: num(r.insufficient),
    total: num(r.total),
    juryMatchPct: typeof r.jury_match_pct === "number" ? r.jury_match_pct : null,
  };
}
