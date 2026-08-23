# Squad Picks (working title) — Points MVP

A private betting app for small friend groups (4-6 people): pick a real match, stake, predict the result, and the app settles the pot automatically when the match ends. Currently a **points-based MVP** — real stablecoin stakes are an explicitly deferred future phase, not part of this build. See [Do not do](#do-not-do-without-checking-here-first) below before touching money logic.

**Repo state as of hand-off: zero code.** This repo currently holds planning only — the 9 issues below, this README, `PRD.md`, and `PRODUCT.md`. Issue #1 bootstraps the actual project from scratch.

## Start here

1. Read `PRD.md` (what's decided vs. assumed vs. still open) and `issues/PLAN.md` (why the slices are ordered this way, the assumptions made to make them buildable).
2. Work issues in dependency order — `gh issue list --repo OFUZORCHUKWUEMEKE/stubborn-games` — starting at **#1**. Each issue is self-contained: a `Slice` (what becomes possible), a `Demo` (literal steps to verify it), `Scope`/`Out of scope`, acceptance criteria, and implementation notes. You shouldn't need anything outside the issue itself plus this README to work one.
3. Dependency graph is in `issues/PLAN.md`. Roughly: #1 (skeleton) → #2 (live match data) → #3 (join) → #4 (kickoff lock) → #6 (auto-settle) → {#5 chat, #7 leaderboard, #8 refunds, #9 second-source confirmation}. Confirm current numbers with `gh issue list`, not this description — the mapping was correct at hand-off time but issues can get renumbered/relabeled after.

## Stack

No stack was mandated by the product decisions — issue #1 assumes a conventional web stack (e.g. Next.js + Postgres) chosen for speed, not dictated. Change it if you have a strong reason; nothing downstream depends on the specific framework, only on "web app, server-rendered pages, a relational store."

## The live match data dependency — read before starting issue #2

Match results come from a CLI tool (`livescore-pp-cli`) that scrapes `livescore.com`. It already exists and was built separately — it is **not part of this repo** and is not guaranteed to be installed wherever you're running:

```bash
npx -y @mvanhorn/printing-press-library install livescore --cli-only
```

Known limitations, from the tool's own docs: it's read-only, single-sourced from one consumer site, and has at least one documented gap already (`standings`/`team` endpoints silently return no row data — "known limitation, not a bug"). It has **not** been tested against a simulated bad/delayed/wrong event — only against one clean live match. This is exactly why the plan treats it as the riskiest dependency and front-loads it at #2, and why #9 (second-source confirmation via the paid API-Football backup) exists as a later, separate slice rather than being bundled into #2.

## Do not do without checking here first

These came out of an extended product-scoping conversation, not from `PRD.md` alone — worth stating explicitly since an agent working issue-by-issue won't otherwise see the reasoning:

- **No real money, no stablecoin, no wallet/custody code.** This is a hard non-goal for this issue set. Adding it requires the six staging gates in `PRD.md` (Constraints / Open questions) to be resolved first — legal path, custody model, data-source ToS confirmation, failure-mode testing, refund testing, fee mechanism — none of which are resolved as of this hand-off.
- **No percentage-based fee or rake on wagered stakes**, ever, in any phase. This was deliberately designed out: taking a cut of stakes reads as bookmaking, and taking a bigger cut when the field loses creates a direct incentive conflict between the app and its users. If a fee is added later, it must be flat and outcome-independent — see `PRD.md` Constraints.
- **No real auth / squad invite flow in this issue set.** Squad creation was never a decided product capability (see `PRD.md` — it's context, not a capability). This MVP assumes one pre-seeded squad with fixed member accounts throughout #1-#9. Building real onboarding is a separate, future slice map.

## Reference docs in this repo

- `PRD.md` — the product decisions, tagged `[confirmed]` / `[inferred]` / `[assumed]`, plus open questions and what's explicitly out of scope
- `PRODUCT.md` — the earlier, fuller product narrative (problem, staging plan to real money, why-this-beats-the-group-chat framing)
- `issues/PLAN.md` — slice table, dependency graph, and the reasoning behind the ordering
