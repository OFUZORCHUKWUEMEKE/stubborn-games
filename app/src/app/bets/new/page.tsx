import Link from 'next/link'
import { getDb } from '@/lib/db'
import NewBetForm from './NewBetForm'

export const dynamic = 'force-dynamic'

export default function NewBetPage() {
  const db = getDb()
  const matches = db.prepare('SELECT id, home_team, away_team, kickoff_at FROM matches ORDER BY kickoff_at').all() as { id: number; home_team: string; away_team: string; kickoff_at: string }[]

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
