"use client";
import Link from "next/link";
import { useState } from "react";
import { COPY } from "@/lib/settleit/constants";
import { useFeed } from "@/lib/genlayer/hooks";
import { CONTRACT_ADDRESS } from "@/lib/genlayer/config";
import { CaseCard } from "@/components/CaseCard";

export default function Home() {
  const [page, setPage] = useState(0);
  const feed = useFeed(page, 20);
  return (
    <div className="stack">
      <section className="stack">
        <h1>{COPY.heroLine1}<br /><span style={{ color: "var(--acid)" }}>{COPY.heroLine2}</span></h1>
        <p style={{ fontSize: "1.15rem" }}>{COPY.tagline}</p>
        <div className="row">
          <Link className="btn" href="/create">Start a case</Link>
          <Link className="btn ghost" href="/about">How it works</Link>
        </div>
      </section>
      <section className="stack" aria-labelledby="feed-h">
        <h2 id="feed-h">Public cases</h2>
        {!CONTRACT_ADDRESS ? (
          <p className="muted">Connect a deployed contract to browse cases.</p>
        ) : feed.isLoading ? (
          <p role="status">Loading cases…</p>
        ) : feed.isError ? (
          <p className="err" role="alert">Couldn’t load cases from StudioNet. <button className="btn ghost" onClick={() => feed.refetch()}>Retry</button></p>
        ) : feed.data && feed.data.rows.length ? (
          <>
            <div className="grid two">{feed.data.rows.map((c) => <CaseCard key={c.id} c={c} />)}</div>
            <div className="row">
              <button className="btn ghost" disabled={page === 0} onClick={() => setPage(page - 1)}>Newer</button>
              <span className="muted">Page {page + 1} · {feed.data.total} public cases</span>
              <button className="btn ghost" disabled={!feed.data.hasMore} onClick={() => setPage(page + 1)}>Older</button>
            </div>
          </>
        ) : (
          <div className="panel"><h3>No public cases yet.</h3><p className="muted">Be the first to start one.</p></div>
        )}
      </section>
    </div>
  );
}
