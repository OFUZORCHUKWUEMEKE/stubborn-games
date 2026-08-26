import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'squad-picks.db')

let db: Database.Database | null = null

export function getDb(): Database.Database {
  if (db) return db
  db = new Database(DB_PATH)
  db.pragma('journal_mode = WAL')
  db.pragma('busy_timeout = 5000')
  migrate(db)
  seed(db)
  return db
}

export function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS squad_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 1000
    );

    CREATE TABLE IF NOT EXISTS matches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      home_team TEXT NOT NULL,
      away_team TEXT NOT NULL,
      kickoff_at TEXT NOT NULL,
      eid TEXT,
      api_fixture_id INTEGER
    );

    CREATE TABLE IF NOT EXISTS bets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_id INTEGER NOT NULL REFERENCES matches(id),
      status TEXT NOT NULL DEFAULT 'open',
      created_by INTEGER NOT NULL REFERENCES squad_members(id),
      stake INTEGER NOT NULL,
      prediction TEXT NOT NULL CHECK (prediction IN ('win', 'lose', 'draw')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      room_token TEXT
    );

    CREATE TABLE IF NOT EXISTS bet_participants (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER NOT NULL REFERENCES bets(id),
      member_id INTEGER NOT NULL REFERENCES squad_members(id),
      prediction TEXT NOT NULL CHECK (prediction IN ('win', 'lose', 'draw'))
    );

    CREATE TABLE IF NOT EXISTS settlements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER NOT NULL UNIQUE REFERENCES bets(id),
      outcome TEXT NOT NULL,               -- real result: 'win' | 'lose' | 'draw' | 'refund'
      home_score INTEGER,
      away_score INTEGER,
      settled_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      bet_id INTEGER NOT NULL REFERENCES bets(id),
      member_id INTEGER REFERENCES squad_members(id),  -- NULL for system/event messages
      kind TEXT NOT NULL DEFAULT 'user' CHECK (kind IN ('user', 'event')),
      text TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pending_confirmations (
      bet_id INTEGER PRIMARY KEY REFERENCES bets(id),
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `)

  // Defensive: a local dev db created before room_token existed won't have
  // it (CREATE TABLE IF NOT EXISTS is a no-op on an existing table). Add it
  // if missing, then ensure the uniqueness index exists either way — kept as
  // a separate index rather than a column-level UNIQUE constraint since
  // SQLite's ALTER TABLE ADD COLUMN can't express that directly.
  const betsColumns = db.prepare('PRAGMA table_info(bets)').all() as { name: string }[]
  if (!betsColumns.some((c) => c.name === 'room_token')) {
    db.exec('ALTER TABLE bets ADD COLUMN room_token TEXT')
  }
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_bets_room_token ON bets(room_token)')

  // Defensive: a local dev db created before ad-hoc per-room identity (S2,
  // v2 rooms) still has squad_members.name UNIQUE, which SQLite's ALTER
  // TABLE can't drop directly — names are no longer globally unique once
  // different rooms can each have their own "Dele". Rebuild the table only
  // if the old constraint is actually still present (checked via the
  // auto-index SQLite creates for an inline UNIQUE column), so this is a
  // no-op on a fresh install or an already-upgraded db.
  if (squadMembersNameIsUnique(db)) {
    db.exec(`
      CREATE TABLE squad_members_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        points INTEGER NOT NULL DEFAULT 1000
      );
      INSERT INTO squad_members_new (id, name, points) SELECT id, name, points FROM squad_members;
      DROP TABLE squad_members;
      ALTER TABLE squad_members_new RENAME TO squad_members;
    `)
  }
}

function squadMembersNameIsUnique(db: Database.Database): boolean {
  const indexes = db.prepare("PRAGMA index_list('squad_members')").all() as { name: string; unique: number }[]
  for (const idx of indexes) {
    if (!idx.unique) continue
    const cols = db.prepare(`PRAGMA index_info('${idx.name}')`).all() as { name: string }[]
    if (cols.length === 1 && cols[0].name === 'name') return true
  }
  return false
}

// S7 (v2 rooms): no fixed roster is seeded — squad_members is populated
// entirely by rooms themselves (createBet/joinRoom each create their own
// ad-hoc row per typed name). The table stays; only the hardcoded 5-person
// seed data goes, since identity no longer exists before a room does.
export function seed(db: Database.Database) {
  const matchCount = (db.prepare('SELECT COUNT(*) AS n FROM matches').get() as { n: number }).n
  if (matchCount === 0) {
    // Seeded fixtures carrying real livescore eids (from a `livescore-pp-cli sync`
    // of the current slate) so the bet page can look up live status/score.
    const insertMatch = db.prepare('INSERT INTO matches (home_team, away_team, kickoff_at, eid) VALUES (?, ?, ?, ?)')
    // Relative to "now" rather than a fixed date — a hardcoded absolute
    // kickoff goes stale (and locks/finishes) within a day of being seeded.
    const days = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000).toISOString()
    // eid values: real upcoming Premier League / big-club fixtures where available;
    // null for placeholder rows, which the live panel reports as "no external id".
    insertMatch.run('Brighton', 'Aston Villa', days(1), '1793529')
    insertMatch.run('Manchester City', 'AFC Bournemouth', days(1), '1793531')
    insertMatch.run('Newcastle United', 'Liverpool', days(2), '1793532')
    insertMatch.run('West Bromwich Albion', 'Burnley', days(3), '1802348')
    insertMatch.run('Barcelona', 'Real Madrid', days(4), null)
  }
}
