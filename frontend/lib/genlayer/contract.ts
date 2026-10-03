/** Typed wrapper over the deployed Settleit contract. Reads via RPC, writes via the wallet. */
import { CONTRACT_ADDRESS } from "./config";
import { getReadClient, getWriteClient } from "./client";
import { ensureWriteReady } from "./wallet";
import { preflightWrite, type Plan } from "./preflight";
import {
  parseCaseDetail, parseCaseList, parseEvidenceList, parseHistory, parseProtocolInfo, parseVerdict, parseVoteSummary, toPlain,
} from "../settleit/normalize";
import type { CaseDetail, CaseSummary, Evidence, HistoryEvent, ProtocolInfo, Verdict, VoteChoice, VoteSummary } from "../settleit/types";

type Arg = string | number | bigint;

export function contractAddress(): `0x${string}` {
  if (!CONTRACT_ADDRESS) throw new Error("Contract address is not configured (NEXT_PUBLIC_CONTRACT_ADDRESS).");
  return CONTRACT_ADDRESS;
}

const toArgs = (args: Arg[]) => args.map((a) => (typeof a === "number" ? BigInt(a) : a));

async function read(functionName: string, args: Arg[] = []): Promise<unknown> {
  const out = await getReadClient().readContract({
    address: contractAddress(),
    functionName,
    args: toArgs(args) as never,
    jsonSafeReturn: true,
  });
  return toPlain(out);
}

export const getCaseCount = async () => Number(await read("get_case_count"));
export const getLastCaseId = async (claimant: string) => Number(await read("get_last_case_id", [claimant]));
export const getCase = async (id: number): Promise<CaseDetail> => parseCaseDetail(await read("get_case", [id]));
export const getEvidence = async (id: number): Promise<Evidence[]> => parseEvidenceList(await read("get_evidence", [id]));
export const getVerdict = async (id: number): Promise<Verdict> => parseVerdict(await read("get_verdict", [id]));
export const getReviewVerdict = async (id: number): Promise<Verdict> => parseVerdict(await read("get_review_verdict", [id]));
export const getVoteSummary = async (id: number): Promise<VoteSummary> => parseVoteSummary(await read("get_vote_summary", [id]));
export const getPublicCaseCount = async () => Number(await read("get_public_case_count"));
export const getCases = async (offset: number, limit: number): Promise<CaseSummary[]> => parseCaseList(await read("get_cases", [offset, limit]));
export const getCaseHistory = async (id: number, offset = 0, limit = 20): Promise<HistoryEvent[]> =>
  parseHistory(await read("get_case_history", [id, offset, limit]));
export const getProtocolInfo = async (): Promise<ProtocolInfo> => parseProtocolInfo(await read("get_protocol_info"));
export const getUserVote = async (id: number, who: string): Promise<string> => String((await read("get_user_vote", [id, who])) ?? "");
export const canRespond = async (id: number, who: string) => Boolean(await read("can_respond", [id, who]));
export const canRequestVerdict = async (id: number, who: string) => Boolean(await read("can_request_verdict", [id, who]));
export const canRequestReview = async (id: number, who: string) => Boolean(await read("can_request_review", [id, who]));
export const canExpire = async (id: number, who: string) => Boolean(await read("can_expire", [id, who]));

/** A write described as data, so the same spec can be preflighted, signed, and retried. */
export interface WriteSpec {
  account: `0x${string}`;
  functionName: string;
  args: Arg[];
  /** Plain-language description shown on the confirmation card. */
  summary: string;
}

/** Wallet/chain guard + simulation. Throws before any signature is requested if anything is off. */
export async function prepareWrite(spec: WriteSpec): Promise<Plan> {
  await ensureWriteReady(spec.account);
  return preflightWrite(spec.account, contractAddress(), spec.functionName, toArgs(spec.args));
}

/** Re-checks chain + account AGAIN right before signing, then asks the wallet to sign. */
export async function sendWrite(spec: WriteSpec): Promise<`0x${string}`> {
  await ensureWriteReady(spec.account);
  const hash = await getWriteClient(spec.account).writeContract({
    address: contractAddress(),
    functionName: spec.functionName,
    args: toArgs(spec.args) as never,
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export const createCaseSpec = (
  account: `0x${string}`,
  p: { category: string; visibility: string; respondent: string; title: string; question: string; statement: string; evidenceJson: string },
): WriteSpec => ({
  account, functionName: "create_case",
  args: [p.category, p.visibility, p.respondent, p.title, p.question, p.statement, p.evidenceJson],
  summary: "Create this case on GenLayer StudioNet",
});
export const respondSpec = (account: `0x${string}`, id: number, statement: string, evidenceJson: string): WriteSpec => ({
  account, functionName: "submit_response", args: [id, statement, evidenceJson], summary: "Lock in your response (it cannot be edited afterwards)",
});
export const verdictSpec = (account: `0x${string}`, id: number): WriteSpec => ({
  account, functionName: "request_verdict", args: [id], summary: "Ask GenLayer validators for a verdict (they will fetch any link evidence)",
});
export const reviewSpec = (account: `0x${string}`, id: number, grounds: string, evidenceJson: string): WriteSpec => ({
  account, functionName: "request_review", args: [id, grounds, evidenceJson], summary: "Request the one evidence-bound review round (the original verdict stays on record)",
});
export const expireSpec = (account: `0x${string}`, id: number): WriteSpec => ({
  account, functionName: "expire_case", args: [id], summary: "Close this case as unanswered",
});
export const voteSpec = (account: `0x${string}`, id: number, choice: VoteChoice): WriteSpec => ({
  account, functionName: "cast_vote", args: [id, choice], summary: "Cast a non-authoritative community vote",
});
