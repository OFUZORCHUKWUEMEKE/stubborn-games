import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getDb } from '@/lib/db'
import { effectiveStatus } from '@/lib/bets'
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

type Settlement = {
  outcome: 'win' | 'lose' | 'draw' | 'refund'
  home_score: number | null
  away_score: number | null
}

export default async function BetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) notFound()

  const db = getDb()

  // S6: opportunistic settlement scan — viewing a bet page is enough to move
  // finished matches to their settled state. No admin step. Idempotent.
  try {
    const { settlePendingBets } = await import('@/lib/settlement')
    await settlePendingBets()
  } catch {
    // settlement must never take the page down
  }

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
      `SELECT bp.member_id, bp.prediction, sm.name, sm.points
       FROM bet_participants bp
       JOIN squad_members sm ON sm.id = bp.member_id
       WHERE bp.bet_id = ?
       ORDER BY bp.id`
    )
    .all(betId) as { member_id: number; prediction: string; name: string; points: number }[]

  const settlement = db.prepare('SELECT outcome, home_score, away_score FROM settlements WHERE bet_id = ?').get(betId) as
    | Settlement
    | undefined

  const members = db.prepare('SELECT id, name, points FROM squad_members ORDER BY id').all() as {
    id: number
    name: string
    points: number
  }[]
  const joinedMemberIds = participants.map((p) => p.member_id)
  const status = effectiveStatus(bet)

  const outcomeText = (() => {
    if (!settlement) return ''
    switch (settlement.outcome) {
      case 'win':
        return `${bet.home_team} won ${settlement.home_score}–${settlement.away_score}`
      case 'lose':
        return `${bet.away_team} won ${settlement.away_score}–${settlement.home_score}`
      case 'draw':
        return `Drew ${settlement.home_score}–${settlement.away_score}`
      case 'refund':
        return 'No correct picks — all stakes refunded'
    }
  })()

  return (
    <main style={{ padding: '2rem' }}>
      <h1>
        {bet.home_team} vs {bet.away_team}
      </h1>
      <p>Kickoff: {new Date(bet.kickoff_at).toLocaleString()}</p>

      {/* S2: live status/score from livescore-pp-cli (read-only display) */}
      <LiveScore betId={bet.id} />

      <dl>
        <dt>Status</dt>
        <dd style={status !== 'open' ? { fontWeight: 'bold' } : undefined}>
          {status === 'locked' && 'Locked — no new joins after kickoff'}
          {status === 'settled' && 'Settled'}
          {status === 'refunded' && 'Refunded'}
          {status === 'open' && 'Open'}
        </dd>

        <dt>Stake</dt>
        <dd>{bet.stake} points</dd>

        <dt>Opened by</dt>
        <dd>{bet.opener_name}</dd>
      </dl>

      {settlement && (
        <section aria-label="Settlement" style={{ border: '1px solid #2c2', padding: '1rem', marginTop: '1rem' }}>
          <h2>Settled</h2>
          <p>
            <strong>Result:</strong> {outcomeText}
          </p>
          <p>
            <strong>Winners split the pot.</strong> See each member&apos;s outcome below.
          </p>
        </section>
      )}

      <h2>Participants</h2>
      <table>
        <thead>
          <tr>
            <th align="left">Member</th>
            <th align="left">Prediction</th>
            <th align="left">Stake</th>
            {settlement && (
              <>
                <th align="left">Outcome</th>
                <th align="left">Balance</th>
              </>
            )}
          </tr>
        </thead>
        <tbody>
          {participants.map((p) => {
            const isCorrect = settlement ? p.prediction === settlement.outcome : false
            const refunded = settlement?.outcome === 'refund'
            return (
              <tr key={p.member_id}>
                <td>{p.name}</td>
                <td
                  style={
                    settlement && !refunded
                      ? { fontWeight: isCorrect ? 'bold' : 'normal', color: isCorrect ? 'green' : undefined }
                      : undefined
                  }
                >
                  {p.prediction[0].toUpperCase() + p.prediction.slice(1)}
                </td>
                <td>{bet.stake} points</td>
                {settlement && (
                  <>
                    <td>{refunded ? 'Refunded' : isCorrect ? 'Won' : 'Lost'}</td>
                    <td>
                      {members.find((m) => m.id === p.member_id)?.points ?? p.points} pts
                    </td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {status === 'open' && (
        <JoinBetForm betId={bet.id} stake={bet.stake} members={members} joinedMemberIds={joinedMemberIds} />
      )}

      <p>
        <Link href="/bets/new">Open another bet</Link>
      </p>
    </main>
  )
}
