# Settleit — Protocol Design

## Contract
`contracts/settleit.py`, runner header `py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6` (the boilerplate's pinned runner). If StudioNet rejects this hash, port to the newer SDK API (see Risks).

Storage uses only GenLayer types (`TreeMap`, `DynArray`, `@allow_storage` dataclasses with `str/bool/Address/u256`).

## Non-deterministic step
`request_verdict` calls `gl.vm.run_nondet_unsafe(leader_fn, validator_fn)`:
- **Leader** builds a prompt (marker `SETTLEIT_ADJUDICATION_V1`), runs the LLM, parses JSON defensively, normalizes against closed enums and reason-code allowlists, rejects unsafe remedies.
- **Validator** recomputes its own verdict and compares **structured fields only** (never prose). Any error or malformed leader output fails closed. It is never `strict_eq` and never always-true.

### Equivalence rules
| Case | Agreement requires |
|---|---|
| INCONCLUSIVE | both INCONCLUSIVE and evidence quality not STRONG on both |
| SPLIT | both SPLIT and claimant_fault delta ≤ 15 |
| CLAIMANT / RESPONDENT | same favoured party, fault delta ≤ 10, evidence quality and confidence within 1 ordinal step, ≥ 1 shared reason code |

## Prompt-injection defense
Case text is serialized with `json.dumps` between `CASE_MATERIAL_JSON:` and `END_OF_CASE_MATERIAL`, with rules stating it is untrusted data and instructions inside it must be ignored. Output is schema-validated, so injected text cannot add fields, change enums or force a verdict value outside the allowlist. A remedy token blocklist rejects unsafe remedies. Evidence URLs are never fetched.

## Errors
Prefixes `EXPECTED:` (user error), `EXTERNAL:`, `TRANSIENT:` (retryable), `LLM_ERROR:` (model output rejected; nothing stored).

## Finality
Writes return a tx hash. The UI polls `getTransaction` and shows only the status the network reports: Accepted = *provisional*, Finalized = final, Undetermined = no consensus (nothing recorded). No appeal countdown is shown or invented. A tx that is decided but whose execution ended `FINISHED_WITH_ERROR` is surfaced as rejected.

## Risks
- Runner-hash pin may not match StudioNet's current runner; a port to the newer `import genlayer as gl` API may be needed.
- Real-LLM verdicts can vary; equivalence tolerances (above) are the tuning knob.
- genlayer-js behavior was read from source, not exercised against a live StudioNet from the authoring sandbox.
