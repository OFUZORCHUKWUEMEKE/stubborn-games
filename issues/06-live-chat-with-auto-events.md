---
id: S6
title: "A bet's live chat shows squad messages plus auto-posted match events"
labels: [slice, chat, data-integration]
depends_on: [S2]
milestone: "Points MVP"
---

## Slice

Each bet has its own chat where squad members can post messages, and real match events (goals, cards) from the live data source (S2) are automatically posted into the same chat as they happen.

## Why this one now

This is the differentiator called out explicitly in the PRD ("the chat already knows before anyone has to say it — and that's exactly when the banter kicks off"). It depends on S2's live data existing, but not on settlement (S5) — chat is a parallel branch off the same data feed, not part of the payout path, so it can ship independently once S2 is proven.

## Demo

1. Open a bet page for a currently-live real match (from S2).
2. As one squad member, post a chat message.
3. As a second squad member, view the same bet page and see that message.
4. Wait for a real goal/card event in the actual match.

Expected: both the manual message and the auto-posted event appear in the same chat, in chronological order, without a page reload (or with a short poll interval).

## Scope

- [ ] Chat message model scoped to a bet: sender, text, timestamp
- [ ] Endpoint/UI for a squad member to post a chat message on a bet
- [ ] A process that watches S2's live event data for a bet's match and posts a system message into that bet's chat when a new event (goal, card) appears
- [ ] Chat renders both message types (user, system-event) distinguishably, in order

## Out of scope

- Chat on bets whose match hasn't started or has finished — chat can still exist, but "comes alive during the match" is the demoed case; pre/post-match chat behavior is whatever falls out naturally, not separately specified
- Reactions, threading, read receipts — not mentioned in the PRD

## Acceptance criteria

- [ ] Given a bet page, when a squad member posts a message, then it appears in the chat for all squad members viewing that bet
- [ ] Given a real match event occurs (per S2's data), then a system message describing it appears in the bet's chat without any user action
- [ ] Chat messages and auto-posted events are ordered by timestamp, not by type

## Implementation notes

- Reuse S2's polling mechanism for event detection rather than building a second one — this slice adds a "post to chat" side effect when S2 detects a new event, it doesn't re-fetch independently
- Simple polling-based chat refresh is acceptable for this slice; websockets/real-time push is a possible later enhancement, not required here

## Open questions

None — this slice is additive on top of S2's already-open question about data reliability, not a new one.

## Depends on

S2

## Unblocks

(none)
