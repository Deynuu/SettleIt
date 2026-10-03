# Settleit — Deployment & Verification (StudioNet, chain 61999)

The source of truth is `deployments/studionet.json`. `status` is one of `PENDING_DEPLOYMENT`, `DEPLOYED_UNVERIFIED`, `DEPLOYED_VERIFIED`. CI refuses `DEPLOYED_VERIFIED` unless a passing live-test evidence file for the same address and source hash is committed.

Earlier address `0x7BaDaceAeD80bF571562359E3De02aA1eA8846d8` is **v1** (source sha 0301e264…), superseded and never verified. Do not use it.

## Steps (run by whoever holds the deploy key)
```bash
pip install -r requirements.txt
sha256sum contracts/settleit.py            # must equal contract.sha256 in the manifest
# 1. Deploy contracts/settleit.py in Studio / `genlayer deploy`; note the address and tx hash.
# 2. Verify on-chain source + schema and record the deployment (refuses on any mismatch):
python scripts/record_deployment.py --address 0x<ADDR> --tx-hash 0x<TX>
#    (add --block-number N --block-time ISO8601 if the RPC record omits them; the manifest marks them as manual)
# 3. Point the frontend at it: set NEXT_PUBLIC_CONTRACT_ADDRESS in Vercel and frontend/.env.production, then redeploy.
# 4. Live lifecycle with two throwaway keys (never committed):
export SETTLEIT_CLAIMANT_KEY=0x...  SETTLEIT_RESPONDENT_KEY=0x...
python scripts/live_verify.py [--evidence-url https://...]
# 5. Commit deployments/studionet.json and deployments/evidence/*, update the README "Reviewer verification" section.
cd frontend && npm run check:address
```

## Acceptance
- On-chain code is byte-identical to the repo source and schemas match (recorded in `onChainVerification`).
- Create → respond → verdict reached FINALIZED with real tx hashes in `liveSmokeTest`.
- `npm run check:address` passes.
- Production `/version.json` shows the commit the manifest was recorded against (or a later one that does not change the contract).
