# Settleit — Security Notes

- **No backend / no secrets.** Only `NEXT_PUBLIC_CONTRACT_ADDRESS` is read from env. Wallet keys never touch the app.
- **Untrusted text.** All case/evidence/verdict text is rendered by React as text; `dangerouslySetInnerHTML` is banned by `npm run lint`. Evidence links open with `rel="noreferrer noopener nofollow"` and are never fetched by the contract.
- **Prompt injection.** See PROTOCOL_DESIGN: JSON-fenced data, closed enums, schema validation, fail-closed validators, remedy blocklist. Not a guarantee against a model being swayed on a legitimately ambiguous case; the equivalence rules bound how far validators may diverge.
- **Access control.** Only the named respondent may respond; only the claimant adds evidence, and only before the response; only parties may request a verdict; parties cannot vote; one vote per wallet. All enforced in the contract and tested.
- **Permanence.** Everything is on-chain and inspectable. The create flow requires an explicit acknowledgment. "Unlisted" is not "private".
- **Sybil voting.** One vote per wallet is not one vote per human. Votes are a social signal and never change the verdict.
- **Known gaps.** No appeals on StudioNet; no rate limiting beyond chain costs; contract not independently audited.
