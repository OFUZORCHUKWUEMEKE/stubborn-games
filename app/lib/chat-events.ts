import { getDb } from '@/lib/db'
import { fetchMatchLive } from '@/lib/livescore'

/**
 * S5 event watcher. Called opportunistically on bet-page loads (same pattern
 * as the settlement scan): fetches live data for the bet's match, summarizes
 * events, and posts any not-yet-seen ones into the chat as system messages.
 *
 * Dedup strategy: chat already contains earlier event posts for this match —
 * we post only events beyond the count already posted. Events are keyed by
 * their position in the upstream feed (newest last per the CLI's summary).
 */

type MatchEvent = { incident?: string; text?: string; time?: string }

function describeEvent(e: MatchEvent): string | null {
  const text = e.text?.trim()
  if (!text) return null
  const time = e.time ? `${e.time} ` : ''
  if (/goal/i.test(e.incident ?? '')) return `⚽ ${time}${text}`
  if (/card/i.test(e.incident ?? '')) return `🟨 ${time}${text}`
  if (/sub/i.test(e.incident ?? '')) return `🔁 ${time}${text}`
  return `${time}${text}` // other incidents (VAR, penalty missed…) pass through
}

export function postMatchEvents(betId: number): number {
  const db = getDb()

  const row = db
    .prepare(
      `SELECT m.eid, m.home_team
       FROM bets b JOIN matches m ON m.id = b.match_id
       WHERE b.id = ?`
    )
    .get(betId) as { eid: string | null; home_team: string } | undefined
  if (!row?.eid) return 0

  // Synchronous CLI call is acceptable here (page-load context, ~200ms).
  const { execFileSync } = require('child_process') as typeof import('child_process')
  const cliPath = process.env.LIVESCORE_CLI_PATH ?? 'livescore-pp-cli'
  let stdout: string
  try {
    stdout = execFileSync(cliPath, ['match', 'summary', String(row.eid), '--agent', '--compact', '--no-learn'], {
      timeout: 10_000,
      encoding: 'utf8',
    })
  } catch {
    return 0 // dead integration must never break the page
  }

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
}
