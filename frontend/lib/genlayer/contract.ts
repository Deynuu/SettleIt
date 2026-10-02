/** Typed wrapper over the deployed Settleit contract. Reads via RPC, writes via the wallet. */
import { CONTRACT_ADDRESS } from "./config";
import { getReadClient, getWriteClient } from "./client";
import {
  parseCaseDetail, parseCaseList, parseEvidenceList, parseVerdict, parseVoteSummary, toPlain,
} from "../settleit/normalize";
import type { CaseDetail, CaseSummary, Evidence, Verdict, VoteChoice, VoteSummary } from "../settleit/types";

function addr(): `0x${string}` {
  if (!CONTRACT_ADDRESS) throw new Error("Contract address is not configured (NEXT_PUBLIC_CONTRACT_ADDRESS).");
  return CONTRACT_ADDRESS;
}

async function read(functionName: string, args: (string | number | bigint)[] = []): Promise<unknown> {
  const out = await getReadClient().readContract({
    address: addr(),
    functionName,
    args: args.map((a) => (typeof a === "number" ? BigInt(a) : a)) as never,
    jsonSafeReturn: true,
  });
  return toPlain(out);
}

export const getCaseCount = async () => Number(await read("get_case_count"));
export const getLastCaseId = async (claimant: string) => Number(await read("get_last_case_id", [claimant]));
export const getCase = async (id: number): Promise<CaseDetail> => parseCaseDetail(await read("get_case", [id]));
export const getEvidence = async (id: number): Promise<Evidence[]> => parseEvidenceList(await read("get_evidence", [id]));
export const getVerdict = async (id: number): Promise<Verdict> => parseVerdict(await read("get_verdict", [id]));
export const getVoteSummary = async (id: number): Promise<VoteSummary> => parseVoteSummary(await read("get_vote_summary", [id]));
export const getCases = async (offset: number, limit: number): Promise<CaseSummary[]> =>
  parseCaseList(await read("get_cases", [offset, limit]));
export const getUserVote = async (id: number, who: string): Promise<string> => String((await read("get_user_vote", [id, who])) ?? "");
export async function canRespond(id: number, who: string): Promise<boolean> { return Boolean(await read("can_respond", [id, who])); }
export async function canRequestVerdict(id: number, who: string): Promise<boolean> { return Boolean(await read("can_request_verdict", [id, who])); }

async function write(account: `0x${string}`, functionName: string, args: (string | number | bigint)[]): Promise<`0x${string}`> {
  const hash = await getWriteClient(account).writeContract({
    address: addr(),
    functionName,
    args: args.map((a) => (typeof a === "number" ? BigInt(a) : a)) as never,
    value: BigInt(0),
  });
  return hash as `0x${string}`;
}

export const createCase = (
  account: `0x${string}`,
  p: { category: string; visibility: string; respondent: string; title: string; question: string; statement: string; evidenceJson: string },
) => write(account, "create_case", [p.category, p.visibility, p.respondent, p.title, p.question, p.statement, p.evidenceJson]);
export const submitResponse = (account: `0x${string}`, id: number, statement: string, evidenceJson: string) =>
  write(account, "submit_response", [id, statement, evidenceJson]);
export const requestVerdict = (account: `0x${string}`, id: number) => write(account, "request_verdict", [id]);
export const castVote = (account: `0x${string}`, id: number, choice: VoteChoice) => write(account, "cast_vote", [id, choice]);
