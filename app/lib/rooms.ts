import crypto from 'crypto'
import type Database from 'better-sqlite3'
import { getDb } from '@/lib/db'

/**
 * S1 (v2 rooms): a shareable, unguessable identifier for a bet's room.
 *
 * Chosen over the bet's own sequential numeric id per the open question on
 * issue #22 — PRD.md's "private, invite-only" framing doesn't sit well with
 * a guessable/enumerable id, so a random token is used instead. 8 bytes
 * (64 bits) of randomness, base64url-encoded — collision probability is
 * negligible at this app's scale; not handling retry-on-collision, backed
 * by a UNIQUE index (lib/db.ts) that would surface a collision loudly
 * rather than silently overwriting another room's link.
 */
export function generateRoomToken(): string {
  return crypto.randomBytes(8).toString('base64url')
}

export function getBetIdByRoomToken(token: string, db: Database.Database = getDb()): number | undefined {
  const row = db.prepare('SELECT id FROM bets WHERE room_token = ?').get(token) as { id: number } | undefined
  return row?.id
}

export type RoomRedirect = { found: true; path: string } | { found: false }

/**
 * Pure resolution logic for the /rooms/:token route, kept separate from the
 * Next.js request/response plumbing so it's directly unit-testable.
 */
export function resolveRoomRedirect(token: string, db: Database.Database = getDb()): RoomRedirect {
  const betId = getBetIdByRoomToken(token, db)
  if (betId == null) return { found: false }
  return { found: true, path: `/bets/${betId}` }
}
