import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'
import { createBet, joinRoom } from '@/lib/bets'
import { settleBet } from '@/lib/settlement'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  migrate(db)
  db.prepare(
    "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('Home FC', 'Away FC', datetime('now', '+1 day'))"
  ).run()
  return db
}

describe('createBet', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('creates a bet with a typed opener name instead of an existing member id', () => {
    const { betId } = createBet({ matchId: 1, openerName: 'Marco', stake: 200, prediction: 'win' }, db)

    const bet = db.prepare('SELECT created_by, stake, prediction, room_token FROM bets WHERE id = ?').get(betId) as {
      created_by: number
      stake: number
      prediction: string
      room_token: string
    }
    const opener = db.prepare('SELECT name FROM squad_members WHERE id = ?').get(bet.created_by) as { name: string }

    expect(opener.name).toBe('Marco')
    expect(bet.stake).toBe(200)
    expect(bet.prediction).toBe('win')
    expect(bet.room_token).toBeTruthy()
  })

  it('makes the opener the bet’s first participant', () => {
    const { betId } = createBet({ matchId: 1, openerName: 'Marco', stake: 200, prediction: 'win' }, db)

    const participants = db.prepare('SELECT member_id, prediction FROM bet_participants WHERE bet_id = ?').all(betId) as {
      member_id: number
      prediction: string
    }[]
    expect(participants).toHaveLength(1)
    expect(participants[0].prediction).toBe('win')
  })

  it('trims the opener name', () => {
    const { betId } = createBet({ matchId: 1, openerName: '  Marco  ', stake: 100, prediction: 'draw' }, db)
    const bet = db.prepare('SELECT created_by FROM bets WHERE id = ?').get(betId) as { created_by: number }
    const opener = db.prepare('SELECT name FROM squad_members WHERE id = ?').get(bet.created_by) as { name: string }
    expect(opener.name).toBe('Marco')
  })

  it('throws for a match that does not exist', () => {
    expect(() => createBet({ matchId: 999, openerName: 'Marco', stake: 100, prediction: 'win' }, db)).toThrow()
  })

  it('two different bets opened under the same name do not collide (no global uniqueness)', () => {
    const first = createBet({ matchId: 1, openerName: 'Dele', stake: 100, prediction: 'win' }, db)
    const second = createBet({ matchId: 1, openerName: 'Dele', stake: 50, prediction: 'draw' }, db)
    expect(first.betId).not.toBe(second.betId)
    expect(first.roomToken).not.toBe(second.roomToken)
  })
})

describe('joinRoom', () => {
  let db: Database.Database
  let betId: number

  beforeEach(() => {
    db = freshDb()
    betId = createBet({ matchId: 1, openerName: 'Opener', stake: 300, prediction: 'win' }, db).betId
  })

  it('adds a participant under the typed name', () => {
    joinRoom({ betId, name: 'Zara', prediction: 'lose' }, db)
    const row = db
      .prepare(
        `SELECT sm.name, bp.prediction FROM bet_participants bp
         JOIN squad_members sm ON sm.id = bp.member_id
         WHERE bp.bet_id = ? AND sm.name = 'Zara'`
      )
      .get(betId) as { name: string; prediction: string } | undefined
    expect(row?.prediction).toBe('lose')
  })

  it('allows a stake far above any default starting balance — S4: no balance gate', () => {
    // The bet's stake (300) is well under a plausible old "starting balance"
    // ceiling, so exercise the case that would have failed under the old
    // gate: a bet whose stake exceeds any single fresh member's default.
    const bigBetId = createBet({ matchId: 1, openerName: 'BigOpener', stake: 5000, prediction: 'win' }, db).betId
    expect(() => joinRoom({ betId: bigBetId, name: 'Newcomer', prediction: 'lose' }, db)).not.toThrow()
  })

  it('rejects a second join under the same name in the same room (case-insensitive, trimmed)', () => {
    joinRoom({ betId, name: 'Zara', prediction: 'lose' }, db)
    expect(() => joinRoom({ betId, name: '  zara  ', prediction: 'draw' }, db)).toThrow()
  })

  it('rejects an invalid (empty) name', () => {
    expect(() => joinRoom({ betId, name: '   ', prediction: 'lose' }, db)).toThrow()
  })

  it('rejects joining after kickoff has passed', () => {
    db.prepare("UPDATE matches SET kickoff_at = datetime('now', '-1 hour') WHERE id = 1").run()
    expect(() => joinRoom({ betId, name: 'Latecomer', prediction: 'lose' }, db)).toThrow()
  })

  it('rejects joining a bet that does not exist', () => {
    expect(() => joinRoom({ betId: 999_999, name: 'Ghost', prediction: 'lose' }, db)).toThrow()
  })
})

describe('full room lifecycle against a completely empty database (S7/#28)', () => {
  it('open -> join -> settle works with zero pre-existing squad_members rows', () => {
    // No seed() call anywhere in this test — only migrate(). Directly
    // covers issue #28's acceptance criterion: the app is fully functional
    // from an empty database, using only names typed during the flow.
    const db = new Database(':memory:')
    migrate(db)
    expect((db.prepare('SELECT COUNT(*) AS n FROM squad_members').get() as { n: number }).n).toBe(0)

    // A JS-generated ISO string (matching lib/db.ts's own seed() convention),
    // not SQLite's datetime('now', ...) — that produces a naive
    // "YYYY-MM-DD HH:MM:SS" string with no UTC marker, which new Date()
    // parses as *local* time. In a UTC+1 environment, "+1 hour" then
    // collapses to effectively "now" once re-parsed as local — a real trap
    // worth documenting here, not just silently working around.
    const kickoffInOneHour = new Date(Date.now() + 60 * 60 * 1000).toISOString()
    db.prepare('INSERT INTO matches (home_team, away_team, kickoff_at) VALUES (?, ?, ?)').run(
      'Home FC',
      'Away FC',
      kickoffInOneHour
    )

    const { betId } = createBet({ matchId: 1, openerName: 'Opener', stake: 150, prediction: 'win' }, db)
    joinRoom({ betId, name: 'Joiner', prediction: 'lose' }, db) // still open, before kickoff

    // settleBet itself doesn't gate on kickoff timing (settlePendingBets'
    // SQL scan does that separately) — calling it directly here is fine
    // regardless of the match's actual kickoff time.
    const result = settleBet(betId, { homeScore: 2, awayScore: 0 }, db)
    expect(result.outcome).toBe('win')

    const names = db.prepare('SELECT name FROM squad_members ORDER BY id').all() as { name: string }[]
    expect(names.map((n) => n.name)).toEqual(['Opener', 'Joiner'])
  })
})
