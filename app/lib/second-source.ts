/**
 * S9 second-source confirmation via API-Football.
 *
 * Reads a match's result from an API-Football-shaped endpoint. The base URL
 * and key come from env so the real API (or any compatible double) can be
 * swapped without code changes:
 *   API_FOOTBALL_URL  e.g. https://v3.football.api-sports.io
 *   API_FOOTBALL_KEY  the account key
 *
 * Fixture mapping: livescore eids and API-Football fixture ids are different
 * namespaces — matches.api_fixture_id holds a seeded/manual mapping per the
 * issue's implementation note. A bet whose match has no mapping is treated as
 * "second source unavailable" → settlement holds rather than trusting one
 * scraper alone.
 */

export type SecondSourceResult =
  | { state: 'agree'; outcome: 'win' | 'lose' | 'draw'; homeScore: number; awayScore: number }
  | { state: 'disagree'; primaryOutcome: string; secondaryOutcome: string }
  | { state: 'unavailable'; reason: string }

function outcomeOf(h: number, a: number): 'win' | 'lose' | 'draw' {
  return h === a ? 'draw' : h > a ? 'win' : 'lose'
}

/** Query the configured API-Football endpoint for a fixture's final score. */
async function fetchSecondary(apiFixtureId: number): Promise<{ h: number; a: number } | null> {
  const base = process.env.API_FOOTBALL_URL
  const key = process.env.API_FOOTBALL_KEY
  if (!base || !key) return null // not configured → unavailable

  const url = `${base}/fixtures?id=${apiFixtureId}`
  try {
    const res = await fetch(url, {
      headers: { 'x-apisports-key': key },
      signal: AbortSignal.timeout(10_000),
    })
    if (!res.ok) return null
    const data = (await res.json()) as {
      response?: Array<{
        goals?: { home?: number | null; away?: number | null }
        fixture?: { status?: { short?: string } }
      }>
    }
    const fx = data.response?.[0]
    const short = fx?.fixture?.status?.short
    const h = fx?.goals?.home
    const a = fx?.goals?.away
    // only terminal statuses count as a confirmed result
    if (!fx || !['FT', 'AET', 'PEN'].includes(short ?? '') || h == null || a == null) return null
    return { h, a }
  } catch {
    return null
  }
}

/**
 * Compare the primary source's result against the second source for a match.
 * Called by settlement before paying out.
 */
export async function confirmWithSecondSource(
  eid: string,
  apiFixtureId: number | null,
  primaryOutcome: 'win' | 'lose' | 'draw',
  primaryHome: number,
  primaryAway: number
): Promise<SecondSourceResult> {
  if (apiFixtureId == null) {
    return { state: 'unavailable', reason: 'no fixture mapping to second source' }
  }

  const secondary = await fetchSecondary(apiFixtureId)
  if (!secondary) {
    return { state: 'unavailable', reason: 'second source unavailable or no confirmed result' }
  }

  const secondaryOutcome = outcomeOf(secondary.h, secondary.a)
  if (secondaryOutcome === primaryOutcome && secondary.h === primaryHome && secondary.a === primaryAway) {
    return { state: 'agree', outcome: primaryOutcome, homeScore: primaryHome, awayScore: primaryAway }
  }
  return { state: 'disagree', primaryOutcome, secondaryOutcome }
}
