# Squad Picks — As Built

*A retrospective PRD: not a plan for what to build, but a record of what actually shipped, verified against the merged code and a live browser session — not just intentions. Supersedes `PRD.md` (v1, persistent-squad model) and `PRD-v2-rooms.md` (the pivot plan) as the current source of truth; both remain useful as history of *why* things are shaped this way.*

## What this is

A private, points-based betting app for small friend groups. A friend opens a bet on a real match, gets a shareable private room link, sends it into their group chat, and whoever opens it joins by typing a name — no account, no login, no persistent roster. The room runs its own live chat and score feed through the match, then settles itself automatically the moment a result is confirmed.

## The loop, as it actually runs

1. **Open a bet** (`/bets/new`) — type your name, pick a real upcoming fixture from a short list, set a stake in points, pick a result labeled by the actual two teams ("Arsenal to win," never generic "Win").
2. **Get a room** — a fresh, unguessable link is generated (`/rooms/:token`) and shown on the room page, ready to copy into a group chat.
3. **Others join** — anyone with the link types a name and a prediction. No picking from a list of known people; a fresh identity is created per join, scoped to that one room.
4. **The room plays out** — live score polling, and a chat where user messages sit alongside auto-posted match events (goals; yellow and red cards shown as visibly distinct events, not one generic "card" line).
5. **It settles itself** — once the match ends, a second data source has to *agree* with the primary before anyone gets paid. If they agree: the pot splits among correct pickers (fair remainder handling), or everyone's refunded if nobody called it — no rake, ever. If they disagree, or the match is abandoned/postponed, the room holds or refunds instead of guessing.
6. **The room's result stands alone** — no leaderboard, no ranking against other rooms. What happened in this room is the only record that exists of it.

## Capabilities — all built, merged, and verified

| # | Capability | Notes |
|---|---|---|
| 1 | Open a bet with a typed name, real fixture, stake, team-labeled prediction | No account system anywhere in the app |
| 2 | Shareable, unguessable room link | Chosen deliberately over the bet's own sequential id — see Constraints |
| 3 | Join a room by typed name | Per-room duplicate-name check (case-insensitive, trimmed); the same name is free to reuse in a different room |
| 4 | Live match score, polled automatically | Primary source: `livescore-pp-cli` (self-hosted scraper) |
| 5 | Live room chat: user messages + auto-posted match events | Goals, yellow cards, red cards each read as distinct events |
| 6 | Automatic settlement with second-source confirmation | API-Football cross-checks the primary before any payout; disagreement or unavailability holds the room in "pending confirmation" rather than trusting one source |
| 7 | Manual refund for abandoned/postponed matches | Balance-neutral — stakes are only ever debited at settlement, never at join, so a refund never has to claw anything back |
| 8 | Room-scoped result view | Each room shows its own outcome/balance breakdown; no cross-room leaderboard exists |
| 9 | Full visual identity applied to every real screen | Scoreboard/ticket-stub design (bottle-green ground, brass accent, Oswald/Roboto Slab/Space Mono), both light and dark via `prefers-color-scheme` |

## Explicitly rejected / retired along the way

These aren't gaps — they were built, then deliberately removed, and shouldn't be quietly rebuilt without re-litigating why:

- **A persistent squad/roster with accounts.** The very first version of this app worked this way (5 seeded names, pick "acting as" from a dropdown). Replaced entirely by ad-hoc per-room identity — the product's actual intended flow forms a group around a specific bet, not the other way around.
- **A global leaderboard.** Existed in v1 (season-long points/record ranking). Retired because identity no longer persists across rooms — there's nothing coherent left to rank.
- **A global "all bets" listing page, and direct access to a room by numeric id.** Both existed at points in this app's history and were removed specifically because they defeated the point of the private room link — anyone could browse or guess their way into any room. The unguessable token is now the *only* way in.
- **Any percentage-based rake or fee tied to outcome.** Considered and rejected early (a 50%, then 80%/20%, house cut on "nobody's right" was proposed and killed) — taking a cut of stakes reads as bookmaking, and profiting when the field is wrong puts the app's incentives against its own users'. If a fee is ever added, it must be flat and outcome-independent.

## Constraints (still true)

- **Points only — no real money.** Real stablecoin staking remains a deliberately deferred phase, gated behind six unresolved conditions from the original `PRD.md`: a confirmed legal path for a specific jurisdiction/squad, a custody model, confirmation that the data source's ToS actually covers wagering/settlement use, tested failure-mode handling, tested refund logic, and a decided fee mechanism. None of the six have been addressed.
- **No authentication, anywhere.** Anyone with a room's link can join as any name, and can post chat messages as any name that has actually joined *that* room (this was tightened during a privacy fix — it used to be possible to post as anyone who'd ever used the app at all, across every room; now it's scoped to the room, but still has no real identity verification within it). Accepted as an MVP-scope risk, not solved.
- **Data source dependency.** `livescore-pp-cli` is a self-hosted scraper with no uptime guarantee; API-Football is the paid second-source. Both need to be reachable for automatic settlement to proceed past "pending confirmation."
- **Build/test requires Node ≥20.** This development sandbox defaults to Node 18; documented workaround is `nvm use 22` or newer (`.claude/launch.json` runs the dev server correctly via plain `pnpm dev`, assuming the environment's default Node already satisfies this — worth confirming on whatever environment runs CI or hosts this for real).

## Known open items — not done, not forgotten

- **A "pending confirmation" hold has no resolution path.** Once the two data sources disagree, the room stays in that state indefinitely — no retry, no manual override, no scheduled re-check. It will not resolve itself.
- **The refund endpoint has no auth gate.** Anyone can refund anyone's room. Flagged since it was first built; still true.
- **No automated tests for the UI/visual layer.** 50 tests exist, all covering the `lib/` logic layer (settlement math, room-token resolution, participant validation, migration safety). The pages, components, and design were verified through a live browser session against the running dev server, not through any automated test suite — a regression in a page component wouldn't be caught by `pnpm test`.
- **No in-app light/dark theme toggle.** The CSS supports both themes via `prefers-color-scheme` and a `data-theme` override, but there's no UI control in the real app to switch manually — only the OS/browser preference is honored.
- **Real-money phase**, as above — entirely unaddressed by design, not by oversight.

## Provenance

Built across 16 closed GitHub issues (`OFUZORCHUKWUEMEKE/stubborn-games`, #1–#9 for the original persistent-squad MVP, #22–#28 for the ephemeral-rooms pivot), plus follow-up fixes found on review passes rather than filed as issues: the chat-impersonation and room-browsability privacy fix, and the visual-design port. Planning documents: `PRD.md` (v1), `PRD-v2-rooms.md` (the pivot), `issues/PLAN.md` and `issues-v2-rooms/PLAN.md` (slice-level reasoning). Visual design approved on Claude Design (`stubborn.fun Design System` project, `ui_kits/app-squad-picks`).
