import { NextResponse } from 'next/server'
import { joinRoom } from '@/lib/bets'

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
  if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
    return NextResponse.json({ error: 'prediction must be one of: win, lose, draw' }, { status: 400 })
  }

  try {
    const { memberId } = joinRoom({ betId, name, prediction })
    return NextResponse.json({ ok: true, memberId }, { status: 201 })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to join'
    const status = /not found/.test(message) ? 404 : /locked/.test(message) ? 423 : /already joined/.test(message) ? 409 : 400
    return NextResponse.json({ error: message }, { status })
  }
}
