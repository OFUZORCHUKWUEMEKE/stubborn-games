import { execFile } from 'child_process'
import type Database from 'better-sqlite3'
import { getDb } from '@/lib/db'

/**
 * Real fixture sync. The new-bet picker used to offer five hardcoded team
 * pairs with a fake kickoff time computed as "N days from whenever the db
 * was seeded" — the teams were real but the date/time shown had nothing to
 * do with when (or whether) that match was actually happening. This pulls
 * genuinely scheduled fixtures from livescore-pp-cli instead.
 */

const CLI_PATH = process.env.LIVESCORE_CLI_PATH ?? 'livescore-pp-cli'
const TIMEOUT_MS = 10_000

// Async, matching lib/livescore.ts's runCli — execFileSync would block the
// whole Node process, not just this request.
function runCli(args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(CLI_PATH, [...args, '--agent', '--compact', '--no-learn'], { timeout: TIMEOUT_MS }, (err, stdout) => {
      const code = (err as (NodeJS.ErrnoException & { code?: number }) | null)?.code
      resolve({ code: typeof code === 'number' ? code : err ? 1 : 0, stdout })
    })
  })
}

type Fixture = {
  eid?: string
  home?: string
  away?: string
  competition?: string
  country?: string
  kickoff?: string
  status_class?: string
}

type FixturesResult = { results?: Fixture[] }

// The fixtures endpoint returns every match on earth for a given day
// (~500, parish-league fare included). Restrict the picker to competitions
// a friend group has actually heard of, the same spirit as the old seed
// data (Premier League + one La Liga fixture).
const ALLOWED_COMPETITIONS: { name: string; country?: string }[] = [
  { name: 'premier league', country: 'England' },
  { name: 'la liga', country: 'Spain' },
  { name: 'serie a', country: 'Italy' },
  { name: 'bundesliga', country: 'Germany' },
  { name: 'ligue 1', country: 'France' },
  { name: 'champions league' },
]

export function isAllowedCompetition(competition: string | undefined, country: string | undefined): boolean {
  if (!competition) return false
  const c = competition.toLowerCase()
  return ALLOWED_COMPETITIONS.some((a) => c === a.name && (!a.country || a.country === country))
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10).replace(/-/g, '')
}

// Only a few sequential calls, one per day — settlement.ts's unscoped scan
// showed what happens when a per-view path fans out into many sequential
// external calls, so this stays small and is only triggered when the
// picker is actually running low (see shouldSync below), not on every view.
const DAYS_AHEAD = 3

async function fetchFixturesForDate(date: string): Promise<Fixture[]> {
  const { code, stdout } = await runCli(['fixtures', '--date', date])
  if (code !== 0 || !stdout) return []
  try {
    return (JSON.parse(stdout) as FixturesResult).results ?? []
  } catch {
    return []
  }
}

/**
 * Upsert real, not-yet-started fixtures into the matches table, keyed by
 * eid (see the unique index added in db.ts's migrate()). Never deletes —
 * bets.match_id is a hard FK, so a match a bet already points at must stay
 * put even once its kickoff passes.
 */
export async function syncFixtures(db: Database.Database = getDb()): Promise<number> {
  const upsert = db.prepare(
    `INSERT INTO matches (home_team, away_team, kickoff_at, eid)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(eid) DO UPDATE SET kickoff_at = excluded.kickoff_at`
  )

  let count = 0
  const today = new Date()
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const date = new Date(today.getTime() + i * 24 * 60 * 60 * 1000)
    const fixtures = await fetchFixturesForDate(ymd(date))
    for (const f of fixtures) {
      if (!f.eid || !f.home || !f.away || !f.kickoff) continue
      if (f.status_class && f.status_class !== 'scheduled') continue
      if (!isAllowedCompetition(f.competition, f.country)) continue
      upsert.run(f.home, f.away, f.kickoff, f.eid)
      count++
    }
  }
  return count
}

const LOW_WATERMARK = 5

/** Whether the picker's upcoming-match list is thin enough to be worth a resync. */
export function shouldSync(db: Database.Database = getDb()): boolean {
  const { n } = db
    .prepare("SELECT COUNT(*) AS n FROM matches WHERE kickoff_at > datetime('now')")
    .get() as { n: number }
  return n < LOW_WATERMARK
}
