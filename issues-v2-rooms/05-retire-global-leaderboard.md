---
id: S5
title: "Global leaderboard retired — each room's result stands on its own"
labels: [slice, rooms]
depends_on: [S2]
milestone: "v2 — Ephemeral Rooms"
---

## Slice

The season-long `/leaderboard` page is removed. A settled room's own result view (who predicted correctly, what they won) is confirmed to stand alone, with nothing implying it's part of a larger cross-room ranking.

## Why this one now

Depends on S2 because "who counts as a participant" changes shape once identity is ad-hoc — the per-room result view should reflect that before the season-wide page is pulled, so there's no gap where neither view makes sense.

## Demo

1. Settle a room (existing flow, unchanged).
2. View the room's page — confirm the settled result (who won, payout breakdown) still displays clearly, scoped to just this room.
3. Navigate to the old `/leaderboard` URL directly — confirm it no longer exists (404, or redirects to `/bets`).
4. Check the homepage and any other nav links — confirm the "Leaderboard" link is gone.

Expected: nothing in the app implies a ranking across rooms after this lands.

## Scope

- [ ] Remove `app/src/app/leaderboard/page.tsx` and its route
- [ ] Remove the "Leaderboard" link from the homepage and the bet-page footer nav
- [ ] Confirm the existing per-bet "Settled"/"Refund" sections on the room page (already built in v1) are sufficient as the room's own result view — extend copy/labeling only if genuinely unclear, don't rebuild what already works

## Out of scope

- Any new per-room "who's winning mid-match" ranking UI beyond what already exists — not requested, not building it speculatively
- Deleting the underlying leaderboard SQL aggregation logic from `lib/` if it's not directly tied to the removed page — only remove what's actually dead code once this lands

## Acceptance criteria

- [ ] Given the app after this change, visiting `/leaderboard` no longer shows a season-wide ranking page
- [ ] Given a settled room, its own result view is still fully visible and correct, unaffected by the leaderboard's removal
- [ ] No remaining UI text implies bets/rooms are ranked against each other

## Implementation notes

- `app/src/app/leaderboard/page.tsx` (delete), `app/src/app/page.tsx` and `app/src/app/bets/[id]/page.tsx` (remove the nav links)
- The existing settled-result rendering in `bets/[id]/page.tsx` (outcome text + participant table with Won/Lost/payout columns) is very likely already the right per-room result view — this slice is mostly subtractive

## Open questions

None — this is a removal, not a new design decision.

## Depends on

S2

## Unblocks

S7
