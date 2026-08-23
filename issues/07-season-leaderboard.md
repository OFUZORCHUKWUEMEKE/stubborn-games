---
id: S7
title: "A leaderboard shows each squad member's running points and record"
labels: [slice, leaderboard]
depends_on: [S5]
milestone: "Points MVP"
---

## Slice

Any squad member can view a leaderboard page showing every member's current points total and win/loss record across all settled bets.

## Why this one now

The PRD lists this as a day-one feature, not a later add, and it only becomes meaningful once bets can actually settle (S5) — before that there's no outcome data to aggregate.

## Demo

1. Settle a few bets across two or three squad members (via S5, using seeded matches with known outcomes).
2. Go to `/leaderboard`.

Expected: the page lists each squad member with their current points balance and a win/loss count, sorted by points descending.

## Scope

- [ ] `GET /leaderboard` page aggregating settled-bet outcomes per squad member
- [ ] Shows points balance and win/loss record per member
- [ ] Sorted by points balance, descending

## Out of scope

- Historical trend charts, streaks, "biggest talker" style stats — not specified in the PRD beyond "who's actually up" and "who talks the biggest game," which this slice covers at the simplest level (points + record); anything fancier is a future enhancement, not this slice
- Per-squad leaderboards if multiple squads exist — out of scope per S1's single-seeded-squad assumption

## Acceptance criteria

- [ ] Given several settled bets with known outcomes, when the leaderboard loads, then each squad member's points and win/loss record match what actually happened in those bets
- [ ] Given a squad member who hasn't participated in any bet, they still appear on the leaderboard with their starting balance and a 0-0 record

## Implementation notes

- Reads from the settlement data introduced in S5 (per-participant payout/outcome) — no new write path, this is a read/aggregation slice
- Simple SQL aggregation is sufficient; no need for a separate materialized/cached leaderboard table at this scale (4-6 people)

## Open questions

None.

## Depends on

S5

## Unblocks

(none)
