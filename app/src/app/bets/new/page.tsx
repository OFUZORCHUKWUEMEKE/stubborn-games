import { getDb } from '@/lib/db'
import NewBetForm from './NewBetForm'

export const dynamic = 'force-dynamic'

export default function NewBetPage() {
  const db = getDb()
  const matches = db.prepare('SELECT id, home_team, away_team, kickoff_at FROM matches ORDER BY kickoff_at').all() as { id: number; home_team: string; away_team: string; kickoff_at: string }[]

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Open a bet</h1>
      <NewBetForm matches={matches} />
    </main>
  )
}
