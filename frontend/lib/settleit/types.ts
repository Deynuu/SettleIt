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

export type CaseStatus = "AWAITING_RESPONSE" | "READY" | "VERDICT_RECORDED";

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
  favoredParty: FavoredParty | null;
  totalVotes: number;
}

export interface CaseDetail extends CaseSummary {
  claimantStatement: string;
  respondentStatement: string;
  responded: boolean;
  claimantEvidenceCount: number;
  respondentEvidenceCount: number;
  verdictVersion: number;
}

export interface Evidence {
  id: number;
  caseId: number;
  party: Party;
  kind: EvidenceKind;
  content: string;
  caption: string;
}

export interface Verdict {
  exists: boolean;
  version: number;
  favoredParty: FavoredParty | null;
  claimantFault: number;
  respondentFault: number;
  confidence: ConfidenceBucket | null;
  evidenceQuality: EvidenceQuality | null;
  reasonCodes: string[];
  summary: string;
  remedy: string;
}

export interface VoteSummary {
  claimant: number;
  respondent: number;
  split: number;
  insufficient: number;
  total: number;
  /** % of votes matching the GenLayer favoured side; null until a verdict AND votes exist. */
  juryMatchPct: number | null;
}

/** Evidence entry as typed into a form (before it is sent to the contract). */
export interface EvidenceDraft {
  kind: EvidenceKind;
  content: string;
  caption: string;
}
