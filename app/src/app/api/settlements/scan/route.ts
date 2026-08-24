import { NextResponse } from 'next/server'
import { settlePendingBets } from '@/lib/settlement'

export const dynamic = 'force-dynamic'

/**
 * Settlement scan trigger. The bet page calls this opportunistically (on
 * view), so settlement happens without any admin step. Safe to call often —
 * settleBet is idempotent and the scan skips non-finished matches.
 */
export async function POST() {
  try {
    const result = await settlePendingBets()
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'settlement failed' },
      { status: 500 }
    )
  }
}
