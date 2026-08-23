import { getDb } from '@/lib/db'

export type BetCore = {
  id: number
  status: string
  stake: number
  kickoff_at: string
}

/**
 * S4: a bet's displayed/locking status is computed from the match's scheduled
 * kickoff — "locked" once kickoff passes, regardless of the stored lifecycle
 * status ('open' until settlement flips it in #6).
 */
export function effectiveStatus(bet: BetCore, now = new Date()): 'open' | 'locked' | 'settled' | 'refunded' {
  if (bet.status !== 'open') return bet.status as 'settled' | 'refunded'
  return new Date(bet.kickoff_at).getTime() <= now.getTime() ? 'locked' : 'open'
}

export function getBetWithKickoff(betId: number): BetCore | undefined {
  const db = getDb()
  return db
    .prepare(
      `SELECT b.id, b.status, b.stake, m.kickoff_at
       FROM bets b JOIN matches m ON m.id = b.match_id
       WHERE b.id = ?`
    )
    .get(betId) as BetCore | undefined
}
