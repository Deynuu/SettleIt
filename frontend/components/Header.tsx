"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/genlayer/WalletProvider";
import { CONTRACT_ADDRESS, NETWORK_LABEL } from "@/lib/genlayer/config";
import { shortAddress } from "@/lib/settleit/format";

const LINKS = [
  { href: "/", label: "Cases" },
  { href: "/create", label: "Challenge" },
  { href: "/court/petty", label: "Petty Court" },
  { href: "/about", label: "How it works" },
];

export function Header() {
  const path = usePathname();
  const w = useWallet();
  return (
    <>
      <header className="site-header">
        <div className="wrap">
          <Link href="/" className="logo">Settle<span>it</span></Link>
          <nav className="nav" aria-label="Main">
            {LINKS.map((l) => (
              <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>{l.label}</Link>
            ))}
          </nav>
          <div className="row">
            <span className="pill">{NETWORK_LABEL}</span>
            {!w.account ? (
              <button className="btn" onClick={w.connect} disabled={w.busy || !w.hasProvider}>
                {w.hasProvider ? "Connect wallet" : "No wallet found"}
              </button>
            ) : !w.onStudionet ? (
              <button className="btn plasma" onClick={w.switchNetwork} disabled={w.busy}>Switch to StudioNet</button>
            ) : (
              <span className="pill mono" title={w.account}>{shortAddress(w.account)}</span>
            )}
          </div>
        </div>
      </header>
      {!CONTRACT_ADDRESS && (
        <div className="banner" role="alert">
          Contract address not configured. Set NEXT_PUBLIC_CONTRACT_ADDRESS to the deployed Settleit contract.
        </div>
      )}
      {w.error && <div className="banner" role="alert">{w.error}</div>}
    </>
  );
}
