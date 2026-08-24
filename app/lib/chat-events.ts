import { execFile } from 'child_process'
import { getDb } from '@/lib/db'

/**
 * S5 event watcher. Called opportunistically on bet-page loads (same pattern
 * as the settlement scan): fetches live data for the bet's match, summarizes
 * events, and posts any not-yet-seen ones into the chat as system messages.
 *
 * Dedup strategy: chat already contains earlier event posts for this match —
 * we post only events beyond the count already posted. Events are keyed by
 * their position in the upstream feed (newest last per the CLI's summary).
 */

const CLI_PATH = process.env.LIVESCORE_CLI_PATH ?? 'livescore-pp-cli'
const TIMEOUT_MS = 10_000

export type MatchEvent = { incident?: string; text?: string; time?: string }

// Async, matching lib/livescore.ts's runCli — execFileSync here would block
// the whole Node process (not just this request) for up to TIMEOUT_MS on
// every bet-page view, since this hits the same free/no-SLA scraper CLI.
function runCli(args: string[]): Promise<{ code: number; stdout: string }> {
  return new Promise((resolve) => {
    execFile(CLI_PATH, [...args, '--agent', '--compact', '--no-learn'], { timeout: TIMEOUT_MS }, (err, stdout) => {
      const code = (err as (NodeJS.ErrnoException & { code?: number }) | null)?.code
      resolve({ code: typeof code === 'number' ? code : err ? 1 : 0, stdout })
    })
  })
}

// Verified against real livescore-pp-cli `match summary` output (issue #23's
// open question): the incident field for cards is exactly 'FootballRedCard'
// or 'FootballYellowCard' — no ambiguity, no need to parse the free-text
// description. Red is checked first and treated as authoritative; anything
// else matching /card/i (an unexpected variant, e.g. a future provider
// change) falls back to the yellow treatment rather than being silently
// dropped into the generic pass-through.
export function describeEvent(e: MatchEvent): string | null {
  const text = e.text?.trim()
  if (!text) return null
  const time = e.time ? `${e.time} ` : ''
  const incident = e.incident ?? ''
  if (/goal/i.test(incident)) return `⚽ ${time}${text}`
  if (incident === 'FootballRedCard') return `🟥 ${time}${text}`
  if (/card/i.test(incident)) return `🟨 ${time}${text}`
  if (/sub/i.test(incident)) return `🔁 ${time}${text}`
  return `${time}${text}` // other incidents (VAR, penalty missed…) pass through
}

// NOTE: the current caller (bets/[id]/page.tsx) does not `await` this call —
// that was harmless when this was execFileSync (already finished by the next
// line), but now that it's async, a fire-and-forget call must never reject or
// it becomes an unhandled rejection. Everything below is therefore wrapped so
// this function always resolves, never throws. Once the caller is free to
// edit again, switch it to `await postMatchEvents(betId)` for a stronger
// guarantee (this try/catch can stay regardless, as defense in depth).
export async function postMatchEvents(betId: number): Promise<number> {
  try {
    const db = getDb()

    const row = db
      .prepare(
        `SELECT m.eid, m.home_team
         FROM bets b JOIN matches m ON m.id = b.match_id
         WHERE b.id = ?`
      )
      .get(betId) as { eid: string | null; home_team: string } | undefined
    if (!row?.eid) return 0

    const { code, stdout } = await runCli(['match', 'summary', String(row.eid)])
    if (code !== 0 || !stdout) return 0 // dead integration must never break the page

    let events: MatchEvent[] = []
    try {
      const parsed = JSON.parse(stdout)
      events = (parsed.results?.events ?? []) as MatchEvent[]
    } catch {
      return 0
    }

    const described = events
      .map(describeEvent)
      .filter((t): t is string => t !== null)

    // How many event messages have we already posted for this bet?
    const posted = db
      .prepare("SELECT COUNT(*) AS n FROM chat_messages WHERE bet_id = ? AND kind = 'event'")
      .get(betId) as { n: number }

    const fresh = described.slice(posted.n)
    const insert = db.prepare(
      "INSERT INTO chat_messages (bet_id, member_id, kind, text) VALUES (?, NULL, 'event', ?)"
    )
    for (const text of fresh) insert.run(betId, text)
    return fresh.length
  } catch {
    return 0 // never reject — see NOTE above
  }
}
