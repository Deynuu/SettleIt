import type { FavoredParty, VoteSummary } from "./types";

export type Agreement = "AGREE" | "SPLIT" | "UNKNOWN" | "DISAGREE" | "PENDING";

export interface Comparison {
  kind: Agreement;
  label: string;
  humansTop: FavoredParty | null;
}

const ORDER: FavoredParty[] = ["CLAIMANT", "RESPONDENT", "SPLIT", "INCONCLUSIVE"];

/** Plurality of human votes, mapped onto verdict vocabulary. Ties => null. */
export function humanTop(v: VoteSummary): FavoredParty | null {
  if (v.total <= 0) return null;
  const counts: Record<FavoredParty, number> = {
    CLAIMANT: v.claimant,
    RESPONDENT: v.respondent,
    SPLIT: v.split,
    INCONCLUSIVE: v.insufficient,
  };
  const max = Math.max(...ORDER.map((k) => counts[k]));
  const tops = ORDER.filter((k) => counts[k] === max);
  return tops.length === 1 ? tops[0] : null;
}

export function compareHumansToJury(votes: VoteSummary, verdict: FavoredParty | null): Comparison {
  if (!verdict || votes.total <= 0) return { kind: "PENDING", label: "Waiting for votes", humansTop: null };
  const top = humanTop(votes);
  if (top === null) return { kind: "SPLIT", label: "Split Decision", humansTop: null };
  if (top === verdict) return { kind: "AGREE", label: "Humans + Jury Agree", humansTop: top };
  if (top === "INCONCLUSIVE" || verdict === "INCONCLUSIVE")
    return { kind: "UNKNOWN", label: "Nobody Knows What Happened 😭", humansTop: top };
  return { kind: "DISAGREE", label: "The Internet Disagrees", humansTop: top };
}
