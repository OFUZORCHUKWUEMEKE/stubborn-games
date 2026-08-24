import { describe, it, expect } from 'vitest'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'

describe('migrate', () => {
  it('is idempotent — running it twice does not error', () => {
    const db = new Database(':memory:')
    migrate(db)
    expect(() => migrate(db)).not.toThrow()
  })

  it('adds room_token to a bets table that pre-dates it (upgrading an existing local dev db)', () => {
    const db = new Database(':memory:')
    // Simulate a pre-existing local db from before room_token existed —
    // same shape migrate() would have created previously, minus that column.
    db.exec(`
      CREATE TABLE squad_members (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        points INTEGER NOT NULL DEFAULT 1000
      );
      CREATE TABLE matches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        home_team TEXT NOT NULL,
        away_team TEXT NOT NULL,
        kickoff_at TEXT NOT NULL,
        eid TEXT,
        api_fixture_id INTEGER
      );
      CREATE TABLE bets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        match_id INTEGER NOT NULL REFERENCES matches(id),
        status TEXT NOT NULL DEFAULT 'open',
        created_by INTEGER NOT NULL REFERENCES squad_members(id),
        stake INTEGER NOT NULL,
        prediction TEXT NOT NULL CHECK (prediction IN ('win', 'lose', 'draw')),
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `)

    const columnsBefore = db.prepare('PRAGMA table_info(bets)').all() as { name: string }[]
    expect(columnsBefore.some((c) => c.name === 'room_token')).toBe(false)

    expect(() => migrate(db)).not.toThrow()

    const columnsAfter = db.prepare('PRAGMA table_info(bets)').all() as { name: string }[]
    expect(columnsAfter.some((c) => c.name === 'room_token')).toBe(true)

    // The column exists and is usable — insert a row that relies on it.
    db.prepare("INSERT INTO squad_members (name) VALUES ('X')").run()
    db.prepare("INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('A','B', datetime('now'))").run()
    expect(() =>
      db
        .prepare("INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1,1,100,'win','tok1')")
        .run()
    ).not.toThrow()
  })

  it('enforces uniqueness on room_token via the index', () => {
    const db = new Database(':memory:')
    migrate(db)
    db.prepare("INSERT INTO squad_members (name) VALUES ('X')").run()
    db.prepare("INSERT INTO matches (home_team, away_team, kickoff_at) VALUES ('A','B', datetime('now'))").run()
    db.prepare("INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1,1,100,'win','dup')").run()
    expect(() =>
      db
        .prepare("INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (1,1,100,'win','dup')")
        .run()
    ).toThrow()
  })
})
