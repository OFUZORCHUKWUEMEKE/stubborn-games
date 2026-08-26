import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'
import { settleBet, refundBet } from '@/lib/settlement'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  migrate(db)
  return db
}

/** Seeds N participants on one bet, each with the given stake and prediction. */
function seedBet(
  db: Database.Database,
  stake: number,
  predictions: Array<'win' | 'lose' | 'draw'>
): { betId: number; memberIds: number[] } {
  db.prepare(
    "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('Home FC', 'Away FC', datetime('now', '-1 hour'))"
  ).run()

  const memberIds: number[] = []
  predictions.forEach((_, i) => {
    const r = db.prepare('INSERT INTO squad_members (name) VALUES (?)').run(`Player${i}`)
    memberIds.push(r.lastInsertRowid as number)
  })

  const betResult = db
    .prepare(
      "INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1, ?, ?, ?, ?)"
    )
    .run(memberIds[0], stake, predictions[0], 'tok')
  const betId = betResult.lastInsertRowid as number

  predictions.forEach((p, i) => {
    db.prepare('INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)').run(
      betId,
      memberIds[i],
      p
    )
  })

  return { betId, memberIds }
}

function pointsOf(db: Database.Database, memberId: number): number {
  return (db.prepare('SELECT points FROM squad_members WHERE id = ?').get(memberId) as { points: number }).points
}

describe('settleBet', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('pays the full pot to a single correct picker', () => {
    const { betId, memberIds } = seedBet(db, 100, ['win', 'lose'])
    // home wins 2-0 -> outcome 'win'
    const result = settleBet(betId, { homeScore: 2, awayScore: 0 }, db)

    expect(result.outcome).toBe('win')
    expect(pointsOf(db, memberIds[0])).toBe(1000 + 100) // staked 100, won the 200 pot -> net +100
    expect(pointsOf(db, memberIds[1])).toBe(1000 - 100) // staked 100, lost it

    const bet = db.prepare('SELECT status FROM bets WHERE id = ?').get(betId) as { status: string }
    expect(bet.status).toBe('settled')
  })

  it('splits the pot among multiple correct pickers, distributing any remainder to the earliest', () => {
    // 5 participants @ 100 stake = 500 pot. 3 correctly predict 'win'.
    // 500 / 3 = 166 remainder 2 -> first two winners get 167, the third gets 166.
    const { betId, memberIds } = seedBet(db, 100, ['win', 'win', 'win', 'lose', 'lose'])
    settleBet(betId, { homeScore: 3, awayScore: 1 }, db) // home wins -> 'win'

    const winnerPoints = [memberIds[0], memberIds[1], memberIds[2]].map((id) => pointsOf(db, id))
    // starting 1000, minus 100 staked, plus their share
    expect(winnerPoints.sort((a, b) => b - a)).toEqual([1067, 1067, 1066])
    expect(winnerPoints.reduce((a, b) => a + b, 0)).toBe(1000 * 3 - 300 + 500) // conservation check
  })

  it('refunds everyone when nobody predicted correctly — balance-neutral, no rake', () => {
    const { betId, memberIds } = seedBet(db, 100, ['lose', 'draw'])
    const result = settleBet(betId, { homeScore: 2, awayScore: 0 }, db) // actual outcome is 'win' — nobody picked it

    expect(result.outcome).toBe('refund')
    // Nobody's balance moved at all — stakes are only debited on an actual win path.
    expect(pointsOf(db, memberIds[0])).toBe(1000)
    expect(pointsOf(db, memberIds[1])).toBe(1000)

    const bet = db.prepare('SELECT status FROM bets WHERE id = ?').get(betId) as { status: string }
    expect(bet.status).toBe('refunded')
  })

  it('is not settleable twice', () => {
    const { betId } = seedBet(db, 100, ['win', 'lose'])
    settleBet(betId, { homeScore: 1, awayScore: 0 }, db)
    expect(() => settleBet(betId, { homeScore: 1, awayScore: 0 }, db)).toThrow()
  })

  it('throws for a bet with no participants', () => {
    db.prepare(
      "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('A', 'B', datetime('now'))"
    ).run()
    db.prepare("INSERT INTO squad_members (name) VALUES ('Opener')").run()
    const betResult = db
      .prepare("INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1, 1, 100, 'win', 'tok')")
      .run()
    // No bet_participants row inserted for this bet.
    expect(() => settleBet(betResult.lastInsertRowid as number, { homeScore: 1, awayScore: 0 }, db)).toThrow()
  })
})

describe('refundBet', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('refunds everyone without moving any balance', () => {
    const { betId, memberIds } = seedBet(db, 250, ['win', 'draw'])
    const result = refundBet(betId, 'match postponed', db)

    expect(result.outcome).toBe('refund')
    expect(pointsOf(db, memberIds[0])).toBe(1000)
    expect(pointsOf(db, memberIds[1])).toBe(1000)

    const bet = db.prepare('SELECT status FROM bets WHERE id = ?').get(betId) as { status: string }
    expect(bet.status).toBe('refunded')
  })

  it('rejects refunding an already-settled bet', () => {
    const { betId } = seedBet(db, 100, ['win', 'lose'])
    settleBet(betId, { homeScore: 1, awayScore: 0 }, db)
    expect(() => refundBet(betId, 'too late', db)).toThrow()
  })

  it('rejects a double refund', () => {
    const { betId } = seedBet(db, 100, ['win', 'lose'])
    refundBet(betId, 'postponed', db)
    expect(() => refundBet(betId, 'postponed again', db)).toThrow()
  })
})
