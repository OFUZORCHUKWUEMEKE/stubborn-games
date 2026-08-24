---
id: S1
title: "Opening a bet generates a shareable room link"
labels: [slice, rooms]
depends_on: []
milestone: "v2 — Ephemeral Rooms"
---

## Slice

After opening a bet, the bet's page displays a shareable link (and/or short code) identifying that room, in a copy-friendly format, ready to paste into a group chat.

## Why this one now

Nothing else in the room-per-bet pivot means anything without a link to share first — this is the foundation every later slice in this plan builds on.

## Demo

1. Open a bet (existing flow at `/bets/new`).
2. Land on the bet's page.
3. Observe a clearly labeled "Share this room" link/code, with a copy button or selectable text.
4. Open that exact link in a fresh browser session (no cookies/state) — it loads the same bet's room page.

Expected: the link is stable (same bet → same link every time) and requires no authentication to open.

## Scope

- [ ] A room identifier is generated (or derived) when a bet is created
- [ ] The bet page displays the shareable link/code prominently
- [ ] A copy-to-clipboard affordance (or at minimum, easily-selectable text)
- [ ] The link resolves to the existing bet page (no new join behavior yet — that's S2)

## Out of scope

- Actually joining via the link with a typed name → S2
- Any access control beyond "if you have the link, you can view it" → not planned this phase (see PRD-v2 Constraints: accepted MVP risk)
- Room expiry → PRD-v2 open question #3, not building against it this phase

## Acceptance criteria

- [ ] Given a newly created bet, when its page loads, then a shareable link/code is visible
- [ ] Given that link opened with no prior session/cookies, when it loads, then it reaches the same bet's room without requiring login
- [ ] Given the same bet viewed twice, the link/code is identical both times (not regenerated per view)

## Implementation notes

- `app/src/app/bets/[id]/page.tsx` is the natural place to render this — it's already the room's page in all but name
- Simplest viable implementation: the link is just `/bets/:id` (the bet's existing numeric id is already a de facto "code") — but see Open Questions below before committing to that
- If a non-sequential token is chosen instead, it likely wants its own column on `bets` (e.g. `room_token`), generated at creation time (`crypto.randomUUID()` or similar), with the route resolving by token instead of/alongside numeric id

## Open questions

- Is the bet's existing sequential numeric id acceptable as the "code," or does the private/invite-only framing (PRD.md: "the whole point is that it's *your* group, private, invite-only") call for an unguessable token instead, since sequential ids are easy to enumerate? Not decided in source — pick one and note the choice; leaning toward an unguessable token given the explicit "private" framing, but flagging rather than silently deciding.

## Depends on

(none — slice 1)

## Unblocks

S2, S3
