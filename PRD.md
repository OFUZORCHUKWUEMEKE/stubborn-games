# Squad Picks

*(working title — not final)*

A private app for a small friend group (4-6 people) to bet on real sports matches with automated, dispute-free settlement. Currently a points-based MVP; real stablecoin stakes are a planned later bridge, gated on specific conditions below.

## Problem

Right now this already happens informally — someone in the group chat says "I got City -1" or "loser buys the round," and it settles by memory, screenshots, and vibes. That works until it doesn't: someone forgets the bet was made, someone disputes the final score, someone just never pays up, and the whole thing quietly dies out after a few awkward rounds.

Squad Picks keeps the same social ritual — a friend opens a bet, the group piles in, winner takes the pot — but makes it frictionless and dispute-proof. The result comes from the real match, automatically. Nobody has to be the "bet police." The group chat already forgets — bets get lost in scroll, scores get misremembered, someone always "forgets" they lost. Squad Picks is meant to remember everything and turn it into a leaderboard the group can see.

Note: the "someone never pays up" pain is specifically a real-money pain. The points MVP exists to prove the mechanics (picks, live resolution, chat, leaderboard) work before money is on the line — whether the dispute-proof pitch still lands without real stakes attached is itself an open question (see below).

## Users

- **Primary:** small, tight friend groups — 4 to 6 people — who already talk about matches together and already informally bet with each other. Private, invite-only; not strangers matched by an algorithm, not a public marketplace.
- **Secondary:** Not specified in source.

## Core loop

A friend opens a bet on a real upcoming match, the squad stakes and locks in predictions before kickoff, and the app automatically resolves and pays out the pot the moment the match ends. (In the current MVP, the stake is points, not money.)

## Capabilities

1. A squad member can open a bet on an upcoming real match, setting the stake and their own prediction (win / lose / draw). `[confirmed]`
2. Other squad members can join an open bet before kickoff, matching the stake and locking in their own prediction. `[confirmed]`
3. Once kickoff hits, a bet is locked — no backing out, no changing a pick. `[confirmed]`
4. The app automatically detects the real match result and pays out the pot to whoever predicted correctly (split if more than one), with no manual admin step. `[confirmed]`
5. Each open bet has a live chat where real match events (goals, cards, big moments) post automatically alongside the squad's own messages, as the match happens. `[confirmed]`
6. Squad members can see a running leaderboard — who's up over the season, who talks the biggest game and backs it up least — live from day one, independent of whether stakes are points or money. `[confirmed]`
7. A squad member is fully refunded if a match is abandoned, postponed, or its result is later overturned — no partial settlement on an ambiguous result. `[confirmed]`

## Non-goals

- **Real stablecoin stakes in v1** — deferred. Points MVP ships first; real money is a later "bridge," gated on six conditions (see Constraints). `[confirmed]`
- **A percentage-based rake on wagered stakes** — rejected. Earlier drafts had the house keeping 50%, then later 80% refunded / 20% kept, whenever nobody picked correctly. Superseded by a flat, outcome-independent fee: a percentage cut of stakes reads as bookmaking, and profiting specifically when the field is wrong puts the app's incentives directly against its own users'.
- **Chainlink, or any specific on-chain oracle, as the match-result source** — explored, not committed. Raised once as a "maybe"; Chainlink has no out-of-the-box sports score feed, and using Chainlink Functions would just wrap the same off-chain API choice in gas cost. Never revisited.

## Constraints

- Small groups only — 4 to 6 people, invite-only. `[confirmed]`
- Match-result data source for the points MVP: `livescore` CLI (scrapes livescore.com) as primary, API-Football (paid) as backup. Acceptable at this stage because a bad read costs nothing real. `[confirmed]`
- Fee model must be flat and outcome-independent, not a rake — the app should not earn more from one betting outcome than another. `[confirmed]` — the mechanism (deducted from the pot vs. a separate subscription) is not yet decided.
- Blockchain/chain for eventual stablecoin settlement: Not specified in source.

## Success signals

Not specified in source.

## Open questions

| # | Question | Why it matters | Blocking? |
|---|---|---|---|
| 1 | Is there a confirmed legal path (gambling license / money-transmitter) for the specific first jurisdiction and named squad, once real money is added? | Founder cited general licensing experience but never named the jurisdiction, the license, or whether it covers this specific pooled/auto-payout structure. Raised three times in discussion, never resolved. | Yes — blocks real-money phase only |
| 2 | Who or what custodies the pot between stake and payout once real stablecoin is added? | Determines money-transmitter exposure and the technical design (smart contract escrow vs. platform-held funds) | Yes — blocks real-money phase only |
| 3 | Does API-Football's ToS actually cover wagering/settlement use, not just data display? | Founder states yes; not independently verified. Relying on unconfirmed coverage risks losing API access mid-season, taking every open real-money pot down with it | Yes — blocks real-money phase only |
| 4 | What happens when the match-result feed reports a bad, delayed, or later-corrected event? | Only tested under one clean live match with normal conditions; behavior under a feed error is unknown, and a wrong auto-announcement is exactly the dispute this app exists to prevent | Yes — blocks real-money phase only |
| 5 | What's the actual fee mechanism — deducted from the pot, or a separate subscription unrelated to bet size? | Changes both the legal characterization (rake-like vs. clearly a service fee) and the implementation | No — points MVP can ship with no fee at all |
| 6 | With points instead of money, does "dispute-proof, remembers everything" still differentiate Squad Picks from existing free pick'em / fantasy tools? | The original problem (someone never pays up) is a real-money pain; unclear the points version has the same problem to solve | No, but worth validating before investing further |

## Provenance

- **Source:** `PRODUCT.md` (working directory) + this conversation (product-grilling session, 2026-08-18)
- **Assumptions made:** that some fee exists in the points MVP at all — only its shape (flat, outcome-independent) was actually decided, not whether a fee is charged during the points stage
- **Rejected in source:** 50% house rake when nobody picks correctly; 80% refund / 20% house keep (both superseded by "cut the rake entirely, flat fees"); Chainlink as the match-data oracle (raised, never pursued)
