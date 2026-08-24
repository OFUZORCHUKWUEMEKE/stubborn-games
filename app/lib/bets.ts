import type Database from 'better-sqlite3'
import { getDb } from '@/lib/db'
import { generateRoomToken } from '@/lib/rooms'
import { normalizeDisplayName } from '@/lib/participants'

export type BetCore = {
  id: number
  status: string
  stake: number
  kickoff_at: string
}

/**
 * S4: a bet's displayed/locking status is computed from the match's scheduled
 * kickoff — "locked" once kickoff passes, regardless of the stored lifecycle
 * status ('open' until settlement flips it in #6).
 */
export function effectiveStatus(bet: BetCore, now = new Date()): 'open' | 'locked' | 'settled' | 'refunded' {
  if (bet.status !== 'open') return bet.status as 'settled' | 'refunded'
  return new Date(bet.kickoff_at).getTime() <= now.getTime() ? 'locked' : 'open'
}

export function getBetWithKickoff(betId: number): BetCore | undefined {
  const db = getDb()
  return db
    .prepare(
      `SELECT b.id, b.status, b.stake, m.kickoff_at
       FROM bets b JOIN matches m ON m.id = b.match_id
       WHERE b.id = ?`
    )
    .get(betId) as BetCore | undefined
}

export type CreateBetInput = {
  matchId: number
  openerName: string
  stake: number
  prediction: 'win' | 'lose' | 'draw'
}

/**
 * S3 (v2 rooms): the opener identifies with a typed display name — same
 * ad-hoc pattern as joining (S2/#24), not a pick-from-a-list dropdown. Each
 * bet creates its own fresh squad_members row for the opener (same approach
 * the join route uses), so this reuses all existing downstream code
 * (settlement, chat sender name) with no parallel identity model.
 *
 * DB-injectable and kept free of Next.js request/response types so it's
 * directly unit-testable — the route is a thin wrapper around this.
 */
export function createBet(input: CreateBetInput, db: Database.Database = getDb()): { betId: number; roomToken: string } {
  const match = db.prepare('SELECT id FROM matches WHERE id = ?').get(input.matchId)
  if (!match) throw new Error('Match not found')

  const displayName = normalizeDisplayName(input.openerName)
  const memberResult = db.prepare('INSERT INTO squad_members (name) VALUES (?)').run(displayName)
  const openerId = memberResult.lastInsertRowid as number

  const roomToken = generateRoomToken()
  const betResult = db
    .prepare('INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (?, ?, ?, ?, ?)')
    .run(input.matchId, openerId, input.stake, input.prediction, roomToken)
  const betId = betResult.lastInsertRowid as number

  db.prepare('INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)').run(
    betId,
    openerId,
    input.prediction
  )

  return { betId, roomToken }
}
