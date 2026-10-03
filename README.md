# Settleit

**Two sides. One dispute. Let the jury settle it.**

A GenLayer-native social dispute adjudication dApp: a Next.js frontend and one Intelligent Contract (v2.0.0). No backend, no database. Targets **GenLayer StudioNet** (chain id 61999).

## Reviewer verification
| Item | Value |
|---|---|
| Production URL | https://settleit-deynu.vercel.app (currently serves the **v1** build; v2 is on branch `v2-hardening`) |
| Chain | StudioNet, id 61999 |
| Contract address (v2) | **not deployed yet** — see `deployments/studionet.json` |
| Deploy tx hash | pending |
| Source commit / SHA-256 | SHA-256 `70d49f97d72e916cae7717be5e66f1142ca69f98e3ca7e46dd80fd7d6345d5f2`; commit recorded at deployment |
| Live smoke-test txs | pending — none have been run |
| Build commit shown in app | footer and `/version.json`; `/verify` shows chain, address and manifest |

Manifest status is `PENDING_DEPLOYMENT`. This table is filled in only from `deployments/studionet.json` and `deployments/evidence/` once `scripts/record_deployment.py` and `scripts/live_verify.py` have actually succeeded (CI enforces consistency). The v1 contract `0x7BaD…846d8` is superseded and was never verified.

**Live test steps (after deployment):** open the production URL → check `/verify` (chain 61999, address equals the manifest, build commit equals the repo commit) → connect wallet A, create a case naming wallet B → connect wallet B (separate browser profile), respond → either party requests the verdict → wait for **Finalized** (Accepted is provisional) → confirm the verdict and evidence digest, and open each tx in the explorer link. Scripted equivalent: `python scripts/live_verify.py`.

## Status (what has and has not been run)
| Item | State |
|---|---|
| Contract lint | CI job `lint-contracts` |
| Direct tests | 330 pass locally; CI job `test-direct` |
| Script tests | 13 pass locally (`tests/scripts`) |
| Frontend test/typecheck/lint/build | CI job `frontend` |
| Deployment of v2, on-chain source verification | **not done** |
| Live StudioNet lifecycle, two-wallet browser test | **not done** |
| Real-wallet E2E | **not done** |

## What it proves
See [docs/WHAT_IT_PROVES.md](docs/WHAT_IT_PROVES.md). In short: it records, on-chain, what a GenLayer validator quorum concluded from the case text and from URL evidence the validators fetched themselves (digest stored). It does not prove the verdict is right, that evidence is true, or who a wallet's owner is.

## Quick start
```bash
pip install -r requirements.txt
genvm-lint check contracts/settleit.py
pytest tests/direct/ tests/scripts/ -v
cd frontend && cp .env.example .env.local   # set NEXT_PUBLIC_CONTRACT_ADDRESS after deploying
npm install && npm test && npm run typecheck && npm run lint && npm run dev
```
Deployment and verification: [docs/DEPLOYMENT_VERIFICATION.md](docs/DEPLOYMENT_VERIFICATION.md).

## Docs
[Product spec](docs/PRODUCT_SPEC.md) · [Protocol design](docs/PROTOCOL_DESIGN.md) · [What it proves](docs/WHAT_IT_PROVES.md) · [Test plan](docs/TEST_PLAN.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Deployment & verification](docs/DEPLOYMENT_VERIFICATION.md) · [Security](docs/SECURITY.md)

## Things to know
- Accepted is **provisional**; only Finalized is final. Undetermined means no consensus.
- Each case allows one evidence-bound review (new evidence required); the original verdict is kept separately.
- Community votes are non-authoritative and never change a verdict.
- No admin or override powers exist in the contract.
- Public = listed; Unlisted = not featured. Neither is private.
- Settleit is social adjudication and entertainment, not legal, medical or emergency advice.
