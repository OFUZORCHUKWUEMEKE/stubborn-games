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
      // Route by the room's token, not its numeric id — /bets/:id no longer
      // exists as a page at all (see rooms/[token]/page.tsx's header comment
      // for why: a guessable id defeats the whole point of the token).
      const data = (await res.json()) as { id: number; roomToken: string }
      router.push(`/rooms/${data.roomToken}`)
    } catch {
      setError('Network error — please try again.')
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="field-row">
        <span className="field-label">Your name</span>
        <input
          type="text"
          className="text-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Marco"
          maxLength={60}
          required
        />
      </div>

      <div className="field-stack">
        <span className="field-label">Match</span>
        <div className="fixture-list">
          {matches.map((m) => (
            <button
              key={m.id}
              type="button"
              className={`fixture${matchId === m.id.toString() ? ' selected' : ''}`}
              aria-pressed={matchId === m.id.toString()}
              onClick={() => setMatchId(m.id.toString())}
            >
              <span className="fixture-name">
                {m.home_team} vs {m.away_team}
              </span>
              <span className="fixture-ko mono">{new Date(m.kickoff_at).toLocaleString()}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <span className="field-label">Stake</span>
        <input
          type="number"
          className="text-input mono"
          min="1"
          step="1"
          value={stake}
          onChange={(e) => setStake(e.target.value)}
          placeholder="e.g. 100 pts"
          required
        />
      </div>

      <div className="field-stack">
        <span className="field-label">Your prediction</span>
        {!selectedMatch && <p className="field-hint" style={{ marginTop: 0 }}>Pick a match first to see your options.</p>}
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
      </div>

      {error && <p className="error-text" role="alert">{error}</p>}

      <button type="submit" className="stamp-button" disabled={submitting}>
        {submitting ? 'Opening…' : 'Open the bet'}
      </button>
    </form>
  )
}
