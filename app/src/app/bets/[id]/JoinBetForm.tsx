'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

type Member = { id: number; name: string; points: number }

export default function JoinBetForm({
  betId,
  stake,
  members,
  joinedMemberIds,
}: {
  betId: number
  stake: number
  members: Member[]
  joinedMemberIds: number[]
}) {
  const router = useRouter()
  const [memberId, setMemberId] = useState('')
  const [prediction, setPrediction] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const eligible = members.filter((m) => !joinedMemberIds.includes(m.id))
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
        <legend>Prediction</legend>
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
            {p[0].toUpperCase() + p.slice(1)}
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
