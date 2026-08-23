import { execFile } from 'child_process'

const CLI_PATH = process.env.LIVESCORE_CLI_PATH ?? 'livescore-pp-cli'
const TIMEOUT_MS = 10_000

export type MatchLive = {
  eid: string
  home: string
  away: string
  status: string
  statusClass: string
  homeScore: number | null
  awayScore: number | null
  kickoff: string | null
}

type SearchResults = {
  results?: {
    matches?: Array<{
      eid?: string
      home?: string
      away?: string
      status?: string
      status_class?: string
      home_score?: string
      away_score?: string
      kickoff?: string
    }>
  }
}

function runCli(args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    execFile(CLI_PATH, [...args, '--agent', '--compact', '--no-learn'], { timeout: TIMEOUT_MS }, (err, stdout, stderr) => {
      // Non-zero exit puts info in err; still resolve so callers can degrade gracefully.
      const code = (err as (NodeJS.ErrnoException & { code?: number }) | null)?.code
      resolve({ code: typeof code === 'number' ? code : err ? 1 : 0, stdout, stderr })
    })
  })
}

/**
 * Look up a match's live state by its livescore eid. The CLI's search command
 * matches on team/competition names, so we search by the home team and then
 * pin the result by eid. Returns null when the CLI fails, times out, or finds
 * nothing — callers render an "unavailable" state, never a crash.
 */
export async function fetchMatchLive(eid: string, homeTeam: string): Promise<MatchLive | null> {
  const { code, stdout } = await runCli(['search', homeTeam])
  if (code !== 0 || !stdout) return null

  let parsed: SearchResults
  try {
    parsed = JSON.parse(stdout) as SearchResults
  } catch {
    return null
  }

  const matches = parsed.results?.matches ?? []
  const m = matches.find((x) => x.eid === eid)
  if (!m) return null

  return {
    eid,
    home: m.home ?? homeTeam,
    away: m.away ?? '',
    status: m.status ?? '',
    statusClass: m.status_class ?? '',
    homeScore: m.home_score != null ? Number(m.home_score) : null,
    awayScore: m.away_score != null ? Number(m.away_score) : null,
    kickoff: m.kickoff ?? null,
  }
}
