import type Database from 'better-sqlite3'
import { getDb } from '@/lib/db'
import { generateRoomToken } from '@/lib/rooms'
import { normalizeDisplayName, validateDisplayName, hasJoinedByName } from '@/lib/participants'

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

export function getBetWithKickoff(betId: number, db: Database.Database = getDb()): BetCore | undefined {
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

export type JoinRoomInput = {
  betId: number
  name: string
  prediction: 'win' | 'lose' | 'draw'
}

/**
 * S2/S4 (v2 rooms): join a room by typed name — no dropdown, and (S4/#26)
 * no balance gate. A fresh squad_members row is created per join, same as
 * the opener; there is no meaningful "insufficient points" check possible
 * against a brand-new row's arbitrary starting default, so none exists here.
 * (Settlement still credits winnings to that row's points afterward — that's
 * not this check's concern; it powers the room's own post-settlement
 * balance display, not a resource being gated on entry. See #26's PR notes.)
 *
 * DB-injectable, free of Next.js types — same thin-wrapper pattern as
 * createBet/resolveRoomRedirect.
 */
export function joinRoom(input: JoinRoomInput, db: Database.Database = getDb()): { memberId: number } {
  const nameError = validateDisplayName(input.name)
  if (nameError) throw new Error(nameError)

  const bet = getBetWithKickoff(input.betId, db)
  if (!bet) throw new Error('Bet not found')

  if (effectiveStatus(bet) === 'locked') {
    throw new Error('This bet is locked — kickoff has passed')
  }

  if (hasJoinedByName(input.betId, input.name, db)) {
    throw new Error('That name has already joined this room')
  }

  const displayName = normalizeDisplayName(input.name)
  const memberResult = db.prepare('INSERT INTO squad_members (name) VALUES (?)').run(displayName)
  const memberId = memberResult.lastInsertRowid as number

  db.prepare('INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)').run(
    input.betId,
    memberId,
    input.prediction
  )

  return { memberId }
}
