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

  if (!loaded) return <p>Loading live score…</p>
  if (!live || !live.available) {
    return (
      <section aria-label="Live match data">
        <p>
          Score unavailable
          {live?.reason ? ` (${live.reason})` : ''} — showing seeded fixture only.
        </p>
      </section>
    )
  }

  const finished = live.statusClass === 'finished'
  const scheduled = live.statusClass === 'scheduled'

  return (
    <section aria-label="Live match data">
      <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
        {live.home} {live.homeScore ?? '-'} : {live.awayScore ?? '-'} {live.away}
      </p>
      <p>
        Status:{' '}
        {scheduled ? (
          <>Not started — kicks off {live.kickoff ? new Date(live.kickoff).toLocaleString() : 'soon'}</>
        ) : (
          statusLabel(live)
        )}
        {!finished && <small> (auto-refreshes)</small>}
      </p>
    </section>
  )
}
