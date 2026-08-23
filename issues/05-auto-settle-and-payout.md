---
id: S5
title: "A finished match automatically settles its bet and pays out points"
labels: [slice, betting, data-integration]
depends_on: [S2, S4]
milestone: "Points MVP"
---

## Slice

When a real match (tracked via S2) reaches a finished state, its bet automatically determines the correct result, pays out the pot in points to whoever predicted correctly (splitting evenly if more than one), and the bet page shows the final settled state — with no manual/admin step.

## Why this one now

This is the actual value proposition of the product — "no admin work needed... paid out automatically, no argument, no chasing anyone down" — and it's the point where the walking skeleton (S1), the live data (S2), joining (S3), and locking (S4) all combine into the thing the PRD actually promises. It comes after the data source is proven read-only (S2) so that settlement logic isn't the first place a bad read is discovered.

## Demo

1. Seed a match that will finish soon (or use a completed real match for a dry run against historical data if the CLI supports it).
2. Create a bet, have two squad members join with different predictions, let it lock (S3 + S4).
3. Wait for the real match to reach a finished state per S2's data.
4. Reload the bet page.

Expected: the bet page shows "settled", the winning participant(s)' prediction highlighted, and their points balance increased by their share of the pot. The losing participant(s)' points balance reflects their stake having been paid out to the winner(s). No person had to click anything to trigger this.

## Scope

- [ ] A background process or on-view check that detects when a locked bet's match has reached "finished" per the S2 data source
- [ ] Resolution logic: compare each participant's prediction to the real result (win/lose/draw), determine correct picker(s)
- [ ] Payout logic: split the pot evenly among correct pickers; if none are correct, see Open questions
- [ ] Points balances update to reflect the payout
- [ ] Bet page shows "settled" with the final result and each participant's outcome

## Out of scope

- Abandoned/postponed/overturned matches → S8 (this slice only handles a clean finish)
- Cross-checking against a second data source before settling → S9
- Any fee deduction — the PRD's fee mechanism is explicitly unresolved (non-blocking open question in the PRD itself); this slice pays out the full pot with no fee

## Acceptance criteria

- [ ] Given a locked bet where one participant predicted the real final result correctly, when the match finishes, then that participant's points increase by the full pot and others' stakes are debited
- [ ] Given a locked bet where two participants predicted correctly, when the match finishes, then the pot splits evenly between them
- [ ] Given a locked bet still in progress, the bet page continues showing "locked", not a premature settlement
- [ ] Settlement happens without any admin/manual trigger in the demo

## Implementation notes

- "Finished" detection relies entirely on S2's status field from `livescore-pp-cli` — if that field is unreliable at the margins (stoppage time, extra time), this slice inherits that risk; flagged below rather than solved here
- A simple polling job (e.g. check locked bets every N minutes) is sufficient for this slice; a push/webhook-based design is not required
- New field/table: settlement outcome per bet, per-participant payout amount, for the leaderboard (S7) to read later

## Open questions

- What happens to the pot when **nobody** predicts correctly? The PRD's fee/rake conversation happened in the context of this exact scenario, but the final decision ("cut the rake entirely, flat fees") only says the app shouldn't take a percentage — it doesn't say what happens to an all-wrong pot. Reasonable default for this slice: refund everyone's stake (nobody profits, nobody loses) — but this isn't confirmed in the PRD and should be checked before shipping.
- What exactly counts as "the match has ended" for settlement purposes (full time vs. after stoppage/extra time/penalties)? Raised in the source conversation, never resolved. Assumption for this slice: whatever `livescore-pp-cli` reports as its terminal status is treated as final.

## Depends on

S2, S4

## Unblocks

S7, S8, S9
