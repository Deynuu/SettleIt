/** Domain types mirroring the Settleit contract views (see contracts/settleit.py). */

export type Category =
  | "RELATIONSHIPS"
  | "FRIENDS"
  | "ROOMMATES"
  | "FAMILY"
  | "MONEY"
  | "WORK"
  | "GAMING"
  | "CRYPTO"
  | "PETTY";

export type Visibility = "PUBLIC" | "UNLISTED";

export type CaseStatus = "AWAITING_RESPONSE" | "READY" | "VERDICT_RECORDED" | "REVIEWED" | "EXPIRED";

export type FavoredParty = "CLAIMANT" | "RESPONDENT" | "SPLIT" | "INCONCLUSIVE";

export type VoteChoice = "CLAIMANT" | "RESPONDENT" | "SPLIT" | "INSUFFICIENT";

export type ConfidenceBucket = "LOW" | "MEDIUM" | "HIGH";
export type EvidenceQuality = "WEAK" | "MIXED" | "STRONG";
export type EvidenceKind = "TEXT" | "URL";
export type Party = "CLAIMANT" | "RESPONDENT";

export interface CaseSummary {
  id: number;
  claimant: string;
  respondent: string;
  category: Category;
  visibility: Visibility;
  title: string;
  question: string;
  status: CaseStatus;
  hasVerdict: boolean;
  hasReview: boolean;
  /** 0 = none, 1 = original verdict, 2 = review verdict is the latest. Both stay readable. */
  operativeRound: number;
  favoredParty: FavoredParty | null;
  totalVotes: number;
}

export interface CaseDetail extends CaseSummary {
  claimantStatement: string;
  respondentStatement: string;
  responded: boolean;
  claimantEvidenceCount: number;
  respondentEvidenceCount: number;
  evidenceTotal: number;
  verdictVersion: number;
  createdAt: string;
  /** Unix seconds. A response is accepted up to and including this second. */
  responseDeadline: number;
  reviewRequestedBy: Party | null;
  reviewGrounds: string;
  eventCount: number;
}

export interface Evidence {
  id: number;
  caseId: number;
  /** 1 = original record, 2 = added for the review round. */
  round: number;
  party: Party;
  kind: EvidenceKind;
  content: string;
  caption: string;
}

export type InsufficiencyBasis = "MISSING_EVIDENCE" | "CONTRADICTORY_EVIDENCE" | "UNVERIFIABLE_CLAIMS" | "AMBIGUOUS_TERMS" | "NONE";

export interface EvidenceSource { url: string; sha256: string }

export interface Verdict {
  exists: boolean;
  /** 1 = original, 2 = review. */
  round: number;
  version: number;
  requestedBy: string;
  recordedAt: string;
  // --- consensus-bound: validators had to agree on these ---
  favoredParty: FavoredParty | null;
  claimantFault: number;
  respondentFault: number;
  confidence: ConfidenceBucket | null;
  evidenceQuality: EvidenceQuality | null;
  primaryReason: string;
  insufficiencyBasis: InsufficiencyBasis | null;
  evidenceDigest: string;
  evidenceSources: EvidenceSource[];
  // --- NOT consensus-bound: written by the leader model only ---
  secondaryReasonCodes: string[];
  summary: string;
  remedy: string;
  /** Names of fields the contract itself marks as non-authoritative. */
  nonAuthoritativeFields: string[];
  /** Deprecated union of primary + secondary codes. */
  reasonCodes: string[];
}

export interface HistoryEvent { seq: number; action: string; actor: string; at: string; detail: string }

export interface ProtocolInfo {
  contractVersion: string;
  adminPowers: boolean;
  verdictOverridePossible: boolean;
  communityVotesAuthoritative: boolean;
  responseWindowSeconds: number;
}

export interface VoteSummary {
  claimant: number;
  respondent: number;
  split: number;
  insufficient: number;
  total: number;
  /** % of votes matching the GenLayer favoured side; null until a verdict AND votes exist. */
  juryMatchPct: number | null;
  /** Always false: votes never affect the GenLayer verdict. */
  authoritative: boolean;
}

/** Evidence entry as typed into a form (before it is sent to the contract). */
export interface EvidenceDraft {
  kind: EvidenceKind;
  content: string;
  caption: string;
}
