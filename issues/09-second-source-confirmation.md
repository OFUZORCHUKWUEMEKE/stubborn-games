---
id: S9
title: "Settlement waits when the backup data source disagrees with the primary"
labels: [slice, data-integration]
depends_on: [S2, S5]
milestone: "Points MVP"
---

## Slice

Before a bet auto-settles, the app checks the match's finished status/result against API-Football as a second source; if the two sources disagree, settlement holds (doesn't pay out) instead of trusting the primary scraper alone.

## Why this one now

This directly implements the "we check multiple feeds for confirmation" decision from the source conversation, deferred until after the single-source path (S2, S5) is proven — matching the ordering heuristic of shipping breadth (a second source) only after the first one works. It's the last risk-reduction slice on the data side before this MVP is considered done.

## Demo

1. Settle a bet normally (S5) where both `livescore-pp-cli` and API-Football agree on the result — confirm it settles as before.
2. Simulate a disagreement (e.g. a test double or a manually mismatched fixture mapping between the two sources).
3. Attempt settlement on that bet.

Expected: in the agreement case, settlement proceeds exactly as in S5. In the disagreement case, the bet stays in a "pending confirmation" state rather than settling, and this is visible on the bet page.

## Scope

- [ ] Integration with API-Football as a second, independent read of a match's result
- [ ] Comparison logic: primary (livescore CLI) vs. secondary (API-Football) result for the same match
- [ ] On agreement, settlement proceeds as in S5; on disagreement, bet enters a "pending confirmation" state instead of settling
- [ ] Bet page shows "pending confirmation" distinctly when this occurs

## Out of scope

- Automatic resolution of a disagreement (e.g. a third source, human override UI) — a disagreement just holds; resolving it is future work
- Using API-Football for anything other than this confirmation check (e.g. as a primary source) — that's a real-money-phase decision per the PRD, not this slice

## Acceptance criteria

- [ ] Given both sources agree a match is finished with the same result, when settlement runs, then it proceeds and pays out as in S5
- [ ] Given the two sources disagree (or one is unavailable), when settlement runs, then the bet enters "pending confirmation" and no payout occurs
- [ ] A bet in "pending confirmation" is clearly distinguishable from "locked" and "settled" on the bet page

## Implementation notes

- API-Football requires its own client/credentials — confirm the account/tier being used actually covers this read pattern before relying on it (the PRD flags API-Football's wagering-ToS coverage as an unverified claim; this slice at least needs read access to work at all, independent of that larger legal question)
- Matching a `livescore-pp-cli` fixture to the equivalent API-Football fixture requires some id-mapping; a manual/seeded mapping for the demo's matches is acceptable rather than a general fuzzy-matching system

## Open questions

- What resolves a "pending confirmation" bet once it happens for real — does it stay pending forever, get a manual admin override, or retry after a delay? Not specified anywhere in the source material; worth deciding before this state can occur in front of real users, even at the points stage.

## Depends on

S2, S5

## Unblocks

(none)
