# Settleit — Security Notes

- **No backend / no secrets.** Only `NEXT_PUBLIC_CONTRACT_ADDRESS` is read from env. Wallet keys never touch the app.
- **Untrusted text.** All case/evidence/verdict text is rendered by React as text; `dangerouslySetInnerHTML` is banned by `npm run lint`. Evidence links open with `rel="noreferrer noopener nofollow"` and are fetched by validators only through `gl.nondet.web.render` after strict validation (https only, no credentials/ports/IP hosts/localhost or internal names, ≤300 chars). Fetch failure or empty content fails closed (no verdict).
- **Prompt injection.** See PROTOCOL_DESIGN: JSON-fenced data, closed enums, schema validation, separate JSON blocks for user text and fetched evidence, fail-closed validators, remedy blocklist. Not a guarantee against a model being swayed on a legitimately ambiguous case; the equivalence rules bound how far validators may diverge.
- **Access control.** Only the named respondent may respond (not after the 7-day deadline); only the claimant adds evidence, and only before the response; only parties may request a verdict, expire a case or request the single evidence-bound review; there is no admin or override role; parties cannot vote; one vote per wallet. All enforced in the contract and tested.
- **Permanence.** Everything is on-chain and inspectable. The create flow requires an explicit acknowledgment. "Unlisted" is not "private".
- **Sybil voting.** One vote per wallet is not one vote per human. Votes are a social signal and never change the verdict.
- **Known gaps.** The review path is a second contract-level adjudication, not a GenLayer protocol appeal; no rate limiting beyond chain costs; contract not independently audited.
