# Settleit

**Two sides. One dispute. Let the jury settle it.**

A GenLayer-native social dispute adjudication dApp: a Next.js frontend and one Intelligent Contract. No backend, no database, no server-side adjudication. Targets **GenLayer StudioNet** (chain id 61999).

## Status (honest)
| Item | State |
|---|---|
| `contracts/settleit.py` | written; 134 direct-mode tests pass in a local harness |
| `genvm-lint` full run | not run (source-level lint clean only) |
| Integration tests | written, **not run** |
| Frontend | written; typechecked against offline stubs only; **needs `npm install` + `npm run build`** |
| StudioNet deployment | deployed manually by you via Studio; **not yet verified** by schema inspection or smoke test; deploy tx hash not recorded |
| Contract address | `0x7BaDaceAeD80bF571562359E3De02aA1eA8846d8` |

Contract source SHA-256: `0301e264eaaf0efec89c2c57be018d30d83c362b84a5561c9305253b20bb6629`

## Quick start
```bash
pip install -r requirements.txt
genvm-lint check contracts/settleit.py
pytest tests/direct/ -v
npm install
cd frontend && cp .env.example .env.local   # set NEXT_PUBLIC_CONTRACT_ADDRESS after deploying
npm run typecheck && npm run lint && npm test && npm run dev
```
Deployment, schema inspection and the live smoke test: [docs/DEPLOYMENT_VERIFICATION.md](docs/DEPLOYMENT_VERIFICATION.md).

## Docs
[Product spec](docs/PRODUCT_SPEC.md) · [Protocol design](docs/PROTOCOL_DESIGN.md) · [Test plan](docs/TEST_PLAN.md) · [Demo script](docs/DEMO_SCRIPT.md) · [Deployment & verification](docs/DEPLOYMENT_VERIFICATION.md) · [Security](docs/SECURITY.md)

## Things to know
- Accepted is **provisional**; only Finalized is final. Undetermined means no consensus.
- Appeals are not available on StudioNet; the UI shows no appeal countdown.
- Public = listed; Unlisted = not featured. Neither is private.
- Settleit is social adjudication and entertainment, not legal, medical or emergency advice.
