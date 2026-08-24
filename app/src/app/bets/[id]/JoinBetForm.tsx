'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = { id: number; name: string; points: number }

export default function JoinBetForm({
  betId,
  stake,
  members,
  joinedMemberIds,
  homeTeam,
  awayTeam,
}: {
  betId: number
  stake: number
  members: Member[]
  joinedMemberIds: number[]
  // Optional on purpose: the caller (bets/[id]/page.tsx) doesn't pass these
  // yet. Falls back to plain Win/Lose/Draw when absent so this still works
  // either way — see NewBetForm.tsx for why team-relative labels matter
  // ('win'/'lose' are stored relative to the home team, invisibly to the
  // user, so two people can pick "Win" meaning two different teams).
  // TODO: once page.tsx is free to edit, pass homeTeam={bet.home_team}
  // awayTeam={bet.away_team} to activate this.
  homeTeam?: string
  awayTeam?: string
}) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const eligible = members.filter((m) => !joinedMemberIds.includes(m.id))

  function predictionLabel(p: 'win' | 'lose' | 'draw'): string {
    if (!homeTeam || !awayTeam) return p[0].toUpperCase() + p.slice(1)
    if (p === 'win') return `${homeTeam} to win`
    if (p === 'lose') return `${awayTeam} to win`
    return 'Draw'
  }

  if (eligible.length === 0) return null

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!memberId) return setError('Choose who is joining.')
    if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
      return setError('Please select a prediction (win / lose / draw).')
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/bets/${betId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId: Number(memberId), prediction }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(data.error ?? 'Something went wrong')
        setSubmitting(false)
        return
      }
      router.refresh()
    } catch {
      setError('Network error — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ border: '1px solid #ccc', padding: '1rem', marginTop: '1rem' }}>
      <h2>Join this bet</h2>
      <p>Stake is fixed at {stake} points to match the opener.</p>

      <label>
        Joining as
        <select value={memberId} onChange={(e) => setMemberId(e.target.value)} required>
          <option value="">— pick a squad member —</option>
          {eligible.map((m) => (
            <option key={m.id} value={m.id} disabled={m.points < stake}>
              {m.name} ({m.points} pts{m.points < stake ? ' — insufficient' : ''})
            </option>
          ))}
        </select>
      </label>

      <fieldset>
        <legend>Your prediction</legend>
        {(['win', 'lose', 'draw'] as const).map((p) => (
          <label key={p} style={{ marginRight: '1rem' }}>
            <input
              type="radio"
              name="join-prediction"
              value={p}
              checked={prediction === p}
              onChange={() => setPrediction(p)}
              required
            />
            {' '}
            {predictionLabel(p)}
          </label>
        ))}
      </fieldset>

      {error && (
        <p role="alert" style={{ color: 'red' }}>
          {error}
        </p>
      )}

      <button type="submit" disabled={submitting}>
        {submitting ? 'Joining…' : 'Join bet'}
      </button>
    </form>
  )
}
