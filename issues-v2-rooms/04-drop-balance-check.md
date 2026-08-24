---
id: S4
title: "Stake is no longer checked against a stored points balance"
labels: [slice, rooms]
depends_on: [S2]
milestone: "v2 — Ephemeral Rooms"
---

## Slice

Joining or opening a bet no longer rejects a stake for "insufficient points" — there's no persistent balance left to check it against once identity is ad-hoc and per-room (PRD-v2 open question #1). Settlement still correctly splits each room's pot using only that room's own stakes.

## Why this one now

Directly follows S2: the balance check being removed lives inside the join flow S2 just rewrote. Waiting until after S2 avoids editing code that was about to change shape anyway.

## Demo

1. Join a room (S2) with a stake, as a brand-new name with no prior history in the app.
2. Observe the join succeeds regardless of stake size — there's no balance to be "insufficient" against.
3. Let the room settle (existing settlement flow, unchanged). Observe the payout still correctly splits that room's pot among correct pickers, computed purely from that room's own participants and stakes.

Expected: settlement math is unaffected — this slice only removes a now-meaningless pre-check, not the payout calculation itself.

## Scope

- [ ] Remove the "insufficient points" rejection from the join route and form
- [ ] Confirm `lib/settlement.ts`'s payout math still works using only in-room stake data (it should — the pot is already computed as `stake × participant count`, not from any external balance)
- [ ] Decide what, if anything, replaces the old points-balance display in the UI (e.g. `JoinBetForm.tsx` showed "(1000 pts — insufficient)" next to names; that affordance goes away with the dropdown in S2, so this may already be moot by the time this slice starts — verify rather than assume)

## Out of scope

- Any future real-money staking model — explicitly still gated behind `PRD.md`'s staging conditions, unaffected by this slice
- Redesigning what "points" should mean going forward beyond "a number used to split this room's pot" — that's the accepted default from PRD-v2, not something this slice re-opens

## Acceptance criteria

- [ ] Given a brand-new name with no history in the app, when they join a room with any positive integer stake, then the join succeeds
- [ ] Given a room with N participants each staking the same amount, when it settles with a winner, then the payout equals `(stake × N)` split among correct pickers — same math as v1, just without the balance gate in front of it

## Implementation notes

- `app/src/app/api/bets/[id]/join/route.ts` — remove the `member.points < betCore.stake` check (and whatever S2 left in its place, if S2 already touched this)
- `lib/settlement.ts` should need no changes — it never read from a stored balance for the pot calculation, only for crediting winnings after settlement, which itself may now be meaningless without persistent identity (see Open Questions)

## Open questions

- v1's settlement credits winnings back to `squad_members.points` after a room settles. Once identity is ad-hoc and per-room, does that credit go anywhere meaningful, or does it become a no-op / removed entirely? Not decided in source — flagging rather than silently keeping or dropping it.

## Depends on

S2

## Unblocks

S7
