'use client'

import { useCallback, useEffect, useState } from 'react'

type Live = {
  available: boolean
  reason?: string
  home?: string
  away?: string
  status?: string
  statusClass?: string
  homeScore?: number | null
  awayScore?: number | null
  kickoff?: string | null
}

const STATUS_LABELS: Record<string, string> = {
  NS: 'Not started',
  HT: 'Half-time',
  FT: 'Finished',
  AP: 'After penalties',
  AET: 'After extra time',
  P: 'Postponed',
  CANC: 'Cancelled',
  AB: 'Abandoned',
  SUSP: 'Suspended',
}

function statusLabel(live: Live): string {
  if (!live.status) return ''
  if (STATUS_LABELS[live.status]) return STATUS_LABELS[live.status]
  // live minute-style statuses ("45+2", "1H", "2H") pass through as-is
  return live.status
}

export default function LiveScore({ betId }: { betId: number }) {
  const [live, setLive] = useState<Live | null>(null)
  const [loaded, setLoaded] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/bets/${betId}/live`, { cache: 'no-store' })
      if (res.ok) setLive((await res.json()) as Live)
    } catch {
      // keep last known state; page must not crash on transient failure
    } finally {
      setLoaded(true)
    }
  }, [betId])

  useEffect(() => {
    refresh()
    // Poll while the match is in progress (or until we know it's over).
    const t = setInterval(refresh, 15_000)
    return () => clearInterval(t)
  }, [refresh])

  if (!loaded) {
    return <p className="hero-note mono">Loading live score…</p>
  }

  if (!live || !live.available) {
    // Skip the parenthetical when the reason just restates "unavailable" —
    // API-observed values: 'no external id' is worth showing, 'score
    // unavailable' isn't (it's the same word said twice).
    const reasonSuffix = live?.reason && live.reason !== 'score unavailable' ? ` (${live.reason})` : ''
    return (
      <div className="live-banner" aria-label="Live match data">
        <span className="hero-note">
          Score unavailable{reasonSuffix} — showing seeded fixture only.
        </span>
      </div>
    )
  }

  const finished = live.statusClass === 'finished'
  const scheduled = live.statusClass === 'scheduled'

  return (
    <div className="live-banner" aria-label="Live match data">
      <div>
        {!scheduled && !finished && (
          <span className="live-tag">
            <span className="live-dot" /> Live · {statusLabel(live)}
          </span>
        )}
        {finished && <span className="live-tag" style={{ color: 'var(--ink-dim)' }}>Full time</span>}
        {scheduled && <span className="hero-note">Not started</span>}
        <div className="score-row">
          <span className="score-team">{live.home}</span>
          <span className="score-figure">{live.homeScore ?? '–'}</span>
          <span className="score-sep">–</span>
          <span className="score-figure">{live.awayScore ?? '–'}</span>
          <span className="score-team">{live.away}</span>
        </div>
      </div>
      <span className="hero-note">
        {scheduled
          ? `Kicks off ${live.kickoff ? new Date(live.kickoff).toLocaleString() : 'soon'}`
          : !finished
            ? 'Auto-refreshes'
            : ''}
      </span>
    </div>
  )
}
