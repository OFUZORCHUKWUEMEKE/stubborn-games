import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'
import { normalizeDisplayName, validateDisplayName, hasJoinedByName } from '@/lib/participants'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  migrate(db)
  return db
}

function seedBetWithOpener(db: Database.Database) {
  db.prepare("INSERT INTO squad_members (name) VALUES ('Bayo')").run()
  db.prepare(
    "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('Home FC', 'Away FC', datetime('now', '+1 day'))"
  ).run()
  db.prepare(
    "INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1, 1, 100, 'win', 'tok')"
  ).run()
  db.prepare("INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (1, 1, 'win')").run()
  return 1 // bet id
}

describe('normalizeDisplayName', () => {
  it('trims surrounding whitespace', () => {
    expect(normalizeDisplayName('  Dele  ')).toBe('Dele')
  })
})

describe('validateDisplayName', () => {
  it('rejects an empty name', () => {
    expect(validateDisplayName('')).not.toBeNull()
    expect(validateDisplayName('   ')).not.toBeNull()
  })

  it('accepts a normal name', () => {
    expect(validateDisplayName('Zara')).toBeNull()
  })

  it('rejects a name longer than 60 characters', () => {
    expect(validateDisplayName('a'.repeat(61))).not.toBeNull()
  })

  it('accepts a name exactly at the 60 character limit', () => {
    expect(validateDisplayName('a'.repeat(60))).toBeNull()
  })
})

describe('hasJoinedByName', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('is true for a name that already joined, case-insensitively and trimmed', () => {
    const betId = seedBetWithOpener(db)
    expect(hasJoinedByName(betId, 'bayo', db)).toBe(true)
    expect(hasJoinedByName(betId, '  BAYO  ', db)).toBe(true)
  })

  it('is false for a name that has not joined this bet', () => {
    const betId = seedBetWithOpener(db)
    expect(hasJoinedByName(betId, 'Zara', db)).toBe(false)
  })

  it('does not collide across different bets/rooms', () => {
    const betId = seedBetWithOpener(db)
    db.prepare(
      "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('C', 'D', datetime('now', '+2 day'))"
    ).run()
    db.prepare(
      "INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (2, 1, 50, 'draw', 'tok2')"
    ).run()
    expect(hasJoinedByName(2, 'Bayo', db)).toBe(false)
    expect(betId).toBe(1)
  })
})
