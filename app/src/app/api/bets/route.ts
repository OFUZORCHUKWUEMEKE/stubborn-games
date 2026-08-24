import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { generateRoomToken } from '@/lib/rooms'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { matchId, createdBy, stake, prediction } = (body ?? {}) as {
    matchId?: unknown
    createdBy?: unknown
    stake?: unknown
    prediction?: unknown
  }

  const errors: string[] = []

  if (!Number.isInteger(matchId)) errors.push('matchId must be an integer')
  if (!Number.isInteger(createdBy)) errors.push('createdBy must be an integer')
  const stakeNum = Number(stake)
  if (!Number.isInteger(stakeNum) || stakeNum <= 0) errors.push('stake must be a positive integer')
  if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
    errors.push('prediction must be one of: win, lose, draw')
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  const db = getDb()

  const match = db.prepare('SELECT id FROM matches WHERE id = ?').get(matchId)
  if (!match) return NextResponse.json({ error: 'Match not found' }, { status: 400 })

  const member = db.prepare('SELECT id FROM squad_members WHERE id = ?').get(createdBy)
  if (!member) return NextResponse.json({ error: 'Squad member not found' }, { status: 400 })

  const roomToken = generateRoomToken()
  const insertBet = db.prepare(
    'INSERT INTO bets (match_id, created_by, stake, prediction, room_token) VALUES (?, ?, ?, ?, ?)'
  )
  const result = insertBet.run(matchId, createdBy, stakeNum, prediction, roomToken)

  db.prepare(
    'INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)'
  ).run(result.lastInsertRowid, createdBy, prediction)

  const betId = result.lastInsertRowid as number
  return NextResponse.json(
    { id: betId, roomToken },
    { status: 201, headers: { Location: `/bets/${betId}` } }
  )
}
