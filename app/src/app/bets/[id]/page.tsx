import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

type BetRow = {
  id: number
  status: string
  stake: number
  prediction: string
  created_at: string
  home_team: string
  away_team: string
  kickoff_at: string
  opener_name: string
}

export default async function BetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) notFound()

  const db = getDb()
  const bet = db
    .prepare(
      `SELECT b.id, b.status, b.stake, b.prediction, b.created_at,
              m.home_team, m.away_team, m.kickoff_at,
              sm.name AS opener_name
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       JOIN squad_members sm ON sm.id = b.created_by
       WHERE b.id = ?`
    )
    .get(betId) as BetRow | undefined

  if (!bet) notFound()

  return (
    <main style={{ padding: '2rem' }}>
      <h1>
        {bet.home_team} vs {bet.away_team}
      </h1>
      <p>Kickoff: {new Date(bet.kickoff_at).toLocaleString()}</p>

      <dl>
        <dt>Status</dt>
        <dd>{bet.status}</dd>

        <dt>Stake</dt>
        <dd>{bet.stake} points</dd>

        <dt>Opened by</dt>
        <dd>{bet.opener_name}</dd>

        <dt>Prediction</dt>
        <dd>{bet.prediction[0].toUpperCase() + bet.prediction.slice(1)}</dd>
      </dl>

      <p>
        <Link href="/bets/new">Open another bet</Link>
      </p>
    </main>
  )
}
