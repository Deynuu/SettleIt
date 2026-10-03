import type { Category, EvidenceQuality, FavoredParty, VoteChoice } from "./types";

/** Hard limits. Keep in sync with the constants at the top of contracts/settleit.py. */
export const LIMITS = {
  title: 80,
  question: 240,
  statement: 2000,
  evidencePerSide: 5,
  evidenceCaption: 240,
  evidenceContent: 1000,
  url: 300,
  reviewGrounds: 600,
  reviewEvidence: 3,
  summary: 800,
  remedy: 240,
  feedPage: 20,
} as const;

export interface CategoryInfo {
  id: Category;
  label: string;
  emoji: string;
  /** CSS custom property (see globals.css) used as this court's accent colour. */
  accent: string;
  blurb: string;
  /** Sensitive courts never get a playful "sentence" styling. */
  playful: boolean;
}

export const CATEGORIES: readonly CategoryInfo[] = [
  { id: "RELATIONSHIPS", label: "Relationships", emoji: "❤️", accent: "var(--plasma)", blurb: "Dates, partners, exes, situationships.", playful: false },
  { id: "FRIENDS", label: "Friends", emoji: "👯", accent: "var(--ion)", blurb: "Plans, promises, group-chat crimes.", playful: true },
  { id: "ROOMMATES", label: "Roommates", emoji: "🏠", accent: "var(--acid)", blurb: "Dishes, noise, fridge law.", playful: true },
  { id: "FAMILY", label: "Family", emoji: "👨‍👩‍👧", accent: "var(--mango)", blurb: "Holiday seating and other wars.", playful: false },
  { id: "MONEY", label: "Money", emoji: "💸", accent: "var(--mintshock)", blurb: "Splits, loans, who owes whom.", playful: false },
  { id: "WORK", label: "Work", emoji: "💼", accent: "var(--bruise)", blurb: "Credit, scheduling, team friction.", playful: false },
  { id: "GAMING", label: "Gaming", emoji: "🎮", accent: "var(--tomato)", blurb: "Lobbies, loot, rage-quits.", playful: true },
  { id: "CRYPTO", label: "Crypto", emoji: "🌐", accent: "var(--silver)", blurb: "Group buys, DAO drama, rug claims.", playful: false },
  { id: "PETTY", label: "Petty Court", emoji: "💀", accent: "var(--acid)", blurb: "Tiny stakes. Maximum outrage.", playful: true },
];

export function categoryInfo(id: string): CategoryInfo {
  return CATEGORIES.find((c) => c.id === id) ?? CATEGORIES[CATEGORIES.length - 1];
}

export const VOTE_OPTIONS: readonly { id: VoteChoice; label: string; short: string }[] = [
  { id: "CLAIMANT", label: "Claimant is right", short: "Claimant" },
  { id: "RESPONDENT", label: "Respondent is right", short: "Respondent" },
  { id: "SPLIT", label: "Both share the blame", short: "Split" },
  { id: "INSUFFICIENT", label: "Not enough info", short: "Not enough info" },
];

export const FAVORED_LABEL: Record<FavoredParty, string> = {
  CLAIMANT: "CLAIMANT",
  RESPONDENT: "RESPONDENT",
  SPLIT: "SPLIT DECISION",
  INCONCLUSIVE: "NOT ENOUGH TO GO ON",
};

export const QUALITY_LABEL: Record<EvidenceQuality, string> = {
  WEAK: "WEAK",
  MIXED: "MIXED",
  STRONG: "STRONG",
};

export const REASON_CODE_LABEL: Record<string, string> = {
  DIRECT_EVIDENCE_SUPPORT: "Direct evidence support",
  EXPLICIT_BOUNDARY_IGNORED: "Explicit boundary ignored",
  EXPLICIT_AGREEMENT_BROKEN: "Explicit agreement broken",
  CLAIM_CONTRADICTED: "Claim contradicted",
  CLAIM_CORROBORATED: "Claim corroborated",
  MATERIAL_ADMISSION: "Material admission",
  PRIOR_NORM_RELEVANT: "Prior norm relevant",
  PRIOR_NORM_OVERRIDDEN: "Prior norm overridden by specific notice",
  EVIDENCE_INCONCLUSIVE: "Evidence inconclusive",
  BOTH_CONTRIBUTED: "Both contributed",
  EXPECTATION_UNREASONABLE: "Expectation unreasonable",
  PROPORTIONAL_RESPONSE: "Proportional response",
  INSUFFICIENT_INFORMATION: "Insufficient information",
};

export const BASIS_LABEL: Record<string, string> = {
  MISSING_EVIDENCE: "Missing evidence",
  CONTRADICTORY_EVIDENCE: "Contradictory evidence",
  UNVERIFIABLE_CLAIMS: "Unverifiable claims",
  AMBIGUOUS_TERMS: "Ambiguous terms",
};

export const STATUS_LABEL: Record<string, string> = {
  AWAITING_RESPONSE: "Awaiting response",
  READY: "Ready for the jury",
  VERDICT_RECORDED: "Verdict recorded",
  REVIEWED: "Reviewed",
  EXPIRED: "Expired (no response)",
};

export const COPY = {
  heroLine1: "GOT AN ARGUMENT?",
  heroLine2: "SETTLEIT.",
  tagline: "Two sides. One dispute. Let the jury settle it.",
  challenged: "YOU'VE BEEN CHALLENGED.",
  challengedSub: "Tell your side before the jury sees the case.",
  locked: "BOTH SIDES ARE LOCKED.",
  deliberating: "THE JURY IS DELIBERATING.",
  spoken: "SETTLEIT HAS SPOKEN.",
  accepted: "Accepted — still provisional.",
  closed: "CASE CLOSED.",
  finalized: "Finalized on GenLayer.",
  disagrees: "THE INTERNET DISAGREES.",
  petty: "PETTY COURT 💀",
  publishWarning:
    "On-chain case content may be permanent and publicly inspectable. Do not submit secrets or private identifying information.",
  safety:
    "Settleit is for social adjudication and entertainment. The jury evaluates only the material submitted to the case. Do not post secrets, private identifying information, or intimate content.",
  sensitive: "Settleit is not an emergency, legal, medical, or safety service.",
  jurisdiction:
    "The jury decides from the material submitted to this case and the link text validators fetched at verdict time. It does not independently know what happened offline, and it cannot confirm that a page is authentic or true.",
  nonAuthoritative:
    "Not consensus-bound: this part was written by the leader model. Validators did not compare it, so treat it as a suggestion, not part of the ruling.",
  consensusBound:
    "Consensus-bound: GenLayer validators had to independently reach an equivalent result on these fields.",
  votesNonAuthoritative:
    "Community votes are for fun and sentiment. They never change, replace or influence the GenLayer verdict.",
  linkEvidence:
    "Links must be https and public. When a verdict is requested, every validator fetches the page text itself and the SHA-256 digest of what they saw is recorded with the verdict. If a page can't be fetched, is empty, or differs between validators, no verdict is recorded.",
  walletWhy: "Your wallet signs the case so neither side can silently rewrite it.",
  unlisted:
    "Unlisted means not featured in the browse feed. Anyone with the link — or anyone inspecting the chain — can still read it.",
} as const;
