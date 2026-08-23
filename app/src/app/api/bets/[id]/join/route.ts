import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

type JoinBody = {
  memberId?: unknown
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

  const { memberId, prediction } = body
  if (!Number.isInteger(memberId)) {
    return NextResponse.json({ error: 'memberId must be an integer' }, { status: 400 })
  }
  if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
    return NextResponse.json({ error: 'prediction must be one of: win, lose, draw' }, { status: 400 })
  }

  const db = getDb()

  const bet = db.prepare('SELECT id, status, stake FROM bets WHERE id = ?').get(betId) as
    | { id: number; status: string; stake: number }
    | undefined
  if (!bet) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })

  const member = db.prepare('SELECT id, points FROM squad_members WHERE id = ?').get(memberId) as
    | { id: number; points: number }
    | undefined
  if (!member) return NextResponse.json({ error: 'Squad member not found' }, { status: 400 })

  const already = db
    .prepare('SELECT id FROM bet_participants WHERE bet_id = ? AND member_id = ?')
    .get(betId, memberId)
  if (already) {
    return NextResponse.json({ error: 'You have already joined this bet' }, { status: 409 })
  }

  if (member.points < bet.stake) {
    return NextResponse.json(
      { error: `Insufficient points: stake is ${bet.stake} but you have ${member.points}` },
      { status: 400 }
    )
  }

  db.prepare('INSERT INTO bet_participants (bet_id, member_id, prediction) VALUES (?, ?, ?)').run(
    betId,
    memberId,
    prediction
  )

  return NextResponse.json({ ok: true }, { status: 201 })
}
