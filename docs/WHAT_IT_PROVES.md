# What Settleit proves — and what it does not

Applies to contract v2.0.0 (`contracts/settleit.py`). The deployment record is `deployments/studionet.json`; check its `status` before relying on any statement below about a live deployment.

## What the system does prove
- **Who did what, and when.** Cases, responses, evidence items, verdicts, reviews and votes are on-chain with sender addresses. `get_case_history` is an append-only, paginated event log.
- **The verdict came from GenLayer consensus**, not from an operator. The contract has no admin role and no override entry point (`get_protocol_info` reports `admin_powers: false`, `verdict_override_possible: false`).
- **Consensus-bound fields.** Validators must independently agree on: favoured party, fault split (within a tolerance of 10 points), confidence bucket, evidence quality, the primary reason code and, for INCONCLUSIVE, the basis for insufficiency.
- **What the validators were shown.** URL evidence is fetched by the validators during adjudication (`gl.nondet.web.render`, text mode, truncated to 6000 chars per URL). The SHA-256 of every fetched page and a combined digest are stored with the verdict (`evidence_digest`, `evidence_sources`). If any URL is unreachable or empty, no verdict is produced.
- **Originals are preserved.** A review (one per case, needs new evidence) is stored as a separate round-2 verdict; round 1 is never overwritten.
- **Finality is reported honestly.** The UI shows Accepted as provisional and only Finalized as final.

## What it does NOT prove
- **That the verdict is correct or fair.** It proves what a quorum of LLM validators concluded from the material they saw, nothing more.
- **That the evidence is true.** Text evidence is a party's own assertion. A URL digest proves what the validators fetched at that moment, not that the page is authentic, unaltered later, or reflects what happened.
- **That the fetched page is stable.** Dynamic pages can differ between validators; that causes disagreement (no verdict), not a wrong stored digest.
- **Identity.** Addresses are not people. One person can hold many wallets (including as claimant and respondent).
- **Prompt-injection immunity.** User text and fetched pages are JSON-isolated, the output schema is closed and validated, and tests cover injection strings, but a model can still be swayed on a genuinely ambiguous case.
- **Leader-written prose is authoritative.** `summary`, `remedy` and `secondary_reason_codes` are written by the leader and are **not** consensus-bound; they are labelled non-authoritative in contract data and the UI.
- **Votes mean anything.** Community votes are a social signal, one per wallet, and never change a verdict.
- **Privacy.** Everything is public on-chain. "Unlisted" only hides a case from the feed.
- **Legal effect, enforcement or payment.** None.
- **Audit.** The contract has not been independently audited.

## What the repository does not prove by itself
A passing CI run proves the source, direct-mode tests and frontend build. It does not prove that a particular address on StudioNet runs this source. That is established only by `scripts/record_deployment.py` (byte-compares on-chain code and schema with the repo) and `scripts/live_verify.py` (real lifecycle); their output is committed under `deployments/evidence/`. CI (`check:address`) fails if the manifest, README, env files and contract source disagree, and refuses `DEPLOYED_VERIFIED` without that evidence.
