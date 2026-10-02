// Repo guardrails (runs without extra deps). Fails on patterns the product forbids.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOTS = ["app", "components", "lib"];
const RULES = [
  [/dangerouslySetInnerHTML/, "dangerouslySetInnerHTML is forbidden (untrusted on-chain text)"],
  [/\b(supabase|firebase|firestore|mongoose|prisma|axios)\b/i, "backend/DB dependency or reference is forbidden"],
  [/\bprivate case\b|"Private"|>Private</i, "use Public/Unlisted, never 'private'"],
  [/process\.env\.(?!NEXT_PUBLIC_CONTRACT_ADDRESS|NODE_ENV)\w*/, "only NEXT_PUBLIC_CONTRACT_ADDRESS may be read from env"],
  [/0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/, "hardcoded address in source (use NEXT_PUBLIC_CONTRACT_ADDRESS)"],
  [/\bappeal(s)?\b.{0,40}\b\d+\s*(s|sec|min|hour|h)\b/i, "hardcoded appeal countdown is forbidden"],
];
const SKIP = /\.test\.ts$/;
let bad = 0;
function walk(d) {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) { if (n !== "node_modules") walk(p); continue; }
    if (!/\.(ts|tsx|css)$/.test(n) || SKIP.test(n)) continue;
    const text = readFileSync(p, "utf8");
    text.split("\n").forEach((line, i) => {
      for (const [re, msg] of RULES) if (re.test(line)) { console.error(`${p}:${i + 1}: ${msg}`); bad++; }
    });
  }
}
ROOTS.forEach(walk);
if (bad) { console.error(`${bad} lint problem(s)`); process.exit(1); }
console.log("lint ok");
