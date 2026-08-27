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
    <div className="join-box">
      <p className="join-title mono">Join this bet</p>
      <p className="join-sub">No account needed — type a name your friends will recognise.</p>

      <form onSubmit={handleSubmit}>
        <div className="field-row">
          <span className="field-label">Your name</span>
          <input
            type="text"
            className="text-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Zara"
            maxLength={60}
            required
          />
        </div>

        <div className="field-stack">
          <span className="field-label">Your prediction</span>
          <div className="pick-toggle">
            {(['win', 'lose', 'draw'] as const).map((p) => (
              <button
                key={p}
                type="button"
                className={`pick-option${prediction === p ? ' selected' : ''}`}
                aria-pressed={prediction === p}
                onClick={() => setPrediction(p)}
              >
                {predictionLabel(p)}
              </button>
            ))}
          </div>
          <p className="field-hint">Stake is fixed at {stake} pts, set by the opener</p>
        </div>

        {error && <p className="error-text" role="alert">{error}</p>}

        <button type="submit" className="stamp-button" disabled={submitting}>
          {submitting ? 'Joining…' : `Join for ${stake} pts`}
        </button>
      </form>
    </div>
  )
}
