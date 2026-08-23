---
id: S1
title: "A squad member opens a bet on a real match with a stake and a pick"
labels: [slice, betting]
depends_on: []
milestone: "Points MVP"
---

## Slice

A squad member can pick an upcoming real match from a short seeded list, set a points stake, make their own win/lose/draw prediction, and see the resulting open bet on its own page after submitting.

## Why this one now

This is the walking skeleton: one form, one endpoint, one row written, one page that renders it. Everything else in the product — joining, locking, settling, chat, leaderboard — is elaboration on this single path, so it has to exist first and it has to be real end to end, even though it's the only thing that works yet.

## Demo

1. Run the app locally, logged in as a seeded squad member (e.g. "Dele").
2. Go to `/bets/new`.
3. Pick a match from the seeded list, enter a stake (e.g. 100 points), select a prediction (win/lose/draw).
4. Submit.
5. Land on `/bets/:id` showing the match, the stake, Dele's prediction, and a status of "open".
6. Reload the page — the bet is still there.

Expected: the bet is persisted (survives reload) and nothing else in the flow (joining, locking, payout) exists yet — this slice is just open-and-view.

## Scope

- [ ] A small seeded/hardcoded list of real upcoming matches to pick from (no live match browsing/search)
- [ ] A small seeded set of squad-member accounts, no real signup/login (see Implementation notes)
- [ ] `POST` endpoint that creates a bet: match, stake (points), opener's prediction
- [ ] `GET /bets/:id` page rendering the bet's current state
- [ ] Basic input validation (stake > 0, prediction is one of win/lose/draw)

## Out of scope

- Other members joining the bet → S3
- Kickoff locking → S4
- Any real match data (score, status) → S2
- Settlement/payout → S5
- Chat → S6
- Leaderboard → S7
- Real authentication / squad invite flow — not a capability in the PRD; see PLAN.md open questions

## Acceptance criteria

- [ ] Given a seeded squad member and a seeded match, when they submit the open-bet form with a valid stake and prediction, then a bet is created and its page shows the match, stake, and prediction
- [ ] Given a stake of 0 or a missing prediction, when submitted, then the form rejects it with an inline error and no bet is created
- [ ] Reloading a bet's page after creation shows the same state (persisted, not in-memory only)

## Implementation notes

- Web app, e.g. Next.js + Postgres (assumption — no existing repo or stack to match; pick something conventional and move on)
- Squad members: seed 4-6 fixed user rows directly in the DB/migration; a simple "act as" dropdown or session stub is fine instead of real login — real auth was never a PRD capability, so don't build it here
- Matches: seed a handful of rows (team names, kickoff time in the near future) by hand or via a one-off script; wiring the real `livescore` CLI is S2, not this slice
- New tables here: `bets`, `bet_participants` (opener is the first participant row), `matches` (seeded), `squad_members` (seeded)

## Open questions

- Squad/invite creation is never specified in the PRD as a capability — this issue set assumes one pre-seeded squad throughout. Flagged at the PLAN level, not reasked per-issue.

## Depends on

(none — slice 1)

## Unblocks

S2, S3
