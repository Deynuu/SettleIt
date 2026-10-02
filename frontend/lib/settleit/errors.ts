/** Turn contract / wallet / network errors into short human copy. Never leaks stack traces. */

const CODES: Record<string, string> = {
  ALREADY_RESPONDED: "The respondent has already answered this case.",
  ALREADY_VOTED: "This wallet has already voted on this case.",
  CASE_NOT_FOUND: "That case doesn't exist.",
  CASE_NOT_READY: "The case needs a response before the jury can rule.",
  EVIDENCE_LIMIT: "Evidence limit reached for this side.",
  EVIDENCE_LOCKED: "Evidence is locked once the respondent has answered.",
  EVIDENCE_TOO_LONG: "One evidence item is too long.",
  INVALID_CATEGORY: "Pick a valid court.",
  INVALID_EVIDENCE: "One evidence item is invalid.",
  INVALID_QUESTION: "The question is empty or too long.",
  INVALID_RESPONDENT: "Enter a valid wallet address for the other side.",
  INVALID_STATEMENT: "The statement is empty or too long.",
  INVALID_TITLE: "The title is empty or too long.",
  INVALID_VISIBILITY: "Pick Public or Unlisted.",
  INVALID_VOTE: "Pick a valid vote.",
  NOT_A_PARTY: "Only the two parties can do that.",
  NOT_CLAIMANT: "Only the claimant can do that.",
  NOT_RESPONDENT: "Only the named respondent can answer this case.",
  PARTIES_CANNOT_VOTE: "The two parties can't vote on their own case.",
  SAME_PARTY: "You can't challenge your own wallet.",
  UNSUPPORTED_EVIDENCE_TYPE: "Only text and link evidence are supported.",
  VERDICT_EXISTS: "This case already has a verdict.",
  INVALID_JSON: "The jury returned an unreadable answer. Nothing was recorded — try again.",
  INVALID_SCHEMA: "The jury returned an invalid answer. Nothing was recorded — try again.",
  UNSAFE_REMEDY: "The jury's suggested remedy was rejected as unsafe. Nothing was recorded — try again.",
  LLM_UNAVAILABLE: "The jury is temporarily unavailable. Try again shortly.",
};

export function extractCode(message: string): string | null {
  const m = /(?:EXPECTED|LLM_ERROR|TRANSIENT|EXTERNAL):([A-Z_]+)/.exec(message);
  return m ? m[1] : null;
}

export function isUserRejection(err: unknown): boolean {
  const e = err as { code?: unknown; message?: unknown } | null;
  if (!e || typeof e !== "object") return false;
  if (e.code === 4001 || e.code === "ACTION_REJECTED") return true;
  return typeof e.message === "string" && /user (rejected|denied)|rejected the request/i.test(e.message);
}

export function humanizeError(err: unknown): string {
  if (isUserRejection(err)) return "You cancelled the wallet request. Nothing was sent.";
  const raw =
    typeof err === "string" ? err : err && typeof (err as { message?: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  const code = extractCode(raw);
  if (code && CODES[code]) return CODES[code];
  if (/no wallet|ethereum/i.test(raw) && /provider|found|detected/i.test(raw))
    return "No wallet found. Install a browser wallet to continue.";
  if (/network|fetch|timeout|ECONN/i.test(raw)) return "Couldn't reach GenLayer StudioNet. Check your connection and retry.";
  return "Something went wrong. Nothing was changed on-chain unless a transaction hash is shown.";
}
