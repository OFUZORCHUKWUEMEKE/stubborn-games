'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Match = { id: number; home_team: string; away_team: string; kickoff_at: string }

export default function NewBetForm({ matches }: { matches: Match[] }) {
  const router = useRouter()
  const [matchId, setMatchId] = useState('')
  const [name, setName] = useState('')
  const [stake, setStake] = useState('')
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const selectedMatch = matches.find((m) => m.id.toString() === matchId)

  // 'win'/'lose'/'draw' are stored relative to the home team (see
  // lib/settlement.ts), but that's invisible to a user just seeing generic
  // Win/Lose/Draw radios — two people can pick "Win" meaning two different
  // teams. Label options against the actual match instead.
  function predictionLabel(p: 'win' | 'lose' | 'draw'): string {
    if (!selectedMatch) return p[0].toUpperCase() + p.slice(1)
    if (p === 'win') return `${selectedMatch.home_team} to win`
    if (p === 'lose') return `${selectedMatch.away_team} to win`
    return 'Draw'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // Client-side validation mirroring the API's rules
    if (!name.trim()) return setError('Enter your name to open a bet.')
    if (!matchId) return setError('Please pick a match.')
    const stakeNum = Number(stake)
    if (!Number.isInteger(stakeNum) || stakeNum <= 0) {
      return setError('Stake must be a positive whole number of points.')
    }
    if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
      return setError('Please select a prediction (win / lose / draw).')
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/bets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: Number(matchId),
          name,
          stake: stakeNum,
          prediction,
        }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: 'Request failed' }))
        setError(data.error ?? 'Something went wrong')
        setSubmitting(false)
        return
      }
      const data = (await res.json()) as { id: number }
      router.push(`/bets/${data.id}`)
    } catch {
      setError('Network error — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem', maxWidth: 480 }}>
      <label>
        Your name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marco"
          maxLength={60}
          required
        />
      </label>

      <label>
        Match
        <select value={matchId} onChange={(e) => setMatchId(e.target.value)} required>
          <option value="">— pick an upcoming match —</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              {m.home_team} vs {m.away_team} — {new Date(m.kickoff_at).toLocaleString()}
            </option>
          ))}
        </select>
      </label>

      <label>
        Stake (points)
        <input
          type="number"
          min="1"
          step="1"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="e.g. 100"
          required
        />
      </label>

      <fieldset>
        <legend>Your prediction</legend>
        {!selectedMatch && <p style={{ color: '#888', margin: '0 0 0.5rem' }}>Pick a match first to see your options.</p>}
        {(['win', 'lose', 'draw'] as const).map((p) => (
          <label key={p} style={{ marginRight: '1rem' }}>
            <input
              type="radio"
              name="prediction"
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
        {submitting ? 'Opening bet…' : 'Open bet'}
      </button>
    </form>
  )
}
