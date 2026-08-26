import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { isRoomParticipant } from '@/lib/participants'

export const dynamic = 'force-dynamic'

type PostBody = { memberId?: unknown; text?: unknown }

/** POST /api/bets/:id/chat — a squad member posts a message. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) return NextResponse.json({ error: 'Invalid bet id' }, { status: 400 })

  let body: PostBody
  try {
    body = (await request.json()) as PostBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { memberId, text } = body
  if (!Number.isInteger(memberId)) return NextResponse.json({ error: 'memberId must be an integer' }, { status: 400 })
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text must be a non-empty string' }, { status: 400 })
  }
  if (text.length > 500) return NextResponse.json({ error: 'text too long (max 500 chars)' }, { status: 400 })

  const db = getDb()
  if (!db.prepare('SELECT id FROM bets WHERE id = ?').get(betId)) {
    return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
  }
  // Security: squad_members spans every room in the app (S2/S3 create a
  // fresh row per join/open), so "does this id exist" is not enough — it
  // must be a participant of *this* bet, or anyone could post chat messages
  // under a name that belongs to a completely different room.
  const memberIdNum = memberId as number
  if (!isRoomParticipant(betId, memberIdNum, db)) {
    return NextResponse.json({ error: 'Not a participant in this room' }, { status: 403 })
  }

  const result = db
    .prepare("INSERT INTO chat_messages (bet_id, member_id, kind, text) VALUES (?, ?, 'user', ?)")
    .run(betId, memberIdNum, text.trim())

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 })
}

/** GET /api/bets/:id/chat — messages in chronological order, both kinds. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) return NextResponse.json({ error: 'Invalid bet id' }, { status: 400 })

  const db = getDb()
  if (!db.prepare('SELECT id FROM bets WHERE id = ?').get(betId)) {
    return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
  }

  const messages = db
    .prepare(
      `SELECT c.id, c.kind, c.text, c.created_at, sm.name AS sender
       FROM chat_messages c
       LEFT JOIN squad_members sm ON sm.id = c.member_id
       WHERE c.bet_id = ?
       ORDER BY c.id ASC`
    )
    .all(betId)

  return NextResponse.json({ messages })
}
