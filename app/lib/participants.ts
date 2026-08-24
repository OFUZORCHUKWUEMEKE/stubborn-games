import type Database from 'better-sqlite3'
import { getDb } from '@/lib/db'

const MAX_NAME_LENGTH = 60

/**
 * S2 (v2 rooms): ad-hoc display names replace picking from a fixed roster.
 * Shared by both the join flow and (S3) the bet-opener flow so the rule
 * lives in exactly one place.
 */
export function normalizeDisplayName(raw: string): string {
  return raw.trim()
}

export function validateDisplayName(raw: string): string | null {
  const name = normalizeDisplayName(raw)
  if (!name) return 'Name is required'
  if (name.length > MAX_NAME_LENGTH) return `Name must be ${MAX_NAME_LENGTH} characters or fewer`
  return null
}

/**
 * "Already joined this room" check for typed names — case-insensitive and
 * trimmed (issue #24's open question: not specified in source, this is the
 * decision made). Scoped to one bet/room; the same name is free to be used
 * in a different room, since identity doesn't persist across rooms.
 */
export function hasJoinedByName(betId: number, name: string, db: Database.Database = getDb()): boolean {
  const normalized = normalizeDisplayName(name).toLowerCase()
  const row = db
    .prepare(
      `SELECT 1 FROM bet_participants bp
       JOIN squad_members sm ON sm.id = bp.member_id
       WHERE bp.bet_id = ? AND LOWER(TRIM(sm.name)) = ?`
    )
    .get(betId, normalized)
  return !!row
}
