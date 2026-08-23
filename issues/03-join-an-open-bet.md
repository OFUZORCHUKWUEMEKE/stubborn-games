---
id: S3
title: "Other squad members can join an open bet with their own stake and pick"
labels: [slice, betting]
depends_on: [S1]
milestone: "Points MVP"
---

## Slice

A squad member other than the opener can view an open bet and join it — matching the stake, locking in their own win/lose/draw prediction — and the bet page then shows every participant and their pick.

## Why this one now

This is the second half of the core loop's social mechanic (the "squad piles in" part of the pitch) and is needed before kickoff-locking (S4) or settlement (S5) mean anything, since both of those only make sense once more than one person can be in a bet.

## Demo

1. As the opener (from S1), create a bet with a 100-point stake.
2. Switch to a second seeded squad member.
3. Open the bet's page, click "Join", select a prediction, submit.
4. Reload the bet page as either member.

Expected: the bet page lists both participants with their individual stakes and predictions. No kickoff enforcement yet (that's S4) — joining is allowed regardless of match timing in this slice.

## Scope

- [ ] `POST` endpoint to join an existing open bet: participant, prediction (stake amount is fixed to match the opener's, per PRD)
- [ ] Bet page lists all current participants and their predictions
- [ ] A participant can only join a given bet once (no double-joining)
- [ ] A squad member's points balance is validated as sufficient before joining (assumption — see Implementation notes)

## Out of scope

- Preventing joins after kickoff → S4
- Settlement / payout → S5
- Leaving or changing a pick after joining — not mentioned in the PRD; out of scope entirely, not deferred

## Acceptance criteria

- [ ] Given an open bet with one participant, when a second squad member joins with a valid prediction, then both appear on the bet page with their own predictions
- [ ] Given a squad member who already joined a bet, when they attempt to join again, then it's rejected
- [ ] Given a squad member with fewer points than the bet's stake, when they attempt to join, then it's rejected with a clear message

## Implementation notes

- Reuses `bet_participants` from S1 — this slice is the second writer to that table, not a new model
- Points balance: PRD doesn't specify a starting balance or minimum-balance rule explicitly; assumption is that squad members start with a fixed seeded points balance (pick a round number, e.g. 1000) and joining a bet they can't afford is rejected, matching how a real-money stake would behave
- Stake is fixed to the opener's amount — the PRD says "each friend who joins puts in the same stake," so there's no per-joiner stake field, just a prediction

## Open questions

- Starting/seeded points balance amount is not specified in the PRD — picked an arbitrary round number for this slice; revisit if it matters for playtesting.

## Depends on

S1

## Unblocks

S4, S5
