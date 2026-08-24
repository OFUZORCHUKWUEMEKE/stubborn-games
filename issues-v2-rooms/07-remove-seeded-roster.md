---
id: S7
title: "Fixed 5-person seeded roster removed — rooms are the only source of participants"
labels: [slice, rooms]
depends_on: [S2, S3, S4]
milestone: "v2 — Ephemeral Rooms"
---

## Slice

A fresh install of the app no longer seeds 5 hardcoded squad members (Dele, Chidi, Amara, Tunde, Ngozi) with starting point balances — `squad_members` as a persistent roster concept is removed, since every identity is now ad-hoc and per-room (S2, S3) with no stored balance to seed (S4).

## Why this one now

Deliberately last. It's only safe to drop the seeded roster once nothing in the app still depends on it existing — that's true only after S2 (joiners), S3 (opener), and S4 (balance check) have all landed and no longer reference `squad_members` as a fixed list.

## Demo

1. Delete the local dev database (`squad-picks.db*`) to simulate a fresh install.
2. Start the app.
3. Confirm no pre-existing named members appear anywhere — the only way a name exists in the app is by someone typing it when opening or joining a room.
4. Open a bet, join it under a new name, settle it — confirm the full v2 flow still works with zero seed data.

Expected: the app is fully functional with an empty database on first run.

## Scope

- [ ] Remove the `squad_members` seed block from `lib/db.ts`'s `seed()` function
- [ ] Remove or repurpose the `squad_members` table itself, depending on what S2/S4 actually left behind (if `bet_participants.member_id` was dropped in favor of `display_name`, this table may be fully removable; if not, resolve that now rather than leaving a half-used table)
- [ ] Update `app/README.md` / any setup docs that reference the seeded names

## Out of scope

- Any new identity/account system — explicitly not what this phase is about (PRD-v2 non-goals)

## Acceptance criteria

- [ ] Given a completely empty database, when the app starts, then no pre-named members exist anywhere
- [ ] Given the full open → join → chat → settle flow run against a fresh database, it completes successfully using only names typed during that flow

## Implementation notes

- `app/lib/db.ts` — the `seed()` function currently inserts the 5 names unconditionally on first run; delete that block
- Check every remaining query in `lib/`, `api/`, and page components for a lingering `JOIN squad_members` or `squad_members.id` reference before considering this done — this is the slice most likely to reveal a spot S2-S4 missed

## Open questions

None beyond what S2/S4 already flagged about the table's exact fate.

## Depends on

S2, S3, S4

## Unblocks

(none — closes out this plan)
