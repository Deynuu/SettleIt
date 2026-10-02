"use client";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { useMyVote, useTxFlow, useVotes } from "@/lib/genlayer/hooks";
import { castVote } from "@/lib/genlayer/contract";
import { VOTE_OPTIONS } from "@/lib/settleit/constants";
import { compareHumansToJury } from "@/lib/settleit/compare";
import { sameAddress } from "@/lib/settleit/format";
import type { CaseDetail, VoteChoice, Verdict } from "@/lib/settleit/types";
import { TxTracker } from "./TxTracker";

export function VotePanel({ c, verdict }: { c: CaseDetail; verdict: Verdict | undefined }) {
  const w = useWallet();
  const votes = useVotes(c.id);
  const mine = useMyVote(c.id, w.account);
  const flow = useTxFlow(() => { void votes.refetch(); void mine.refetch(); });
  const isParty = sameAddress(w.account, c.claimant) || sameAddress(w.account, c.respondent);
  const voted = (mine.data ?? "") as string;
  const v = votes.data;
  const cmp = v ? compareHumansToJury(v, verdict?.exists ? verdict.favoredParty : null) : null;

  const vote = (choice: VoteChoice) => {
    if (!w.account) return;
    void flow.run(() => castVote(w.account!, c.id, choice));
  };
  const total = v?.total ?? 0;
  const pct = (n: number) => (total ? Math.round((n * 100) / total) : 0);

  return (
    <section className="panel stack" aria-label="Community vote">
      <div className="eyebrow">Community vote</div>
      <h2>What do humans think?</h2>
      {v && (
        <div className="score">
          {VOTE_OPTIONS.map((o) => {
            const n = o.id === "CLAIMANT" ? v.claimant : o.id === "RESPONDENT" ? v.respondent : o.id === "SPLIT" ? v.split : v.insufficient;
            return (
              <div key={o.id} className="score-row">
                <div className="score-label"><span>{o.short}</span><span>{n} · {pct(n)}%</span></div>
                <div className="score-bar"><div className="score-fill respondent" style={{ width: `${pct(n)}%` }} /></div>
              </div>
            );
          })}
        </div>
      )}
      {cmp && cmp.kind !== "PENDING" && <p className="verdict-banner" role="status">{cmp.label}</p>}
      {v?.juryMatchPct != null && <p className="muted">{v.juryMatchPct}% of voters matched the jury.</p>}
      {!w.account ? (
        <button className="btn" onClick={w.connect}>Connect wallet to vote</button>
      ) : isParty ? (
        <p className="muted">The two parties can’t vote on their own case.</p>
      ) : voted ? (
        <p role="status">You voted: <strong>{voted}</strong>. One vote per wallet.</p>
      ) : (
        <div className="vote-opts" role="group" aria-label="Cast your vote">
          {VOTE_OPTIONS.map((o) => (
            <button key={o.id} className="btn ghost" aria-pressed="false" disabled={flow.busy} onClick={() => vote(o.id)}>{o.label}</button>
          ))}
        </div>
      )}
      <TxTracker lifecycle={flow.lifecycle} hash={flow.hash} error={flow.error} />
    </section>
  );
}
