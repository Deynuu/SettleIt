"use client";
import { useState } from "react";
import { caseUrl } from "@/lib/settleit/share";

export function ShareButtons({ id, text }: { id: number; text: string }) {
  const [msg, setMsg] = useState("");
  const url = () => caseUrl(window.location.origin, id);
  const copy = async () => {
    try { await navigator.clipboard.writeText(url()); setMsg("Link copied."); } catch { setMsg(url()); }
  };
  const share = async () => {
    if (typeof navigator.share === "function") {
      try { await navigator.share({ title: "Settleit", text, url: url() }); return; } catch { /* cancelled */ }
    }
    await copy();
  };
  const tweet = () => window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url())}`, "_blank", "noopener,noreferrer");
  return (
    <div className="stack">
      <div className="row">
        <button className="btn ion" onClick={copy}>Copy link</button>
        <button className="btn ghost" onClick={share}>Share</button>
        <button className="btn ghost" onClick={tweet}>Post on X</button>
      </div>
      <p className="hint" role="status">{msg}</p>
    </div>
  );
}
