import Link from 'next/link'
import { getDb } from '@/lib/db'
import NewBetForm from './NewBetForm'

export const dynamic = 'force-dynamic'

export default async function NewBetPage() {
  const db = getDb()

  // Opportunistic real-fixture sync (same pattern as the room page's
  // settlement scan and chat-event posting — no separate worker process).
  // Gated by shouldSync so the common case (picker already has enough
  // upcoming matches) costs zero external calls, not just here on every view.
  try {
    const { syncFixtures, shouldSync } = await import('@/lib/fixtures')
    if (shouldSync(db)) await syncFixtures(db)
  } catch {
    // sync must never take the page down — an empty/thin picker is a much
    // smaller problem than a broken new-bet page
  }

  const matches = db
    .prepare("SELECT id, home_team, away_team, kickoff_at FROM matches WHERE kickoff_at > datetime('now') ORDER BY kickoff_at")
    .all() as { id: number; home_team: string; away_team: string; kickoff_at: string }[]

  return (
    <main className="page">
      <div className="top-nav">
        <Link href="/" className="wordmark">
          SQUAD PICKS<span className="dot">.</span>
        </Link>
      </div>

      <h1 className="screen-title">Write a Slip</h1>
      <p className="screen-meta">Points MVP · no account needed</p>

      <div className="stub">
        <div className="stub-inner">
          <NewBetForm matches={matches} />
        </div>
      </div>
    </main>
  )
}
