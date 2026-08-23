import { NextResponse } from 'next/server'
import { getDb } from '@/lib/db'
import { fetchMatchLive } from '@/lib/livescore'

export const dynamic = 'force-dynamic'

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const betId = Number(id)
  if (!Number.isInteger(betId)) {
    return NextResponse.json({ error: 'Invalid bet id' }, { status: 400 })
  }

  const db = getDb()
  const match = db
    .prepare('SELECT m.eid, m.home_team FROM bets b JOIN matches m ON m.id = b.match_id WHERE b.id = ?')
    .get(betId) as { eid: string | null; home_team: string } | undefined

  if (!match) return NextResponse.json({ error: 'Bet not found' }, { status: 404 })
  if (!match.eid) return NextResponse.json({ available: false, reason: 'no external id' })

  const live = await fetchMatchLive(match.eid, match.home_team)
  if (!live) return NextResponse.json({ available: false, reason: 'score unavailable' })

  return NextResponse.json({
    available: true,
    home: live.home,
    away: live.away,
    status: live.status,
    statusClass: live.statusClass,
    homeScore: live.homeScore,
    awayScore: live.awayScore,
    kickoff: live.kickoff,
  })
}
