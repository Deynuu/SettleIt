"use client";
import { BUILD_COMMIT, BUILD_TIME, CHAIN_ID, CHAIN_ID_HEX, CONTRACT_ADDRESS, NETWORK_LABEL, addressUrl, commitUrl } from "@/lib/genlayer/config";
import { useProtocol } from "@/lib/genlayer/hooks";
import { useWallet } from "@/lib/genlayer/WalletProvider";

/** Everything a reviewer needs to confirm what they are actually using. */
export function BuildInfo({ compact = false }: { compact?: boolean }) {
  const w = useWallet();
  const proto = useProtocol();
  const short = BUILD_COMMIT.length > 12 ? BUILD_COMMIT.slice(0, 7) : BUILD_COMMIT;
  const wrongChain = !!w.chainHex && w.chainHex.toLowerCase() !== CHAIN_ID_HEX;
  return (
    <dl className={compact ? "buildinfo compact" : "buildinfo stack"} data-testid="build-info">
      <div><dt>Network</dt><dd data-testid="info-chain">{NETWORK_LABEL} · chain id {CHAIN_ID} ({CHAIN_ID_HEX})</dd></div>
      <div><dt>Contract</dt><dd className="mono" data-testid="info-contract">
        {CONTRACT_ADDRESS ? <a href={addressUrl(CONTRACT_ADDRESS)} target="_blank" rel="noreferrer noopener">{CONTRACT_ADDRESS}</a> : "not configured"}
      </dd></div>
      <div><dt>Contract version (read live)</dt><dd data-testid="info-contract-version">
        {proto.isLoading ? "reading…" : proto.data?.contractVersion ? proto.data.contractVersion : "unavailable — this address may not be a Settleit v2 contract"}
      </dd></div>
      <div><dt>Frontend build</dt><dd className="mono" data-testid="info-commit">
        {BUILD_COMMIT === "local" ? "local build" : <a href={commitUrl(BUILD_COMMIT)} target="_blank" rel="noreferrer noopener">{short}</a>}
        {BUILD_TIME ? ` · built ${BUILD_TIME}` : ""}
      </dd></div>
      {w.account && <div><dt>Your wallet</dt><dd className="mono" data-testid="info-wallet">{w.account}{wrongChain ? " · wrong network" : ""}</dd></div>}
    </dl>
  );
}
