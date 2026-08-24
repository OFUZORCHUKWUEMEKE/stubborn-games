import { NextResponse } from 'next/server'
import { createBet } from '@/lib/bets'
import { validateDisplayName } from '@/lib/participants'

export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { matchId, name, stake, prediction } = (body ?? {}) as {
    matchId?: unknown
    name?: unknown
    stake?: unknown
    prediction?: unknown
  }

  const errors: string[] = []

  if (!Number.isInteger(matchId)) errors.push('matchId must be an integer')
  if (typeof name !== 'string') {
    errors.push('name is required')
  } else {
    const nameError = validateDisplayName(name)
    if (nameError) errors.push(nameError)
  }
  const stakeNum = Number(stake)
  if (!Number.isInteger(stakeNum) || stakeNum <= 0) errors.push('stake must be a positive integer')
  if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
    errors.push('prediction must be one of: win, lose, draw')
  }

  if (errors.length > 0) {
    return NextResponse.json({ error: errors.join('; ') }, { status: 400 })
  }

  try {
    const { betId, roomToken } = createBet({
      matchId: matchId as number,
      openerName: name as string,
      stake: stakeNum,
      prediction: prediction as 'win' | 'lose' | 'draw',
    })
    return NextResponse.json(
      { id: betId, roomToken },
      { status: 201, headers: { Location: `/bets/${betId}` } }
    )
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create bet'
    return NextResponse.json({ error: message }, { status: 400 })
  }
}
