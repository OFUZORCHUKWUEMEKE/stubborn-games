import Link from 'next/link'
import { getDb } from '@/lib/db'

export const dynamic = 'force-dynamic'

type Row = {
  id: number
  name: string
  points: number
  wins: number
  losses: number
  refunds: number
}

export default function LeaderboardPage() {
  const db = getDb()

  // Aggregate per-member outcomes across settled bets. 'refund' outcome bets
  // count for nobody — no win, no loss (PRD: no partial settlement).
  const rows = db
    .prepare(
      `SELECT sm.id,
              sm.name,
              sm.points,
              COALESCE(SUM(CASE WHEN s.outcome != 'refund' AND bp.prediction = s.outcome THEN 1 ELSE 0 END), 0) AS wins,
              COALESCE(SUM(CASE WHEN s.outcome IN ('win','lose','draw') AND bp.prediction != s.outcome THEN 1 ELSE 0 END), 0) AS losses,
              COALESCE(SUM(CASE WHEN s.outcome = 'refund' THEN 1 ELSE 0 END), 0) AS refunds
       FROM squad_members sm
       LEFT JOIN bet_participants bp ON bp.member_id = sm.id
       LEFT JOIN bets b ON b.id = bp.bet_id AND b.status IN ('settled', 'refunded')
       LEFT JOIN settlements s ON s.bet_id = b.id
       GROUP BY sm.id
       ORDER BY sm.points DESC`
    )
    .all() as Row[]

  return (
    <main style={{ padding: '2rem' }}>
      <h1>Leaderboard</h1>
      <p>The banter has receipts now.</p>

      <table>
        <thead>
          <tr>
            <th align="left">#</th>
            <th align="left">Member</th>
            <th align="left">Points</th>
            <th align="left">Record (W-L)</th>
            <th align="left">Refunds</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id}>
              <td>{i + 1}</td>
              <td>{r.name}</td>
              <td>
                <strong>{r.points}</strong>
              </td>
              <td>
                {r.wins}-{r.losses}
              </td>
              <td>{r.refunds}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p>
        <Link href="/bets/new">Open another bet →</Link>
      </p>
    </main>
  )
}
