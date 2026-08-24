import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { effectiveStatus, getBetWithKickoff } from '@/lib/bets'
import { normalizeDisplayName, validateDisplayName, hasJoinedByName } from '@/lib/participants'

type JoinBody = {
  name?: unknown
  prediction?: unknown
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) {
    return NextResponse.json({ error: 'Invalid bet id' }, { status: 400 })
  }

  let body: JoinBody
  try {
    body = (await request.json()) as JoinBody
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { name, prediction } = body
  if (typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 })
  }
  const nameError = validateDisplayName(name)
  if (nameError) {
    return NextResponse.json({ error: nameError }, { status: 400 })
  }
  if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
    return NextResponse.json({ error: 'prediction must be one of: win, lose, draw' }, { status: 400 })
  }

  const db = getDb()

  const betCore = getBetWithKickoff(betId)
  if (!betCore) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })

  // S4 (v1 kickoff-lock, unchanged): no joining at or after kickoff
  if (effectiveStatus(betCore) === 'locked') {
    return NextResponse.json({ error: 'This bet is locked — kickoff has passed' }, { status: 423 })
  }

  // S2 (v2 rooms): no fixed roster to pick from — a room's "already joined"
  // check is against typed names within this room only (case-insensitive,
  // trimmed; see lib/participants.ts). The same name is free to join a
  // different room.
  if (hasJoinedByName(betId, name, db)) {
    return NextResponse.json({ error: 'That name has already joined this room' }, { status: 409 })
  }

  const displayName = normalizeDisplayName(name)
  const memberResult = db.prepare('INSERT INTO squad_members (name) VALUES (?)').run(displayName)
  const memberId = memberResult.lastInsertRowid as number

  // A freshly created row always has the default starting balance — this
  // check is close to vestigial now (a brand-new row can only ever be
  // "insufficient" if the stake exceeds the default), and is explicitly
  // S4/#26's job to remove or rethink, not this slice's. Left as-is so S2
  // stays scoped to identity, not the balance model.
  const member = db.prepare('SELECT points FROM squad_members WHERE id = ?').get(memberId) as
    | { points: number }
    | undefined
  if (member && member.points < betCore.stake) {
    return NextResponse.json(
      { error: `Insufficient points: stake is ${betCore.stake} but you have ${member.points}` },
      { status: 400 }
    )
  }

  db.prepare('INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)').run(
    betId,
    memberId,
    prediction
  )

  return NextResponse.json({ ok: true, memberId }, { status: 201 })
}
