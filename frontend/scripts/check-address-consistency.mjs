// Deployment/source consistency gate (runs in CI and locally: `npm run check:address`).
// Fails if the manifest, the contract source, the frontend env, the README or the docs disagree.
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (p) => (existsSync(join(root, p)) ? readFileSync(join(root, p), "utf8") : null);
const ADDR = /0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g;
const HASH = /^0x[0-9a-fA-F]{64}$/;
const errors = [];
const fail = (m) => errors.push(m);

const manifestText = read("deployments/studionet.json");
if (!manifestText) { console.error("deployments/studionet.json is missing"); process.exit(1); }
const m = JSON.parse(manifestText);

// --- structure -------------------------------------------------------------
if (m.schemaVersion !== 2) fail("manifest.schemaVersion must be 2");
if (m.network !== "studionet" || m.chainId !== 61999) fail("manifest must target studionet / chain 61999");
if (!["PENDING_DEPLOYMENT", "DEPLOYED_UNVERIFIED", "DEPLOYED_VERIFIED"].includes(m.status)) fail(`unknown manifest.status ${m.status}`);

// --- the source in the repo is the source the manifest describes ---------------
const src = read(m.contract?.file ?? "contracts/settleit.py");
if (src === null) fail(`contract file ${m.contract?.file} is missing`);
else {
  const sha = createHash("sha256").update(src).digest("hex");
  if (sha !== m.contract?.sha256) fail(`contracts source sha256 ${sha} != manifest.contract.sha256 ${m.contract?.sha256} (update the manifest in the same commit as any contract change)`);
  const v = /^CONTRACT_VERSION = "([^"]+)"/m.exec(src)?.[1];
  if (v !== m.contract?.version) fail(`CONTRACT_VERSION ${v} != manifest.contract.version ${m.contract?.version}`);
}

// --- deployment record ---------------------------------------------------------
const d = m.deployment ?? {};
const addr = d.address;
if (m.status === "PENDING_DEPLOYMENT") {
  for (const k of ["address", "txHash", "blockNumber", "blockTimestamp", "sourceCommit"]) if (d[k] != null) fail(`PENDING_DEPLOYMENT must not carry deployment.${k}`);
} else {
  if (!addr || !/^0x[0-9a-fA-F]{40}$/.test(addr)) fail("deployment.address is required once deployed");
}
if (m.status === "DEPLOYED_VERIFIED") {
  if (!HASH.test(d.txHash ?? "")) fail("DEPLOYED_VERIFIED needs deployment.txHash (0x + 64 hex)");
  if (!Number.isInteger(d.blockNumber)) fail("DEPLOYED_VERIFIED needs deployment.blockNumber");
  if (!d.blockTimestamp) fail("DEPLOYED_VERIFIED needs deployment.blockTimestamp");
  if (!/^[0-9a-f]{40}$/.test(d.sourceCommit ?? "")) fail("DEPLOYED_VERIFIED needs deployment.sourceCommit (40-hex git sha)");
  const o = m.onChainVerification ?? {};
  if (o.codeSha256Matches !== true || o.schemaMatches !== true) fail("DEPLOYED_VERIFIED needs onChainVerification.codeSha256Matches and schemaMatches === true");
  const s = m.liveSmokeTest ?? {};
  if (s.status !== "PASSED") fail("DEPLOYED_VERIFIED needs liveSmokeTest.status === PASSED");
  else {
    if (!s.evidenceFile || !existsSync(join(root, s.evidenceFile))) fail(`liveSmokeTest.evidenceFile ${s.evidenceFile} does not exist`);
    else {
      const ev = JSON.parse(read(s.evidenceFile));
      if ((ev.contractAddress ?? "").toLowerCase() !== (addr ?? "").toLowerCase()) fail("smoke-test evidence is for a different contract address");
      if (ev.contractSha256 !== m.contract?.sha256) fail("smoke-test evidence is for different contract source");
      if (ev.passed !== true) fail("smoke-test evidence does not say passed");
    }
    for (const k of ["create_case", "submit_response", "request_verdict"]) if (!HASH.test(s.txHashes?.[k] ?? "")) fail(`liveSmokeTest.txHashes.${k} missing or malformed`);
  }
}

// --- every other place that names an address must agree --------------------------
const superseded = new Set((m.supersedes ?? []).map((s) => s.address.toLowerCase()));
const active = addr ? addr.toLowerCase() : null;
const check = (label, text, { mustContainActive = false } = {}) => {
  if (text === null) return;
  const found = [...new Set((text.match(ADDR) ?? []).map((a) => a.toLowerCase()))];
  for (const a of found) if (a !== active && !superseded.has(a)) fail(`${label} mentions ${a}, which is neither the manifest address nor a recorded superseded deployment`);
  if (mustContainActive && active && !found.includes(active)) fail(`${label} does not mention the deployed address ${addr}`);
};
check("README.md", read("README.md"), { mustContainActive: m.status === "DEPLOYED_VERIFIED" });
for (const f of existsSync(join(root, "docs")) ? readdirSync(join(root, "docs")) : []) check(`docs/${f}`, read(`docs/${f}`));
for (const f of [".env.example", ".env.production", ".env.local"]) {
  const t = read(`frontend/${f}`);
  if (t === null) continue;
  const val = /^NEXT_PUBLIC_CONTRACT_ADDRESS=(.*)$/m.exec(t)?.[1]?.trim();
  if (val && active && val.toLowerCase() !== active) fail(`frontend/${f} points at ${val}, manifest says ${addr}`);
  if (val && !active && m.status === "PENDING_DEPLOYMENT" && f !== ".env.local") fail(`frontend/${f} sets an address but the manifest is PENDING_DEPLOYMENT`);
}

if (errors.length) { for (const e of errors) console.error("✗ " + e); process.exit(1); }
console.log(`manifest ok: status=${m.status}, contract v${m.contract.version} sha256 ${m.contract.sha256.slice(0, 12)}…${addr ? ", address " + addr : ", no address yet"}`);
