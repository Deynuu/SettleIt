import { caseNumber } from "./format";
import { FAVORED_LABEL } from "./constants";
import type { CaseSummary, Verdict } from "./types";

export function caseUrl(origin: string, id: number): string {
  return `${origin.replace(/\/+$/, "")}/case/${id}`;
}

export function challengeText(c: Pick<CaseSummary, "id" | "title">): string {
  return `${caseNumber(c.id)} — "${c.title}". I'm taking this to Settleit. Tell your side before the jury sees it.`;
}

export function verdictText(
  c: Pick<CaseSummary, "id" | "title">,
  v: Pick<Verdict, "favoredParty" | "claimantFault" | "respondentFault">,
  finalized: boolean,
): string {
  const who = v.favoredParty ? FAVORED_LABEL[v.favoredParty] : "UNDECIDED";
  const state = finalized ? "finalized" : "provisional";
  return `${caseNumber(c.id)} — "${c.title}". Settleit says: ${who} (${v.claimantFault}/${v.respondentFault}, ${state}).`;
}
