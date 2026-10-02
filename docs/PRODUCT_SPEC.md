# Settleit — Product Spec (implemented scope)

**One line:** two sides, one dispute, a GenLayer jury settles it. Frontend + Intelligent Contract only; no backend, database or server-side adjudication. StudioNet only (chain id 61999).

## Flow
1. **Claimant** picks a court (category), names the respondent wallet, writes the question, their statement and up to 5 evidence items, chooses Public or Unlisted, acknowledges the permanence warning and signs `create_case`.
2. **Respondent** opens the link, connects, writes their side (+ evidence) and signs `submit_response`. Claimant evidence locks at that point.
3. Either **party** calls `request_verdict`. A validator panel produces a verdict; the result is stored on-chain.
4. **Everyone except the two parties** may cast one vote per wallet. The UI compares humans vs the jury.
5. Share links (`/case/[id]`), copy / native share / X post.

## Verdict semantics
`favored_party` is the side **less at fault**. Faults sum to 100. CLAIMANT/RESPONDENT need a gap > 20; SPLIT is a gap ≤ 20; INCONCLUSIVE is stored 50/50.

## Routes
`/` feed + hero · `/create` 8-step wizard (draft kept in localStorage) · `/case/[id]` state-dependent case page · `/about` · `/court/petty`.

## Visibility
Public = listed in the feed. Unlisted = not featured. Neither is private: anything on-chain is inspectable.

## Copy & safety
Canonical strings live in `frontend/lib/settleit/constants.ts` (`COPY`). The product is social adjudication/entertainment, not legal, medical, emergency or safety advice. Sensitive courts (relationships, family, money, work, crypto) never get a "sentence" styling.

## Design
ACID COURT: CSS tokens in `app/globals.css`, cut-corner panels, scoreboard bars, mobile-first (verified 320/375/430/1280 with no horizontal scroll in a static render), 16px inputs, focus-visible, aria-live status regions, reduced-motion support.

## Out of scope
Appeals (StudioNet does not support them), fetching URLs, accounts, notifications, any backend.
