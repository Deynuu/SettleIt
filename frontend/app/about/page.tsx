import { COPY } from "@/lib/settleit/constants";

export const metadata = { title: "How Settleit works" };

export default function About() {
  return (
    <div className="stack">
      <h1>How it works</h1>
      <div className="panel stack">
        <h2>1. Challenge</h2>
        <p>The claimant states their side and names the other wallet. {COPY.walletWhy}</p>
        <h2>2. Respond</h2>
        <p>The respondent tells their side. Evidence locks once they answer.</p>
        <h2>3. Verdict</h2>
        <p>A GenLayer leader validator fetches any link evidence, reads the material and proposes a verdict. Other validators fetch the same links themselves and must see identical page text (their SHA-256 digests must match), then re-judge independently. They must agree on the consensus-bound fields: who is favoured, the fault split, evidence quality, confidence, the single primary reason and, for “not enough to go on”, the basis for insufficiency. The summary, remedy and secondary reasons are written by the leader and are <strong>not</strong> compared — they are suggestions only.</p>
        <h2>4. Provisional, then final</h2>
        <p>“Accepted” means validators agreed, but it is provisional. It is final only when GenLayer reports <strong>Finalized</strong>. “Undetermined” means validators could not agree this round and nothing was recorded.</p>
        <h2>5. One review round</h2>
        <p>Either party can request one review, but only by adding new evidence. The review verdict is stored separately; the original verdict stays on record and is never replaced. There are no administrators or moderators who can override a verdict.</p>
        <h2>6. Humans vote (for fun)</h2>
        <p>Anyone except the two parties can vote once per wallet. Votes are non-authoritative: they never change or influence the GenLayer verdict.</p>
      </div>
      <div className="panel alert stack">
        <h2>Read this</h2>
        <p>{COPY.safety}</p>
        <p>{COPY.sensitive}</p>
        <p>{COPY.publishWarning}</p>
        <p><strong>Public</strong> cases are featured in the feed. <strong>Unlisted</strong> cases are not featured. {COPY.unlisted}</p>
        <p>Links must be public https pages. Validators fetch them when the verdict is requested; if a page is unreachable, empty or differs between validators, no verdict is recorded. The jury does not know what happened offline and cannot confirm a page is true.</p>
        <p>An unanswered case can be closed by either party 7 days after it was created. Runs on StudioNet, a test network.</p>
      </div>
    </div>
  );
}
