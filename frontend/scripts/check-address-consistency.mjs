// Verifies README, deployments/studionet.json and frontend/.env.* agree on the contract address.
import { existsSync, readFileSync } from "node:fs";
const root = new URL("../../", import.meta.url).pathname;
const rd = (p) => (existsSync(root + p) ? readFileSync(root + p, "utf8") : null);
const RE = /0x[0-9a-fA-F]{40}(?![0-9a-fA-F])/g;
const manifest = JSON.parse(rd("deployments/studionet.json") ?? "{}");
const addr = manifest.contractAddress;
if (!addr) { console.log("PENDING: deployments/studionet.json has no contractAddress yet (not deployed)."); process.exit(0); }
const sources = { manifest: [addr], readme: rd("README.md")?.match(RE) ?? [], env: rd("frontend/.env.local")?.match(RE) ?? [], envProd: rd("frontend/.env.production")?.match(RE) ?? [] };
let bad = false;
for (const [k, v] of Object.entries(sources)) for (const a of v) if (a.toLowerCase() !== addr.toLowerCase() && k !== "readme") { console.error(`${k} has ${a}, expected ${addr}`); bad = true; }
if (!(sources.readme.some((a) => a.toLowerCase() === addr.toLowerCase()))) { console.error("README does not mention the deployed address"); bad = true; }
process.exit(bad ? 1 : 0);
