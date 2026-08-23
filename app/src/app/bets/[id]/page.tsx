import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import LiveScore from './LiveScore'
import JoinBetForm from './JoinBetForm'

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

  const participants = db
    .prepare(
      `SELECT bp.member_id, bp.prediction, sm.name
       FROM bet_participants bp
       JOIN squad_members sm ON sm.id = bp.member_id
       WHERE bp.bet_id = ?
       ORDER BY bp.id`
    )
    .all(betId) as { member_id: number; prediction: string; name: string }[]

  const members = db.prepare('SELECT id, name, points FROM squad_members ORDER BY id').all() as {
    id: number
    name: string
    points: number
  }[]
  const joinedMemberIds = participants.map((p) => p.member_id)

  return (
    <main style={{ padding: '2rem' }}>
      <h1>
        {bet.home_team} vs {bet.away_team}
      </h1>
      <p>Kickoff: {new Date(bet.kickoff_at).toLocaleString()}</p>

      {/* S2: live status/score from livescore-pp-cli (read-only; settlement is #6) */}
      <LiveScore betId={bet.id} />

      <dl>
        <dt>Status</dt>
        <dd>{bet.status}</dd>

        <dt>Stake</dt>
        <dd>{bet.stake} points</dd>

        <dt>Opened by</dt>
        <dd>{bet.opener_name}</dd>
      </dl>

      <h2>Participants</h2>
      <table>
        <thead>
          <tr>
            <th align="left">Member</th>
            <th align="left">Prediction</th>
            <th align="left">Stake</th>
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => (
            <tr key={p.member_id}>
              <td>{p.name}</td>
              <td>{p.prediction[0].toUpperCase() + p.prediction.slice(1)}</td>
              <td>{bet.stake} points</td>
            </tr>
          ))}
        </tbody>
      </table>

      {bet.status === 'open' && (
        <JoinBetForm betId={bet.id} stake={bet.stake} members={members} joinedMemberIds={joinedMemberIds} />
      )}

      <p>
        <Link href="/bets/new">Open another bet</Link>
      </p>
    </main>
  )
}
