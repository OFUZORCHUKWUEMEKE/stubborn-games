---
id: S2
title: "A bet page shows the real match's live status and score"
labels: [slice, data-integration]
depends_on: [S1]
milestone: "Points MVP"
---

## Slice

Anyone viewing a bet's page can see the real match's current status (not started / live / finished) and live score, pulled from the `livescore` CLI, refreshing while the match is in progress.

## Why this one now

The match-data source is the riskiest, least-proven dependency in the whole product — it's a scraper with documented gaps, not a licensed feed — and every later capability (auto-settlement, live chat events, abandoned-match handling) depends on it. Proving it end to end now, read-only and disconnected from money/points, surfaces integration problems (rate limits, missing fields, page-format drift) before they're entangled with settlement logic.

## Demo

1. Seed a match in S1's match list that is currently live (or about to kick off) on `livescore.com`.
2. Create a bet on it (from S1).
3. Open the bet's page.
4. Observe the real current score/status displayed, sourced from `livescore-pp-cli`.
5. Wait for a real event (goal, half-time, full-time) in the actual match; refresh or observe the page update.

Expected: the displayed score/status matches what's actually happening in the real match, within the tool's normal latency (sub-5-seconds observed in prior manual testing). This slice does not touch stakes, picks, or payouts — it's a read-only display.

## Scope

- [ ] Server-side integration with `livescore-pp-cli` (or its MCP/library equivalent) to fetch a match's current status and score by match id
- [ ] Bet page polls/refreshes this data while the match is not yet finished
- [ ] Graceful display when the CLI errors or returns nothing (e.g. "score unavailable" rather than a crash) — the happy path is the point of this slice, but a dead integration shouldn't take the whole page down
- [ ] Seeded matches carry whatever external match id `livescore-pp-cli` needs to look them up

## Out of scope

- Using this data to auto-settle a bet → S5
- Auto-posting events into a chat → S6
- A second data source / cross-checking → S9
- Handling abandoned/postponed status specifically → S8

## Acceptance criteria

- [ ] Given a bet on a currently-live real match, when the bet page loads, then it shows a status and score that reflect the actual match within the tool's normal latency
- [ ] Given a bet on a not-yet-started match, when the bet page loads, then it shows "not started" rather than a stale or blank score
- [ ] Given the CLI call fails or times out, when the bet page loads, then it shows a clear "unavailable" state instead of erroring the whole page

## Implementation notes

- Reuse the existing `livescore-pp-cli` / `livescore-pp-mcp` already built at `~/printing-press/library/livescore` rather than writing a new scraper
- This is read-only integration only — do not wire it to any settlement or points logic yet, even though it'll be tempting since the data is right there
- Known limitation from the CLI's own docs: some upstream pages silently omit data ("known limitation, not a bug"); this slice's error-state handling should account for partial/missing fields, not just total failure

## Open questions

- None blocking this slice specifically — the broader question of whether this source is reliable enough to trust for real settlement is explicitly deferred to S5/S9 and to PRD's real-money staging gates.

## Depends on

S1

## Unblocks

S5, S6, S8, S9
