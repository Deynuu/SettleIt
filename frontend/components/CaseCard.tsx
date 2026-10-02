import Link from "next/link";
import type { CaseSummary } from "@/lib/settleit/types";
import { categoryInfo, FAVORED_LABEL } from "@/lib/settleit/constants";
import { caseNumber, pluralize, shortAddress } from "@/lib/settleit/format";

const STATUS: Record<string, string> = {
  AWAITING_RESPONSE: "Awaiting response",
  READY: "Ready for jury",
  VERDICT_RECORDED: "Verdict recorded",
};

export function CaseCard({ c }: { c: CaseSummary }) {
  const cat = categoryInfo(c.category);
  return (
    <Link href={`/case/${c.id}`} className="card-link">
      <article className="panel" style={{ ["--accent" as string]: cat.accent }}>
        <div className="eyebrow">{caseNumber(c.id)} · {cat.emoji} {cat.label}</div>
        <h3>{c.title}</h3>
        <p className="muted">{c.question}</p>
        <div className="row">
          <span className="chip">{STATUS[c.status] ?? c.status}</span>
          {c.favoredParty && <span className="chip">{FAVORED_LABEL[c.favoredParty]}</span>}
          <span className="chip">{pluralize(c.totalVotes, "vote")}</span>
        </div>
        <p className="mono muted">{shortAddress(c.claimant)} vs {shortAddress(c.respondent)}</p>
      </article>
    </Link>
  );
}
