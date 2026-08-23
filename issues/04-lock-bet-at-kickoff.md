---
id: S4
title: "A bet locks at kickoff — no new joins, no pick changes"
labels: [slice, betting]
depends_on: [S3]
milestone: "Points MVP"
---

## Slice

Once a match's kickoff time passes, its bet stops accepting new participants, and the bet page shows a "locked" status instead of "open".

## Why this one now

The PRD is explicit that this is a hard rule ("once kickoff hits, the bet is locked — no backing out, no changing your pick"), and it has to exist before settlement (S5) does, otherwise a bet could theoretically be joined or altered after the match has already started or finished.

## Demo

1. Seed a match whose kickoff time is a few minutes in the future.
2. Create and join a bet on it (S1 + S3) before kickoff — succeeds as before.
3. Wait until the seeded kickoff time passes (or seed a match whose kickoff is already in the past).
4. As a third squad member, attempt to join the same bet.

Expected: the join attempt is rejected with a message indicating the bet is locked, and the bet page shows "locked" instead of "open" once kickoff has passed.

## Scope

- [ ] Bet status derives from comparing current time to the match's kickoff time (open before, locked at/after)
- [ ] Join endpoint (S3) rejects attempts on a locked bet
- [ ] Bet page displays the current status (open/locked) prominently

## Out of scope

- Settlement / payout on lock → S5 (locking and settling are different events — a bet stays locked, not yet settled, for the duration of the match)
- Any pick-change endpoint — never existed (see S3's out-of-scope), so there's nothing to block here beyond joining

## Acceptance criteria

- [ ] Given a bet whose match kickoff is in the future, when a squad member joins, then it succeeds
- [ ] Given a bet whose match kickoff has passed, when a squad member attempts to join, then it's rejected and the bet page shows "locked"
- [ ] Given a locked bet, the existing participants and their picks from before lock are still visible unchanged

## Implementation notes

- No new table — this is a computed status based on `matches.kickoff_time` vs. now, applied in the join endpoint and the page render
- Kickoff time comes from the seeded match data (S1); doesn't yet depend on the live data source (S2) since kickoff time is scheduled, not live

## Open questions

None.

## Depends on

S3

## Unblocks

S5
