---
id: S2
title: "A friend joins a room by typing a display name — no dropdown, no fixed roster"
labels: [slice, rooms]
depends_on: [S1]
milestone: "v2 — Ephemeral Rooms"
---

## Slice

Opening a room's link (from S1) and joining it means typing a display name — not picking from a dropdown of pre-known squad members — then staking points and making a prediction, same as v1's join flow otherwise.

## Why this one now

This is the actual identity pivot: the point where "pick who you are from 5 known names" becomes "anyone with the link types who they are." Everything else in the ephemeral-room model (S3, S4, S5, S7) either follows this pattern or depends on it existing first.

## Demo

1. Open a bet, get its room link (S1).
2. Open the link in a fresh session.
3. See a join form: a text field for display name (not a dropdown), a stake input, a prediction picker.
4. Type a name that has never appeared in this app before, e.g. "Zara", set a stake, pick a result, submit.
5. Observe "Zara" now listed as a participant on the room page.

Expected: no list of existing names to pick from anywhere in this flow — just a text field.

## Scope

- [ ] Join form replaces the member-`<select>` dropdown with a text input for display name
- [ ] `POST /api/bets/:id/join` accepts a name string instead of `memberId`
- [ ] Basic validation: non-empty name, reasonable max length (matching the existing chat message length pattern, e.g. `lib.ts`/chat route's 500-char cap is a reasonable precedent — pick something smaller and sensible for a name)
- [ ] Stake and prediction inputs unchanged from v1's join form otherwise
- [ ] A participant record is created against whatever name was typed — no lookup against a pre-existing roster

## Out of scope

- Whether stake still validates against a stored balance → S4 (this slice can keep the existing check working against whatever `squad_members` still exists, or stub it out — S4 owns the real decision)
- The opener's own identity capture → S3
- Removing `squad_members` as a table → S7 (this slice may still read/write it if that's the simplest path; full removal is later, once nothing depends on it)
- Preventing two people from typing the same name in one room, or someone typing a name that isn't theirs → explicitly out of scope this phase (PRD-v2 Constraints: accepted MVP risk, not solved now)

## Acceptance criteria

- [ ] Given a room's join form, when a never-before-seen name is typed with a valid stake and prediction, then that name appears as a participant on the room page
- [ ] Given the join form, there is no dropdown, select, or any list of pre-existing names to choose from
- [ ] Given a duplicate join attempt (same name, same room), the existing "already joined" rule from v1 still applies in some form — exact matching behavior (case-sensitivity, whitespace) is an open question below, not silently decided

## Implementation notes

- `app/src/app/bets/[id]/JoinBetForm.tsx` — replace the `<select>` populated from `members` with a `<input type="text">`, remove the `joinedMemberIds`/eligibility-filtering logic that assumed a fixed roster
- `app/src/app/api/bets/[id]/join/route.ts` — accepts `{ name: string, prediction: ... }` instead of `{ memberId: number, prediction: ... }`
- `bet_participants` likely needs a `display_name` column (nullable `member_id` FK, or drop the FK requirement entirely) — a schema decision, not just a route change
- This is the largest slice in the plan; if it exceeds a day's work, the natural split is: backend (schema + route) first, then the form

## Open questions

- Exact "already joined" matching rule for typed names (case-sensitive? trimmed whitespace only?) — not specified in source, pick something reasonable and note it
- Whether `bet_participants.member_id` becomes nullable or is dropped entirely in favor of `display_name` — affects how much of S7's cleanup this slice does early vs. defers

## Depends on

S1

## Unblocks

S4, S5, S7
