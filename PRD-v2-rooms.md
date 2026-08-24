# Squad Picks v2 — Ephemeral Rooms

*Supersedes the persistent-squad model in `PRD.md` for everything below. `PRD.md` remains accurate as a record of what was actually built for v1 (issues #1–#9, all merged) — this document describes the pivot on top of it, not a from-scratch product.*

Squad Picks lets a friend open a bet on a real match and get a shareable link; whoever opens that link joins a private room for that one bet — typing just a display name, no account — to stake points, banter in a live chat with auto-posted match events, and see who called it right when the match ends.

## Problem

v1 assumed a fixed, persistent 4-6 person squad that existed before any bet was opened — squad membership was pre-seeded, identity was picked from a dropdown of known names, and everything (chat, leaderboard, points balances) was shared globally across that one squad forever.

That's not how the person actually wants to use this: a bet gets opened first, on the spot, and the *group forms around that specific bet* by someone sharing a link into an existing group chat — not the other way around. Requiring a pre-existing squad with known members is friction that doesn't match how these bets actually start ("I got City -1" in a group chat, right now, for this match).

## Users

- **Primary:** whoever opens a bet, and whoever they share the resulting link with — no longer a fixed roster. Anyone with the link can join by typing a name.
- **Secondary:** Not specified in source.

## Core loop

A friend opens a bet on a real match and gets a shareable room link. They send it into their group chat; each friend who opens it types a display name, stakes points, and picks a result. The room's live chat and match-event feed play out until the match ends, when the room shows who called it right.

## Capabilities

1. A person can open a bet on a real upcoming match (from the existing live-match data source), setting a stake and their own prediction. `[confirmed]` — unchanged from v1, capability already exists; identity capture changes (see #3).
2. Opening a bet generates a shareable room link/code for that bet. `[confirmed]` — "a private link would be sent."
3. A person can open that link and join the room by typing a display name — no account, no login, no picking from a fixed list — then stake points matching the opener and make their own prediction. `[confirmed]` — "he sends the link to his friend group-chat, then they join with a code... and they place their bet."
4. Each room has its own live chat where joined participants can post messages. `[confirmed]` — carried from v1's per-bet chat, already room-scoped by construction (chat is keyed by bet id).
5. A room automatically shows live match updates as they happen: score changes, goals, yellow cards, and red cards specifically called out as distinct events. `[confirmed]` — v1 only ever labeled events generically as "card"; the user named yellow and red separately, which v1 doesn't do today.
6. Once the match ends, the room shows its own result — who predicted correctly and what they won — scoped to just that room, not a season-long ranking. `[confirmed]` — "leaderboard available to see who's winning," narrowed in follow-up discussion to a per-room result rather than a persistent cross-room leaderboard, since identity doesn't persist across rooms.

## Non-goals

- **Persistent squad membership or accounts** — explicitly rejected in favor of ad-hoc, per-room display names. This is a reversal of v1's core assumption, not an oversight.
- **A cross-room / season-long leaderboard** — explicitly rejected for the same reason: nothing persists a person's identity between rooms, so there's nothing coherent to rank across rooms. v1's `/leaderboard` page is retired by this pivot.
- Everything already excluded in `PRD.md` and still true here: real stablecoin stakes (still a later, gated phase — see that doc's staging gates), any percentage-based rake, Chainlink as the match-data oracle.

## Constraints

- Match-result data source: unchanged from v1 — `livescore-pp-cli` primary, API-Football second-source confirmation before auto-settling (already built, S9/PR #18). `[confirmed]`
- No authentication of any kind, including weaker than v1's "one pre-seeded squad" model: anyone with a room's link can type any display name, including someone else's. This is an accepted MVP risk, not something this phase solves. `[confirmed as accepted risk, not a decision to fix now]`
- No-rake, flat-or-nothing fee rule from v1 still applies. `[confirmed, carried over]`

## Success signals

Not specified in source.

## Open questions

| # | Question | Why it matters | Blocking? |
|---|---|---|---|
| 1 | What does "stake" mean without any persistent balance? | v1's join flow rejects joining if a member's stored points balance is below the stake — but there's no stored balance to check anymore once identity is ad-hoc and per-room. Default assumed for issue-writing: stake is a nominal number used only to compute the payout split *within that room*, with no value or meaning outside it (not a real balance, not (yet) real money). If that's wrong, the whole settlement/points model needs to be rethought before building. | Yes |
| 2 | Is the "code" the same thing as the link, or a separate step? | Changes the join UX. Default assumed: the link *is* `/rooms/<code>` — opening it goes straight to that room's join screen, nothing to type except a display name. If a separate manually-typed code (on top of the link) is wanted as a real access-control step, that's a different, larger build. | No — reasonable default, cheap to revise |
| 3 | Does a room stay viewable forever after it settles, or expire/archive? | Affects whether old rooms need cleanup/retention logic. Default assumed: stays viewable indefinitely, nothing in source suggests otherwise. | No |
| 4 | Should there be a cap on how many people can join one room? | Not stated in source. Default assumed: no cap for this phase. | No |

## Provenance

- **Source:** conversation of 2026-08-24 (flow description + follow-up clarifying questions), read together with `PRD.md` for what's carried over unchanged (data source, settlement math, no-rake rule, staging-to-real-money gates)
- **Assumptions made:** stake has no meaning outside its own room (open question #1, flagged as blocking since it changes the settlement model if wrong); link and code are the same thing (#2); rooms don't expire (#3); no participant cap (#4)
- **Rejected in source:** a persistent squad that reuses one room across many bets (explicitly asked about and rejected in favor of ephemeral per-bet rooms); a season-long/cross-room leaderboard (rejected for the same reason); lightweight persistent identity across rooms (asked about directly, rejected in favor of pure ad-hoc names)
