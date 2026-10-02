"use client";
import Link from "next/link";
import { COPY } from "@/lib/settleit/constants";
import { useFeed } from "@/lib/genlayer/hooks";
import { CaseCard } from "@/components/CaseCard";

export default function Petty() {
  const feed = useFeed(20);
  const rows = feed.data?.rows.filter((c) => c.category === "PETTY") ?? [];
  return (
    <div className="stack">
      <h1>{COPY.petty}</h1>
      <p>Tiny stakes. Maximum outrage.</p>
      <Link className="btn plasma" href="/create?category=PETTY">File a petty case</Link>
      {feed.isLoading ? <p role="status">Loading…</p> : rows.length ? (
        <div className="grid two">{rows.map((c) => <CaseCard key={c.id} c={c} />)}</div>
      ) : <div className="panel"><p>No petty cases yet.</p></div>}
    </div>
  );
}
