# Settleit — Test Plan

Status values below are what has actually been run; see CI for the current commit.

| Layer | Command | Notes |
|---|---|---|
| Contract lint | `genvm-lint check contracts/settleit.py` | CI job `lint-contracts` (genvm-manager tag pinned in the workflow) |
| Direct | `pytest tests/direct/ -v` | 330 tests locally: lifecycle, authorization, replay, exact deadline boundaries, state transitions, invariants, validator-disagreement matrix per verdict class, malformed/oversized/invalid model output, unavailable/empty/contradictory/ambiguous evidence, prompt injection (claim, response, fetched page), seeded fuzz/property tests, votes never altering verdicts |
| Scripts | `pytest tests/scripts/ -v` | `record_deployment.py` and `live_verify.py` against fakes (refuse on mismatch, never guess block data) |
| Frontend | `cd frontend && npm test && npm run typecheck && npm run lint && npm run build` | CI job `frontend` |
| Manifest | `cd frontend && npm run check:address` | CI job `manifest-consistency` |
| Integration | `gltest tests/integration/ -v -s` | Needs Studio; not run in CI |
| Live lifecycle | `python scripts/live_verify.py` | Real StudioNet, two keys; evidence in `deployments/evidence/` |

## Not covered (be explicit)
- Browser E2E with real wallets has not been run. A mock-wallet browser test is limited to the wallet-guard logic; it does not prove behaviour with MetaMask or any real wallet.
- Real LLM validator behaviour is exercised only by the live script, not by direct-mode mocks.

## Manual UI checklist
Connect → wrong network prompt (switch/add) → create case (review plan, confirm) → open link as respondent in a second wallet → respond → request verdict → Accepted shown as provisional → Finalized shown only when reported → state re-read → explorer link works → party blocked from voting → `/verify` page shows address, chain id and build commit.
