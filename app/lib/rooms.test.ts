import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'
import { generateRoomToken, getBetIdByRoomToken, resolveRoomRedirect } from '@/lib/rooms'

function freshDb(): Database.Database {
  const db = new Database(':memory:')
  migrate(db)
  return db
}

function seedOneBet(db: Database.Database, token: string) {
  db.prepare("INSERT INTO squad_members (name, points) VALUES ('Test Opener', 1000)").run()
  db.prepare(
    "INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('Home FC', 'Away FC', datetime('now', '+1 day'))"
  ).run()
  const result = db
    .prepare(
      "INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1, 1, 100, 'win', ?)"
    )
    .run(token)
  return Number(result.lastInsertRowid)
}

describe('generateRoomToken', () => {
  it('returns a non-empty, url-safe token', () => {
    const token = generateRoomToken()
    expect(token.length).toBeGreaterThan(0)
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/)
  })

  it('generates a different token on each call', () => {
    const a = generateRoomToken()
    const b = generateRoomToken()
    expect(a).not.toBe(b)
  })
})

describe('getBetIdByRoomToken', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('resolves a known token to its bet id', () => {
    const token = generateRoomToken()
    const betId = seedOneBet(db, token)
    expect(getBetIdByRoomToken(token, db)).toBe(betId)
  })

  it('returns undefined for a token that does not exist', () => {
    expect(getBetIdByRoomToken('does-not-exist', db)).toBeUndefined()
  })
})

describe('resolveRoomRedirect', () => {
  let db: Database.Database
  beforeEach(() => {
    db = freshDb()
  })

  it('resolves a known token to the bet’s path', () => {
    const token = generateRoomToken()
    const betId = seedOneBet(db, token)
    expect(resolveRoomRedirect(token, db)).toEqual({ found: true, path: `/bets/${betId}` })
  })

  it('reports not found for an unknown token', () => {
    expect(resolveRoomRedirect('bogus-token', db)).toEqual({ found: false })
  })
})
