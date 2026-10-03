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
  EvidenceSource,
  HistoryEvent,
  InsufficiencyBasis,
  ProtocolInfo,
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
const STATUSES = ["AWAITING_RESPONSE", "READY", "VERDICT_RECORDED", "REVIEWED", "EXPIRED"] as const;
const BASES = ["MISSING_EVIDENCE", "CONTRADICTORY_EVIDENCE", "UNVERIFIABLE_CLAIMS", "AMBIGUOUS_TERMS", "NONE"] as const;
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
    hasReview: bool(r.has_review),
    operativeRound: num(r.operative_round),
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
    evidenceTotal: num(r.evidence_total),
    verdictVersion: num(r.verdict_version),
    createdAt: str(r.created_at),
    responseDeadline: num(r.response_deadline),
    reviewRequestedBy: r.review_requested_by === "CLAIMANT" || r.review_requested_by === "RESPONDENT" ? r.review_requested_by : null,
    reviewGrounds: str(r.review_grounds),
    eventCount: num(r.event_count),
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
      round: num(r.round, 1),
      party,
      kind,
      content: str(r.content),
      caption: str(r.caption),
    };
  });
}

const EMPTY_VERDICT: Verdict = {
  exists: false, round: 0, version: 0, requestedBy: "", recordedAt: "", favoredParty: null,
  claimantFault: 0, respondentFault: 0, confidence: null, evidenceQuality: null, primaryReason: "",
  insufficiencyBasis: null, evidenceDigest: "", evidenceSources: [], secondaryReasonCodes: [],
  summary: "", remedy: "", nonAuthoritativeFields: [], reasonCodes: [],
};

const strList = (v: unknown): string[] => (Array.isArray(v) ? v.filter((c): c is string => typeof c === "string") : []);

export function parseVerdict(raw: unknown): Verdict {
  const r = asRec(raw);
  if (!bool(r.exists)) return { ...EMPTY_VERDICT, round: num(r.round) };
  const sources: EvidenceSource[] = Array.isArray(toPlain(r.evidence_sources))
    ? (toPlain(r.evidence_sources) as unknown[]).map((s) => { const o = asRec(s); return { url: str(o.url), sha256: str(o.sha256) }; })
    : [];
  const primary = str(r.primary_reason);
  const secondary = strList(r.secondary_reason_codes);
  return {
    exists: true,
    round: num(r.round, 1),
    version: num(r.version),
    requestedBy: str(r.requested_by),
    recordedAt: str(r.recorded_at),
    favoredParty: oneOf(r.favored_party, FAVORED),
    claimantFault: num(r.claimant_fault),
    respondentFault: num(r.respondent_fault),
    confidence: oneOf(r.confidence_bucket, CONFIDENCE),
    evidenceQuality: oneOf(r.evidence_quality, QUALITY),
    primaryReason: primary,
    insufficiencyBasis: oneOf(r.insufficiency_basis, BASES) as InsufficiencyBasis | null,
    evidenceDigest: str(r.evidence_digest),
    evidenceSources: sources,
    secondaryReasonCodes: secondary,
    summary: str(r.summary),
    remedy: str(r.remedy),
    nonAuthoritativeFields: strList(r.non_authoritative_fields),
    reasonCodes: primary ? [primary, ...secondary] : secondary,
  };
}

export function parseHistory(raw: unknown): HistoryEvent[] {
  const p = toPlain(raw);
  if (!Array.isArray(p)) return [];
  return p.map((x) => { const r = asRec(x); return { seq: num(r.seq), action: str(r.action), actor: str(r.actor), at: str(r.at), detail: str(r.detail) }; });
}

export function parseProtocolInfo(raw: unknown): ProtocolInfo {
  const r = asRec(raw);
  return {
    contractVersion: str(r.contract_version),
    adminPowers: bool(r.admin_powers, true),
    verdictOverridePossible: bool(r.verdict_override_possible, true),
    communityVotesAuthoritative: bool(r.community_votes_authoritative, true),
    responseWindowSeconds: num(r.response_window_seconds),
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
    authoritative: bool(r.authoritative, false),
  };
}
