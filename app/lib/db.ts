import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'squad-picks.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  migrate(db)
  seed(db)
  return db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      points INTEGER NOT NULL DEFAULT 1000
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      eid TEXT
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id),
      status TEXT NOT NULL DEFAULT 'open',
      created_by INTEGER NOT NULL REFERENCES squad_members(id),
      stake INTEGER NOT NULL,
      prediction TEXT NOT NULL CHECK (prediction IN ('win', 'lose', 'draw')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bet_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER NOT NULL REFERENCES bets(id),
      member_id INTEGER NOT NULL REFERENCES squad_members(id),
      prediction TEXT NOT NULL CHECK (prediction IN ('win', 'lose', 'draw'))
    );
  `)
}

function seed(db: Database.Database) {
  const memberCount = (db.prepare('SELECT COUNT(*) AS n FROM squad_members').get() as { n: number }).n
  if (memberCount === 0) {
    const insertMember = db.prepare('INSERT INTO squad_members (name, points) VALUES (?, ?)')
    for (const name of ['Dele', 'Chidi', 'Amara', 'Tunde', 'Ngozi']) {
      insertMember.run(name, 1000)
    }
  }

  const matchCount = (db.prepare('SELECT COUNT(*) AS n FROM matches').get() as { n: number }).n
  if (matchCount === 0) {
    // Seeded fixtures carrying real livescore eids (from a `livescore-pp-cli sync`
    // of the current slate) so the bet page can look up live status/score.
    const insertMatch = db.prepare('INSERT INTO matches (home_team, away_team, kickoff_at, eid) VALUES (?, ?, ?, ?)')
    const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
    // eid values: real upcoming Premier League / big-club fixtures where available;
    // null for placeholder rows, which the live panel reports as "no external id".
    insertMatch.run('Brighton', 'Aston Villa', '2026-08-23T16:00:00Z', '1793529')
    insertMatch.run('Manchester City', 'AFC Bournemouth', '2026-08-23T16:00:00Z', '1793531')
    insertMatch.run('Newcastle United', 'Liverpool', '2026-08-23T18:30:00Z', '1793532')
    insertMatch.run('West Bromwich Albion', 'Burnley', days(1), '1802348')
    insertMatch.run('Barcelona', 'Real Madrid', days(4), null)
  }
}
