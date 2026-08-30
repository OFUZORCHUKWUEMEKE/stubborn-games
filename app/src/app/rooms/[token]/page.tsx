import Link from 'next/link'
import { notFound } from 'next/navigation'
import { headers } from 'next/headers'
import { getDb } from '@/lib/db'
import { effectiveStatus } from '@/lib/bets'
import { getBetIdByRoomToken } from '@/lib/rooms'
import LiveScore from './LiveScore'
import JoinBetForm from './JoinBetForm'
import BetChat from './BetChat'
import CopyRoomLink from './CopyRoomLink'

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

const STAMP_LABEL: Record<string, string> = {
  open: 'Open',
  locked: 'Locked',
  pending: 'Pending confirmation',
  settled: 'Settled',
  refunded: 'Refunded',
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
  // Scoped to this bet only (was previously unscoped — see git history) and,
  // like postMatchEvents below, deliberately NOT awaited: this is an
  // external network call (livescore-pp-cli's own local cache lives on the
  // container's ephemeral disk, not the persistent volume, so on Railway
  // this can be a real uncached round-trip, not the fast local-cache hit
  // seen in dev). router.refresh() after a join waits for this page's
  // response, so awaiting an unpredictable external call here directly
  // shows up as "joining is slow." Firing it in the background means this
  // render might occasionally miss a settlement that completes moments
  // later — the next view picks it up, same trade-off already accepted for
  // postMatchEvents.
  try {
    const { settlePendingBets } = await import('@/lib/settlement')
    settlePendingBets(betId).catch(() => {})
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

  // effectiveStatus doesn't know about pending_confirmations (that's a
  // settlement-layer concept, not a bet-lifecycle one) — fold it in here
  // for display purposes only.
  const displayStatus = pending ? 'pending' : status

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

  const pot = bet.stake * participants.length

  return (
    <main className="page">
      <div className="top-nav">
        <Link href="/" className="wordmark">
          SQUAD PICKS<span className="dot">.</span>
        </Link>
        <span className={`stamp ${displayStatus}`}>{STAMP_LABEL[displayStatus]}</span>
      </div>

      <h1 className="screen-title">
        {bet.home_team} vs {bet.away_team}
      </h1>
      <p className="screen-meta">Private room · kickoff {new Date(bet.kickoff_at).toLocaleString()}</p>

      <div className="room-link">
        <span className="room-link-label mono">Room link</span>
        <span className="room-link-url">{roomLink}</span>
        <CopyRoomLink link={roomLink} />
      </div>

      <div className="stub">
        <div className="stub-inner">
          {/* S2: live status/score from livescore-pp-cli (read-only display) */}
          <LiveScore betId={bet.id} />

          <div className="room-strip">
            <div className="room-fact">
              <span className="k">Stake to join</span>
              <span className="v mono">{bet.stake} pts</span>
            </div>
            <div className="room-fact">
              <span className="k">Opened by</span>
              <span className="v">{bet.opener_name}</span>
            </div>
            <div className="room-fact">
              <span className="k">Pot</span>
              <span className="v mono">{pot} pts</span>
            </div>
          </div>

          {pending && (
            <div className="banner wait">
              <p className="banner-title">
                <span className="wait-dots"><span /><span /><span /></span>
                Pending confirmation
              </p>
              <p className="banner-body">
                No points have moved, and that's deliberate. Two independent score feeds have to agree
                before this room pays out — until they do, every stake stays exactly where it is.
              </p>
              <div className="reason-row">Reason · {pending.reason}</div>
            </div>
          )}

          {settlement && settlement.outcome !== 'refund' && !pending && (
            <div className="banner result">
              <p className="banner-title">Settled</p>
              <p className="banner-body">
                <strong>{outcomeText}.</strong> Winners split the pot — see below.
              </p>
            </div>
          )}

          {settlement && settlement.outcome === 'refund' && !pending && (
            <div className="banner neutral">
              <p className="banner-title">Refunded</p>
              <p className="banner-body">
                This match was abandoned/postponed, or nobody picked correctly. Every stake was returned
                in full — nobody gains, nobody loses.
              </p>
            </div>
          )}

          <table className="p-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Prediction</th>
                <th className="r">Stake</th>
                {settlement && (
                  <>
                    <th className="r">Outcome</th>
                    <th className="r">Balance</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {participants.map((p) => {
                const isCorrect = settlement ? p.prediction === settlement.outcome : false
                const refunded = settlement?.outcome === 'refund'
                const rowClass = !settlement ? '' : refunded ? 'refund-row' : isCorrect ? 'won-row' : 'lost-row'
                return (
                  <tr key={p.member_id} className={rowClass}>
                    <td className="p-name">{p.name}</td>
                    <td className="p-pick">{p.prediction[0].toUpperCase() + p.prediction.slice(1)}</td>
                    <td className="p-stake r mono">{bet.stake} pts</td>
                    {settlement && (
                      <>
                        <td className="p-out r">{refunded ? 'Refunded' : isCorrect ? 'Won' : 'Lost'}</td>
                        {/* p.points already reflects any settlement — the scan
                            above runs before this query, and there's no reason
                            to re-query all of squad_members globally just to
                            look the same value back up (that also used to be
                            the source of the chat-impersonation bug below). */}
                        <td className="p-bal r mono">{p.points} pts</td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>

          {!settlement && (
            <div className="pot-total">
              <span>Pot</span>
              <span className="amount">{pot} pts</span>
            </div>
          )}

          {status === 'open' && !pending && (
            <JoinBetForm betId={bet.id} stake={bet.stake} homeTeam={bet.home_team} awayTeam={bet.away_team} />
          )}

          {status === 'locked' && !settlement && !pending && (
            <p className="locked-note">Joining closes at kickoff — no new picks now</p>
          )}

          {/* S5: bet chat — user messages + auto-posted match events.
              Scoped to this room's actual participants, not a global query —
              see lib/participants.ts's isRoomParticipant for why that matters. */}
          <BetChat betId={bet.id} members={participants.map(({ member_id, name }) => ({ id: member_id, name }))} />
        </div>
      </div>

      <p style={{ marginTop: 24 }}>
        <Link href="/bets/new" className="mono" style={{ fontSize: '0.72rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
          Open a bet →
        </Link>
      </p>
    </main>
  )
}
