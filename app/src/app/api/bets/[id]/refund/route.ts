import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { refundBet } from '@/lib/settlement'

export const dynamic = 'force-dynamic'

/**
 * S8 manual trigger: mark a bet's match abandoned/postponed/overturned and
 * refund every participant. Per the issue: the data source has no dedicated
 * status for abandonment, so this is a deliberate admin-style action.
 *
 * NOTE (MVP scope): no real auth exists anywhere in this app (per PLAN.md,
 * "acting as" only), so there is no auth gate to add yet. When real auth
 * lands, this endpoint must be restricted to an admin role — flagged here
 * rather than silently omitted.
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) {
    return NextResponse.json({ error: 'Invalid bet id' }, { status: 400 })
  }

  let body: { reason?: unknown }
  try {
    body = (await request.json()) as { reason?: unknown }
  } catch {
    body = {}
  }
  const reason = typeof body.reason === 'string' && body.reason.trim() ? body.reason.trim() : 'match abandoned/postponed'

  try {
    const result = refundBet(betId, reason)
    return NextResponse.json({ refunded: true, betId: result.betId, outcome: result.outcome }, { status: 200 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'refund failed'
    const status = /not found/.test(msg) ? 404 : /already|closed/.test(msg) ? 409 : 500
    return NextResponse.json({ error: msg }, { status })
  }
}
