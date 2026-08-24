import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'
import { createBet } from '@/lib/bets'

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
