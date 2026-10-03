"use client";
import { BuildInfo } from "@/components/BuildInfo";
import { useProtocol } from "@/lib/genlayer/hooks";

export default function Verify() {
  const p = useProtocol();
  return (
    <div className="stack">
      <h1>Verify what you’re using</h1>
      <section className="panel stack" aria-label="Build and contract">
        <h2>This page, live</h2>
        <BuildInfo />
        <p className="hint">The same facts are published at <a href="/version.json">/version.json</a>. Compare the commit and contract address with the repository’s <code>deployments/studionet.json</code>.</p>
      </section>
      <section className="panel stack" aria-label="Protocol rules read from the contract">
        <h2>Rules the contract reports about itself</h2>
        {p.isLoading ? <p role="status">Reading from StudioNet…</p> : p.data ? (
          <ul data-testid="protocol-info">
            <li>Contract version: <strong>{p.data.contractVersion}</strong></li>
            <li>Administrator / moderator powers: <strong>{p.data.adminPowers ? "yes" : "none"}</strong></li>
            <li>Verdict override possible: <strong>{p.data.verdictOverridePossible ? "yes" : "no"}</strong></li>
            <li>Community votes change the verdict: <strong>{p.data.communityVotesAuthoritative ? "yes" : "no — votes are non-authoritative"}</strong></li>
            <li>Response window: <strong>{Math.round(p.data.responseWindowSeconds / 86400)} days</strong></li>
          </ul>
        ) : <p className="err" role="alert">Couldn’t read protocol info. Is the contract address a Settleit v2 deployment?</p>}
      </section>
      <section className="panel stack" aria-label="What this proves">
        <h2>What a verdict proves — and doesn’t</h2>
        <p><strong>Proves:</strong> that a GenLayer validator set reached consensus that the structured result (who is favoured, the fault split, evidence quality, primary reason) is equivalent across validators for the material that was on the case, and that every validator fetched link evidence with an identical SHA-256 digest, which is stored with the verdict.</p>
        <p><strong>Does not prove:</strong> that the verdict is fair, legally meaningful or factually correct; that evidence is authentic or a linked page is true; that an <em>Accepted</em> result is final (only <em>Finalized</em> is); or anything about the summary, remedy or secondary reason codes, which are written by the leader model and not compared by validators.</p>
        <p>Full statement: <a href="https://github.com/Deynuu/SettleIt/blob/main/docs/WHAT_IT_PROVES.md">docs/WHAT_IT_PROVES.md</a>.</p>
      </section>
    </div>
  );
}
