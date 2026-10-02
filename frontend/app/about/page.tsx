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
        <p>A GenLayer validator panel reads only what was submitted and proposes a verdict. Other validators check it against their own reading using a custom equivalence rule on the verdict itself — who is favoured, the fault split, evidence quality and reason codes — not on the wording.</p>
        <h2>4. Provisional, then final</h2>
        <p>“Accepted” means validators agreed, but it is provisional. It is final only when GenLayer reports <strong>Finalized</strong>. “Undetermined” means validators could not agree this round and nothing was recorded.</p>
        <h2>5. Humans vote</h2>
        <p>Anyone except the two parties can vote once per wallet. Settleit shows whether humans and the jury agree.</p>
      </div>
      <div className="panel alert stack">
        <h2>Read this</h2>
        <p>{COPY.safety}</p>
        <p>{COPY.sensitive}</p>
        <p>{COPY.publishWarning}</p>
        <p><strong>Public</strong> cases are featured in the feed. <strong>Unlisted</strong> cases are not featured. {COPY.unlisted}</p>
        <p>Links submitted as evidence are never opened by the jury. The jury does not know what happened offline. It rules on the material only.</p>
        <p>Runs on StudioNet, a test network. Appeals are not available there.</p>
      </div>
    </div>
  );
}
