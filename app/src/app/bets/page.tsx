import Link from 'next/link'
import { getDb } from '@/lib/db'
import { effectiveStatus } from '@/lib/bets'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  status: string
  stake: number
  kickoff_at: string
  home_team: string
  away_team: string
  opener_name: string
  participant_count: number
}

const STATUS_LABEL: Record<string, string> = {
  open: 'Open',
  locked: 'Locked',
  settled: 'Settled',
  refunded: 'Refunded',
}

export default function BetsListPage() {
  const db = getDb()

  const bets = db
    .prepare(
      `SELECT b.id, b.status, b.stake, m.kickoff_at, m.home_team, m.away_team,
              sm.name AS opener_name,
              (SELECT COUNT(*) FROM bet_participants bp WHERE bp.bet_id = b.id) AS participant_count
       FROM bets b
       JOIN matches m ON m.id = b.match_id
       JOIN squad_members sm ON sm.id = b.created_by
       ORDER BY m.kickoff_at DESC`
    )
    .all() as Row[]

  return (
    <main style={{ padding: '2rem' }}>
      <h1>All bets</h1>
      <p>Every bet the squad has opened, most recent kickoff first.</p>

      {bets.length === 0 ? (
        <p>No bets yet. <Link href="/bets/new">Open the first one →</Link></p>
      ) : (
        <table>
          <thead>
            <tr>
              <th align="left">Match</th>
              <th align="left">Kickoff</th>
              <th align="left">Opened by</th>
              <th align="left">Stake</th>
              <th align="left">Squad in</th>
              <th align="left">Status</th>
            </tr>
          </thead>
          <tbody>
            {bets.map((b) => {
              const status = effectiveStatus({ id: b.id, status: b.status, stake: b.stake, kickoff_at: b.kickoff_at })
              return (
                <tr key={b.id}>
                  <td>
                    <Link href={`/bets/${b.id}`}>
                      {b.home_team} vs {b.away_team}
                    </Link>
                  </td>
                  <td>{new Date(b.kickoff_at).toLocaleString()}</td>
                  <td>{b.opener_name}</td>
                  <td>{b.stake} points</td>
                  <td>{b.participant_count}</td>
                  <td>{STATUS_LABEL[status] ?? status}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      <p>
        <Link href="/bets/new">Open a bet →</Link> · <Link href="/leaderboard">Leaderboard</Link>
      </p>
    </main>
  )
}
