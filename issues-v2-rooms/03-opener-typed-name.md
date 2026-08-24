---
id: S3
title: "The bet opener also identifies with a typed display name, not an 'acting as' dropdown"
labels: [slice, rooms]
depends_on: [S1]
milestone: "v2 — Ephemeral Rooms"
---

## Slice

Opening a new bet asks for the opener's own display name (typed), instead of picking "acting as" from a dropdown of pre-known squad members.

## Why this one now

Consistency: S2 makes joiners ad-hoc, but the opener currently still picks from the same fixed-roster dropdown v2 is retiring everywhere else. This closes that gap. It only depends on S1 (a room needs to exist for identity to attach to), not on S2, so it can be built in parallel with S2 if useful.

## Demo

1. Go to `/bets/new`.
2. See a text field for "Your name" instead of an "Acting as" dropdown.
3. Type a name never seen before, e.g. "Marco", fill in match/stake/prediction, submit.
4. Land on the new bet's room page; observe "Marco" listed as the opener/first participant.

Expected: no dropdown of existing names anywhere on this form.

## Scope

- [ ] `NewBetForm.tsx`'s "Acting as" `<select>` replaced with a text input for display name
- [ ] `POST /api/bets` accepts a name string for the opener instead of `createdBy: memberId`
- [ ] Same name-validation rules as S2's join flow (non-empty, reasonable length) — reuse rather than reinvent

## Out of scope

- Anything about joining as a second/third participant → S2
- Removing `squad_members` → S7

## Acceptance criteria

- [ ] Given the open-a-bet form, when a typed name, match, stake, and prediction are submitted, then the new bet's room shows that name as the opener
- [ ] Given the open-a-bet form, there is no dropdown or list of pre-existing names anywhere on it

## Implementation notes

- `app/src/app/bets/new/NewBetForm.tsx` and `app/src/app/api/bets/route.ts`
- Reuse whatever name-validation helper S2 introduces rather than duplicating the rule in two places — if S2 lands first, import from there; if this lands first, extract a shared helper when S2 catches up

## Open questions

None beyond what's already flagged on S2 (name-matching rules apply equally to the opener).

## Depends on

S1

## Unblocks

S7
