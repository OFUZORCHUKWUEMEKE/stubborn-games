---
id: S8
title: "An abandoned or postponed match refunds every participant's stake"
labels: [slice, betting]
depends_on: [S5]
milestone: "Points MVP"
---

## Slice

When a match is marked abandoned, postponed, or its result is overturned, its bet refunds every participant's stake in full instead of settling a winner.

## Why this one now

This is a decided edge case in the PRD ("full refund to everyone in the pot, no partial settlement on an ambiguous result"), and it needs the settlement machinery from S5 to exist first, since a refund is really an alternate branch of settlement, not a separate system.

## Demo

1. Create and lock a bet (S1, S3, S4) on a seeded match.
2. Trigger the match's abandoned/postponed state (see Implementation notes for how, given the data source has no dedicated status for this).
3. Reload the bet page.

Expected: the bet shows a "refunded" status, not a winner/loser outcome, and every participant's points balance is back to what it was before they staked — no one gains or loses points.

## Scope

- [ ] A way to mark a bet's match as abandoned/postponed/overturned (see Implementation notes on trigger mechanism)
- [ ] Refund logic: every participant's stake is returned, bet status becomes "refunded"
- [ ] Bet page displays "refunded" distinctly from "settled"

## Out of scope

- Automatically detecting abandonment from the live data source — the CLI has no dedicated status field for this (see Implementation notes); fully automatic detection is future work, not this slice
- Partial refunds or any settlement logic on an ambiguous result — explicitly excluded by the PRD ("no partial settlement")

## Acceptance criteria

- [ ] Given a locked bet marked abandoned, when refund processing runs, then every participant's points balance returns exactly to their pre-stake amount
- [ ] Given a refunded bet, the bet page shows "refunded", not "settled" or "locked"
- [ ] A refunded bet cannot also be settled by S5's logic afterward (mutually exclusive end states)

## Implementation notes

- The `livescore-pp-cli` data source has no documented "abandoned" or "postponed" status field, so this slice uses a manual trigger (an admin-only action/endpoint) to mark a bet's match abandoned, rather than automatic detection — this is a pick-and-note judgment call, flagged as an open question below since the PRD didn't specify the trigger mechanism
- Shares the settlement state machine introduced in S5; "refunded" is a new terminal state alongside "settled"

## Open questions

- Should abandonment/postponement eventually be detected automatically from the data source, or stay a manual admin action? The PRD doesn't say; manual is the pragmatic default for a 4-6 person MVP where a squad member can just notice and flag it.

## Depends on

S5

## Unblocks

(none)
