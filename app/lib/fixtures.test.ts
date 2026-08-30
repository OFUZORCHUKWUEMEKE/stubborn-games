import { describe, it, expect } from 'vitest'
import { isAllowedCompetition, shouldSync } from './fixtures'
import Database from 'better-sqlite3'
import { migrate } from '@/lib/db'

describe('isAllowedCompetition', () => {
  it('allows a big-5 league fixture when the country matches', () => {
    expect(isAllowedCompetition('Premier League', 'England')).toBe(true)
    expect(isAllowedCompetition('La Liga', 'Spain')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isAllowedCompetition('PREMIER LEAGUE', 'England')).toBe(true)
  })

  it('rejects a same-named competition from the wrong country — this is what "premier" substring matching would let through', () => {
    // The CLI's own --competition filter is a substring match, which is why
    // this app filters client-side instead: "premier" alone also matches
    // Armenia's Premier League, Scotland's Premiership, etc.
    expect(isAllowedCompetition('Premier League', 'Armenia')).toBe(false)
  })

  it('allows Champions League regardless of country — it has none', () => {
    expect(isAllowedCompetition('Champions League', undefined)).toBe(true)
  })

  it('rejects a competition not on the allowlist', () => {
    expect(isAllowedCompetition('Eliteserien', 'Norway')).toBe(false)
  })

  it('rejects when competition is missing entirely', () => {
    expect(isAllowedCompetition(undefined, 'England')).toBe(false)
  })
})

describe('shouldSync', () => {
  it('is true on an empty matches table', () => {
    const db = new Database(':memory:')
    migrate(db)
    expect(shouldSync(db)).toBe(true)
  })

  it('is false once enough upcoming matches exist', () => {
    const db = new Database(':memory:')
    migrate(db)
    const insert = db.prepare(
      "INSERT INTO matches (home_team, away_team, kickoff_at, eid) VALUES (?, ?, datetime('now', '+1 day'), ?)"
    )
    for (let i = 0; i < 5; i++) insert.run(`Home${i}`, `Away${i}`, `eid${i}`)
    expect(shouldSync(db)).toBe(false)
  })

  it('does not count matches that have already kicked off', () => {
    const db = new Database(':memory:')
    migrate(db)
    const insert = db.prepare(
      "INSERT INTO matches (home_team, away_team, kickoff_at, eid) VALUES (?, ?, datetime('now', '-1 day'), ?)"
    )
    for (let i = 0; i < 5; i++) insert.run(`Home${i}`, `Away${i}`, `eid${i}`)
    expect(shouldSync(db)).toBe(true)
  })
})
