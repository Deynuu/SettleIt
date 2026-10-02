# Settleit — Deployment & Verification (StudioNet)

**Status: deployed manually via Studio (address in deployments/studionet.json); not yet verified.** The authoring sandbox cannot reach studio.genlayer.com from its shell, so no deployment, schema inspection or live smoke test was run. Nothing below has been executed by the author. Run it and record real values.

```bash
# NOTE: CLI flags below are from memory of the genlayer CLI; confirm with `genlayer --help` / `genlayer deploy --help`.
# 0. install
pip install -r requirements.txt && npm install
# 1. checks
genvm-lint check contracts/settleit.py
pytest tests/direct/ -v
# 2. deploy
genlayer network set studionet
genlayer deploy --contract contracts/settleit.py      # note address + tx hash
# 3. schema
genlayer schema <ADDRESS>                              # expect create_case, add_evidence, submit_response, request_verdict, cast_vote + views
# 4. record
#   edit deployments/studionet.json (address, tx hash, date, status: "DEPLOYED")
#   put the address in README.md and frontend/.env.local (NEXT_PUBLIC_CONTRACT_ADDRESS)
cd frontend && npm run check:address
# 5. live smoke
gltest tests/integration/ -v -s --network studionet
# 6. UI: cd frontend && npm run dev, then follow docs/DEMO_SCRIPT.md
```

## Acceptance
- Schema lists every method in `contracts/settleit.py`.
- Smoke test completes create → respond → verdict with real tx hashes (keep them in `deployments/studionet.json`).
- `npm run check:address` passes (README, manifest, env agree).
- If deploy fails on the runner hash, port per PROTOCOL_DESIGN "Risks".
