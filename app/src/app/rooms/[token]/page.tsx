import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getDb } from '@/lib/db'
import { effectiveStatus } from '@/lib/bets'
import { getBetIdByRoomToken } from '@/lib/rooms'
import LiveScore from './LiveScore'
import JoinBetForm from './JoinBetForm'
import BetChat from './BetChat'

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

/**
 * The canonical, and only, way to reach a room's content. Numeric bet ids
 * are never routable to directly — this is the fix for a real privacy hole:
 * S1 chose an unguessable room_token specifically because sequential ids
 * are enumerable, but earlier versions of this app only ever used the token
 * as a redirect *into* /bets/:id, which stayed directly reachable on its
 * own. That defeated the whole point — anyone could browse every room via
 * a sequential id or the old /bets listing. Both are gone now; this page
 * (resolved by token, nothing else) is the only door in.
 */
export default async function RoomPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const db = getDb()
  const betId = getBetIdByRoomToken(token, db)
  if (betId == null) notFound()

  // S6: opportunistic settlement scan — viewing a room is enough to move a
  // finished match to its settled state. No admin step. Idempotent.
  try {
    const { settlePendingBets } = await import('@/lib/settlement')
    await settlePendingBets()
  } catch {
    // settlement must never take the page down
  }

  // S5: opportunistically post new match events into chat (same trigger
  // pattern as the settlement scan — no separate watcher process needed).
  try {
    const { postMatchEvents } = await import('@/lib/chat-events')
    postMatchEvents(betId)
  } catch {
    // event posting must never take the page down
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

  // Absolute so it's actually shareable when pasted outside the app (a
  // group chat, etc.) — this page's own URL, echoed back for easy copying.
  const h = await headers()
  const proto = h.get('x-forwarded-proto') ?? 'http'
  const roomLink = `${proto}://${h.get('host')}/rooms/${token}`

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

  const status = effectiveStatus(bet)
  const pending = db
    .prepare('SELECT reason, created_at FROM pending_confirmations WHERE bet_id = ?')
    .get(betId) as { reason: string; created_at: string } | undefined

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

      {/* S1 (v2 rooms): shareable room link — send this into the group chat */}
      <p style={{ background: '#f0f4f8', padding: '0.6rem 0.9rem', borderRadius: 4 }}>
        Share this room: <code style={{ userSelect: 'all' }}>{roomLink}</code>
      </p>

      {/* S2: live status/score from livescore-pp-cli (read-only display) */}
      <LiveScore betId={bet.id} />

      <dl>
        <dt>Status</dt>
        <dd style={status !== 'open' ? { fontWeight: 'bold' } : undefined}>
          {pending && 'Pending confirmation'}
          {!pending && status === 'locked' && 'Locked — no new joins after kickoff'}
          {!pending && status === 'settled' && 'Settled'}
          {!pending && status === 'refunded' && 'Refunded'}
          {!pending && status === 'open' && 'Open'}
        </dd>

        <dt>Stake</dt>
        <dd>{bet.stake} points</dd>

        <dt>Opened by</dt>
        <dd>{bet.opener_name}</dd>
      </dl>

      {pending && (
        <section
          aria-label="Pending confirmation"
          style={{ border: '1px solid #d80', background: '#fff3e0', padding: '1rem', marginTop: '1rem' }}
        >
          <h2>Pending confirmation</h2>
          <p>
            The data sources disagree (or the second source is unavailable), so this bet has{' '}
            <strong>not been settled yet</strong> — no points have moved. A hold like this is exactly how the app
            avoids paying out on a wrong score.
          </p>
          <p style={{ color: '#666' }}>
            <small>Reason: {pending.reason}</small>
          </p>
        </section>
      )}

      {settlement && settlement.outcome !== 'refund' && (
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

      {settlement && settlement.outcome === 'refund' && (
        <section
          aria-label="Refund"
          style={{ border: '1px solid #c82', background: '#fff8e6', padding: '1rem', marginTop: '1rem' }}
        >
          <h2>Refunded</h2>
          <p>
            This match was abandoned/postponed or had no correct picks. Every participant&apos;s stake was
            returned in full — nobody gains, nobody loses (no partial settlement on an ambiguous result).
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
                    {/* p.points already reflects any settlement — the scan
                        above runs before this query, and there's no reason
                        to re-query all of squad_members globally just to
                        look the same value back up (that also used to be
                        the source of the chat-impersonation bug below). */}
                    <td>{p.points} pts</td>
                  </>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>

      {status === 'open' && (
        <JoinBetForm betId={bet.id} stake={bet.stake} homeTeam={bet.home_team} awayTeam={bet.away_team} />
      )}

      {/* S5: bet chat — user messages + auto-posted match events.
          Scoped to this room's actual participants, not a global query —
          see lib/participants.ts's isRoomParticipant for why that matters. */}
      <BetChat betId={bet.id} members={participants.map(({ member_id, name }) => ({ id: member_id, name }))} />

      <p>
        <Link href="/bets/new">Open a bet →</Link>
      </p>
    </main>
  )
}
