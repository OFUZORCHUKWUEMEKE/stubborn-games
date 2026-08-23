# Squad Picks

*(working title — not final)*

## What this is

A private betting app for small friend groups. Not a sportsbook, not a public platform — just you and your 4-6 closest friends putting stakes on real matches, with the app handling the boring parts (who won, who's owed) so you can focus on the trash talk.

**Current stage: points-based MVP.** Real money (stablecoin) is a planned bridge, not part of the first build — see "Staging: points to real money" below for what has to be true before that switch flips.

## The problem it solves

Right now, this already happens informally — someone in the group chat says "I got City -1" or "loser buys the round," and it settles by memory, screenshots, and vibes. That works until it doesn't: someone forgets the bet was made, someone disputes the final score, someone just never pays up, and the whole thing quietly dies out after a few awkward rounds.

Squad Picks keeps the exact same social ritual — a friend opens a bet, the group piles in, winner takes the pot — but makes it frictionless and dispute-proof. The result comes from the real match, automatically. Nobody has to be the "bet police."

*Note: the "someone never pays up" pain is a real-money pain. The points MVP is a bridge to prove the mechanics (picks, live resolution, chat, leaderboard) work before money is on the line — see staging section.*

## Who it's for

Small, tight friend groups — 4 to 6 people — who already talk about matches together and already informally bet with each other. Not strangers matched by an algorithm, not a public marketplace. The whole point is that it's *your* group, private, invite-only.

## How it works

1. **Someone opens a bet.** Pick an upcoming real match, set the stake (points for now), and make your own prediction — win, lose, or draw.
2. **Invite the squad.** The bet sits open until kickoff. Everyone in the group can see it and decide whether to jump in.
3. **Everyone stakes and picks.** Each friend who joins puts in the same stake and locks in their own prediction before the match starts. Once kickoff hits, the bet is locked — no backing out, no changing your pick.
4. **The match happens.** No admin work needed here — the app watches the real match and knows the score as it happens.
5. **Winner takes the pot.** When the match ends, whoever predicted the actual result splits the pot (or takes all of it, if they're the only one who called it right).

### Edge cases (decided)

- **Abandoned / postponed / overturned matches:** full refund to everyone in the pot. No partial settlement on an ambiguous result.
- **Fees:** flat, outcome-independent fee — not a rake on the pot. The app does not take a cut when the field loses, and does not profit more from one outcome than another. (Earlier draft had the house keeping a percentage when nobody picked correctly — killed intentionally: taking a cut of wagered stakes reads as bookmaking, and profiting specifically when the field is wrong creates a direct incentive conflict between the app and its own users.)

## The live chat

Every open bet has its own chat room that comes alive *during* the match — not just before and after. As the match plays out, real events (goals, cards, big moments) get dropped into the chat automatically alongside your friends' own messages. So when someone scores, the chat already knows before anyone has to say it — and that's exactly when the banter kicks off.

### Data source (decided, points MVP)

- Primary: local `livescore` CLI (scrapes livescore.com). Free, already tested on a live match with sub-5-second event delay under normal conditions.
- Backup: API-Football (paid).
- **Not yet tested:** behavior when the primary source's page format changes or silently drops data (the underlying tool's own docs note this has already happened to other endpoints), and behavior on a simulated bad/delayed/wrong event. Acceptable to leave unresolved while stakes are points; not acceptable once real money is on the line (see staging gates).
- Acceptable for points because a bad read costs nothing real. Source priority must flip (paid API primary, scraper backup or dropped) before real money goes live.

## The leaderboard

Part of the app from day one, not a later addition. Tracks who bet what, who's actually up over the season, who talks the biggest game and backs it up the least. Works the same whether stakes are points or money.

## Staging: points to real money

Points is a bridge, not the permanent shape of the product — the intent is to add real stablecoin stakes later. "Later" is gated on all of the following being true, not just elapsed time or a feeling that the app is ready:

1. **Legal path confirmed for the specific first jurisdiction and specific first squad.** Not general founder experience with gambling/money-transmitter licensing — a concrete answer to "is this legal for me and these named people to do, here." Unresolved as of this writing.
2. **Custody model decided.** What holds the pot between stake and payout (the app, a smart contract, something else) and which regulatory bucket that puts the product in.
3. **Data source priority flipped.** Paid, ToS-cleared provider as primary; free scraper demoted to backup or dropped. Confirm the paid provider's terms actually cover wagering/settlement use (not just data display) before relying on it for real payouts.
4. **Failure-mode testing done.** A simulated bad, delayed, or wrong score event has been run through the full pipeline (chat announcement + payout logic) and the behavior is known and acceptable — not just a clean live match under normal conditions.
5. **Refund logic tested against a real edge case**, not just designed on paper.
6. **Fee model implemented as flat and outcome-independent** — confirmed in the actual payout code, not just intended.

## Why this beats just texting the group chat

Because the group chat already forgets. Bets get lost in scroll, scores get misremembered, someone always "forgets" they lost. Squad Picks remembers everything — who bet what, who's actually up over the season, who talks the biggest game and backs it up the least — and turns that into a running leaderboard your group can actually see. The banter has receipts now.

*(Open question, not yet resolved: with points instead of money, does this differentiation still hold against existing free pick'em/fantasy tools that already offer automatic scoring, real results, and a leaderboard? Worth validating during the points MVP before investing further.)*
