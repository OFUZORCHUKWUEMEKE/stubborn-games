'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export default function JoinBetForm({
  betId,
  stake,
  homeTeam,
  awayTeam,
}: {
  betId: number
  stake: number
  // Optional on purpose: the caller (bets/[id]/page.tsx) doesn't pass these
  // yet. Falls back to plain Win/Lose/Draw when absent so this still works
  // either way — see NewBetForm.tsx for why team-relative labels matter
  // ('win'/'lose' are stored relative to the home team, invisibly to the
  // user, so two people can pick "Win" meaning two different teams).
  homeTeam?: string
  awayTeam?: string
}) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  function predictionLabel(p: 'win' | 'lose' | 'draw'): string {
    if (!homeTeam || !awayTeam) return p[0].toUpperCase() + p.slice(1)
    if (p === 'win') return `${homeTeam} to win`
    if (p === 'lose') return `${awayTeam} to win`
    return 'Draw'
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) return setError('Enter your name to join.')
    if (prediction !== 'win' && prediction !== 'lose' && prediction !== 'draw') {
      return setError('Please select a prediction (win / lose / draw).')
    }

    setSubmitting(true)
    try {
      const res = await fetch(`/api/bets/${betId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, prediction }),
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
      <h2>Join this room</h2>
      <p>Stake is fixed at {stake} points to match the opener.</p>

      <label>
        Your name
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Zara"
          maxLength={60}
          required
        />
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
        {submitting ? 'Joining…' : 'Join room'}
      </button>
    </form>
  )
}
