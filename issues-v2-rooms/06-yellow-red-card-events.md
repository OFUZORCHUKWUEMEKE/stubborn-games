---
id: S6
title: "Yellow and red cards post as distinct live events, not both generic 'card'"
labels: [slice, chat]
depends_on: []
milestone: "v2 — Ephemeral Rooms"
---

## Slice

A room's auto-posted match events show a yellow card and a red card as visibly different entries — currently both are lumped under one generic "🟨 card" label regardless of which it was.

## Why this one now

Directly named in the source flow description ("live red cards, yellow cards") as something the user expects to see distinguished — v1 doesn't do this today. Fully independent of the identity/room pivot (S1-S5, S7); can be picked up whenever, in parallel with anything else in this plan.

## Demo

1. Find or simulate a match event feed containing both a yellow card and a red card for the same match (via `livescore-pp-cli match summary` output, or a crafted fixture if live data doesn't cooperate during testing).
2. Load a room whose match has both events.
3. Observe the chat shows them as distinguishable entries — different label/icon per card color, not both rendered identically.

Expected: a reader can tell a red card happened without reading the raw text carefully — the event type itself signals it.

## Scope

- [ ] `lib/chat-events.ts`'s `describeEvent` distinguishes yellow vs. red card incidents (the upstream `incident` field presumably already carries this distinction in some form — confirm what `livescore-pp-cli` actually returns before assuming a simple string match is enough)
- [ ] Distinct visual treatment for red vs. yellow in the chat feed (icon and/or color, consistent with however goals are already distinguished)

## Out of scope

- Any other event types beyond what v1 already handles (goals, cards, subs) — not expanding scope here
- Retroactively re-labeling already-posted "card" messages from before this change — new events only

## Acceptance criteria

- [ ] Given a match event with a yellow card incident, the posted chat message is visibly distinct from a red card incident
- [ ] Given a match event with a red card incident, the posted chat message is visibly distinct from a yellow card incident
- [ ] Existing goal and substitution event handling is unaffected

## Implementation notes

- `app/lib/chat-events.ts` — the current regex is `/card/i.test(e.incident ?? '')` for both; needs to branch on whatever value distinguishes yellow from red in the upstream `incident` field. Check actual `livescore-pp-cli match summary` output for a real fixture with both card types before implementing, rather than guessing the field's exact values.

## Open questions

- What does `livescore-pp-cli`'s `incident` field actually contain for yellow vs. red cards (e.g. "yellow card" vs "red card" vs "second yellow")? Not verified in source — check the CLI's real output before writing the branching logic.

## Depends on

(none)

## Unblocks

(none — fully independent)
