# Settleit — Test Plan

| Layer | Command | Status in authoring sandbox |
|---|---|---|
| Lint | `genvm-lint check contracts/settleit.py` | Source-level lint clean after fixes; the linter's validate/typecheck layers were **not** run here |
| Direct | `pytest tests/direct/ -v` | **134 passed** using a locally assembled harness (SDK v0.2.16 runner) |
| Integration | `gltest tests/integration/ -v -s` | **Not run** (needs StudioNet/Studio). Files compile only |
| Frontend unit | `cd frontend && npm test` | 3 test groups pass under `tsx --test` |
| Frontend typecheck | `npm run typecheck` | Passed only against offline stubs; **re-run after `npm install`** |
| Frontend lint | `npm run lint` | Guardrail script passes |
| Visual | static SSR render, Playwright at 320/375/430/1280 | no horizontal scroll (found and fixed one overflow) |

## Direct tests cover
create/respond validation, access control, evidence limits and locking, adjudication flow with mocked LLM, malformed/injection outputs, validator agree/disagree matrix, voting rules, views and pagination, pickling.

## Integration (to run)
`tests/integration/test_settleit.py`: hero "Chicken in the Fridge" lifecycle under real consensus, access control, an ambiguous case. LLM output is real, so assertions check structure and allowed values, not exact prose.

## Manual UI checklist
Connect → wrong network prompt → create case → open link as respondent → respond → summon jury → provisional shown → Finalized only when reported → vote as third wallet → party blocked from voting → share.
