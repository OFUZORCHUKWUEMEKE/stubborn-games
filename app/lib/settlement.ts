import { getDb } from '@/lib/db'
import { fetchMatchLive } from '@/lib/livescore'

/**
 * S6 settlement engine.
 *
 * Detects locked bets whose match has finished (per livescore-pp-cli),
 * resolves the real result, and pays out the pot:
 *  - correct picker(s) split the pot evenly (integer division; remainder
 *    goes to the earliest correct picker so no points are created/destroyed)
 *  - nobody correct → everyone refunded (issue #6 open-question default;
 *    no rake ever, per the PRD's hard non-goal)
 *
 * Idempotent: a bet with an existing settlement row is never settled twice.
 */

export type SettleResult = {
  betId: number
  outcome: 'win' | 'lose' | 'draw' | 'refund'
  homeScore: number
  awayScore: number
  payouts: { memberId: number; amount: number }[]
}

export function settleBet(betId: number, live: { homeScore: number; awayScore: number }): SettleResult {
  const db = getDb()

  // Guard: never settle twice (UNIQUE on bet_id backs this up)
  const existing = db.prepare('SELECT id FROM settlements WHERE bet_id = ?').get(betId)
  if (existing) throw new Error(`bet ${betId} already settled`)

  const bet = db
    .prepare('SELECT id, stake, status FROM bets WHERE id = ?')
    .get(betId) as { id: number; stake: number; status: string } | undefined
  if (!bet) throw new Error(`bet ${betId} not found`)
  if (bet.status === 'settled' || bet.status === 'refunded') {
    throw new Error(`bet ${betId} already settled`)
  }

  const participants = db
    .prepare('SELECT member_id, prediction FROM bet_participants WHERE bet_id = ? ORDER BY id')
    .all(betId) as { member_id: number; prediction: string }[]
  if (participants.length === 0) throw new Error(`bet ${betId} has no participants`)

  const homeScore = live.homeScore
  const awayScore = live.awayScore
  const outcome: 'win' | 'lose' | 'draw' =
    homeScore === awayScore ? 'draw' : homeScore > awayScore ? 'win' : 'lose'

  const pot = bet.stake * participants.length
  const winners = participants.filter((p) => p.prediction === outcome)

  const payouts: { memberId: number; amount: number }[] = []

  const applyPayout = db.transaction(() => {
    if (winners.length === 0) {
      // Nobody called it: refund. Stakes were never debited (debit happens at
      // settlement in the win path), so a refund is balance-neutral — just
      // record it and flip status. No rake, ever; nobody profits, nobody loses.
      for (const p of participants) {
        payouts.push({ memberId: p.member_id, amount: 0 })
      }
      db.prepare('UPDATE bets SET status = ? WHERE id = ?').run('refunded', betId)
    } else {
      // Every participant's stake leaves their balance; the pot (stake × N)
      // is then split among the correct pickers. Remainder (integer
      // division) goes to the earliest correct picker so books balance.
      for (const p of participants) {
        db.prepare('UPDATE squad_members SET points = points - ? WHERE id = ?').run(bet.stake, p.member_id)
      }
      const share = Math.floor(pot / winners.length)
      const remainder = pot - share * winners.length
      winners.forEach((p, i) => {
        const amount = share + (i < remainder ? 1 : 0)
        db.prepare('UPDATE squad_members SET points = points + ? WHERE id = ?').run(amount, p.member_id)
        payouts.push({ memberId: p.member_id, amount })
      })
      db.prepare('UPDATE bets SET status = ? WHERE id = ?').run('settled', betId)
    }

    db.prepare(
      'INSERT INTO settlements (bet_id, outcome, home_score, away_score) VALUES (?, ?, ?, ?)'
    ).run(betId, winners.length === 0 ? 'refund' : outcome, homeScore, awayScore)
  })

  applyPayout()
  return { betId, outcome: winners.length === 0 ? 'refund' : outcome, homeScore, awayScore, payouts }
}

/**
 * Scan: find locked (kickoff passed, not yet settled) bets whose matches are
 * finished per the live source, and settle each. Returns what it settled.
 */
export async function settlePendingBets(): Promise<SettleResult[]> {
  const db = getDb()
  const now = new Date().toISOString()

  const candidates = db
    .prepare(
      `SELECT b.id, b.stake, m.eid, m.home_team
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       WHERE b.status = 'open'
         AND m.kickoff_at <= ?
         AND m.eid IS NOT NULL
         AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.bet_id = b.id)`
    )
    .all(now) as { id: number; stake: number; eid: string; home_team: string }[]

  const settled: SettleResult[] = []
  for (const c of candidates) {
    const live = await fetchMatchLive(c.eid, c.home_team)
    if (!live || live.statusClass !== 'finished' || live.homeScore == null || live.awayScore == null) {
      continue // still in progress, or data unavailable — try again next scan
    }
    settled.push(settleBet(c.id, { homeScore: live.homeScore, awayScore: live.awayScore }))
  }
  return settled
}
