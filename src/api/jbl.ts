import { ALL_TEAMS, DIVISIONS, DIVISION_NAMES } from "../sim/jblSeason"
import type { JblGameJson, JblSeasonJson } from "../sim/jblJsonTypes"

/** Newest first. A season is used once its first game has been played; the oldest is the fallback. */
const SEASON_CANDIDATES = [2027, 2026]
const seasonRootOf = (season: number) => `/jbl/seasons/${season}`

let activeSeasonPromise: Promise<number> | null = null

/** The season the app shows: the newest one that already has a finished game. */
export function getJblSeason(): Promise<number> {
  activeSeasonPromise ??= (async () => {
    for (const season of SEASON_CANDIDATES.slice(0, -1)) {
      try {
        const response = await fetch(`${seasonRootOf(season)}/season.json`)
        if (!response.ok) continue
        // Vite dev/preview and SPA hosts answer unknown paths with index.html.
        if (!(response.headers.get("content-type") ?? "").includes("json")) continue
        const data = (await response.json()) as JblSeasonJson
        if (data.schedule?.some((game) => Boolean(game.finalScore))) return season
      } catch {
        // fall through to the next candidate
      }
    }
    return SEASON_CANDIDATES[SEASON_CANDIDATES.length - 1]
  })()
  return activeSeasonPromise
}

async function seasonRoot(): Promise<string> {
  return seasonRootOf(await getJblSeason())
}

export type JblTeam = {
  id: string
  name: string
  abbreviation: string
  league: string
  wins: number
  losses: number
  pct: number
  rs: number
  ra: number
  rsPerGame: number
  raPerGame: number
  hasStats: boolean
}

export type JblStandingLeague = {
  name: string
  teams: JblTeam[]
}

export type JblData = {
  season: JblSeasonJson
  games: JblGameJson[]
  allGamesCount: number
  visibleGameCount: number
  visibleThrough: string
  teams: JblTeam[]
  standings: JblStandingLeague[]
}

export type JblScheduleGame = JblSeasonJson["schedule"][number]

async function fetchJson<T>(url: string, resource: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`${resource} request failed: ${response.status}`)
  return response.json() as Promise<T>
}

/**
 * Per-game JSON is published gzip-compressed (<name>.json.gz) to keep the repo and
 * deploys small; older seasons (2026) are still plain. Try the .gz first, then the
 * plain file. Hosts differ on whether they add Content-Encoding to .gz files, so
 * the gzip magic bytes are checked instead of trusting headers, and an SPA
 * fallback page (HTML) for a missing .gz is treated as "not there".
 */
async function fetchGameJson<T>(url: string, resource: string): Promise<T> {
  const gz = await fetch(`${url}.gz`).catch(() => null)
  if (gz?.ok) {
    const buffer = await gz.arrayBuffer()
    const bytes = new Uint8Array(buffer)
    if (bytes.length > 2 && bytes[0] === 0x1f && bytes[1] === 0x8b) {
      const stream = new Blob([buffer]).stream().pipeThrough(new DecompressionStream("gzip"))
      return JSON.parse(await new Response(stream).text()) as T
    }
    try {
      return JSON.parse(new TextDecoder().decode(bytes)) as T
    } catch {
      // Not JSON (HTML fallback) — use the plain file below.
    }
  }
  return fetchJson<T>(url, resource)
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length)
  let nextIndex = 0

  async function run() {
    while (nextIndex < items.length) {
      const current = nextIndex
      nextIndex += 1
      results[current] = await worker(items[current])
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run))
  return results
}

function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export const jblTeamSlug = slug

function teamAbbr(name: string) {
  return name.split(" ").slice(-1)[0].slice(0, 3).toUpperCase()
}

function leagueForTeam(teamName: string) {
  const entry = Object.entries(DIVISIONS).find(([, teams]) => teams.includes(teamName))
  return entry ? DIVISION_NAMES[entry[0]] ?? entry[0] : "JBL"
}

function todayKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function hydrateTeams(season: JblSeasonJson, visibleSchedule: JblScheduleGame[]): JblTeam[] {
  const knownTeams = new Set(season.teams.map((team) => team.name))
  const records = new Map<string, { wins: number; losses: number; rs: number; ra: number }>()

  for (const name of ALL_TEAMS) {
    records.set(name, { wins: 0, losses: 0, rs: 0, ra: 0 })
  }

  for (const game of visibleSchedule) {
    if (!game.finalScore) continue

    const away = records.get(game.away)
    const home = records.get(game.home)
    if (!away || !home) continue

    away.rs += game.finalScore.away
    away.ra += game.finalScore.home
    home.rs += game.finalScore.home
    home.ra += game.finalScore.away

    if (game.finalScore.away > game.finalScore.home) {
      away.wins += 1
      home.losses += 1
    } else if (game.finalScore.home > game.finalScore.away) {
      home.wins += 1
      away.losses += 1
    }
  }

  return ALL_TEAMS.map((name) => {
    const record = records.get(name) ?? { wins: 0, losses: 0, rs: 0, ra: 0 }
    const gamesPlayed = record.wins + record.losses
    return {
      id: slug(name),
      name,
      abbreviation: teamAbbr(name),
      league: leagueForTeam(name),
      wins: record.wins,
      losses: record.losses,
      pct: gamesPlayed > 0 ? record.wins / gamesPlayed : 0,
      rs: record.rs,
      ra: record.ra,
      rsPerGame: gamesPlayed > 0 ? record.rs / gamesPlayed : 0,
      raPerGame: gamesPlayed > 0 ? record.ra / gamesPlayed : 0,
      hasStats: knownTeams.has(name),
    }
  })
}

function buildStandings(teams: JblTeam[]): JblStandingLeague[] {
  const byName = new Map(teams.map((team) => [team.name, team]))

  return Object.entries(DIVISIONS).map(([key, leagueTeams]) => ({
    name: DIVISION_NAMES[key] ?? key,
    teams: leagueTeams
      .map((teamName) => byName.get(teamName))
      .filter((team): team is JblTeam => Boolean(team)),
  }))
}

async function loadGameDetails(
  schedule: JblScheduleGame[],
  gameFiles: string[],
): Promise<JblGameJson[]> {
  const root = await seasonRoot()
  const availableFiles = new Set(gameFiles)
  const detailFiles = schedule
    .map((game) => game.gameFile.replace(/^games\//, ""))
    .filter((file) => availableFiles.has(file))

  return mapLimit(
    detailFiles,
    12,
    (file) => fetchGameJson<JblGameJson>(`${root}/games/${file}`, `JBL game ${file}`)
  )
}

export async function getJblVisibleGames(asOfDate = todayKey()): Promise<JblGameJson[]> {
  const root = await seasonRoot()
  const season = await fetchJson<JblSeasonJson>(`${root}/season.json`, "JBL season")
  const gameFiles = await fetchJson<string[]>(`${root}/games/index.json`, "JBL game index")

  return loadGameDetails(
    season.schedule.filter((game) => game.date <= asOfDate && Boolean(game.finalScore)),
    gameFiles,
  )
}

export async function getJblScheduleForDate(date: string): Promise<JblScheduleGame[]> {
  const root = await seasonRoot()
  const season = await fetchJson<JblSeasonJson>(`${root}/season.json`, "JBL season")
  return season.schedule.filter((game) => game.date === date)
}

export async function getJblGameById(
  gameId: string,
): Promise<{ game: JblGameJson; schedule: JblScheduleGame } | null> {
  const root = await seasonRoot()
  const season = await fetchJson<JblSeasonJson>(`${root}/season.json`, "JBL season")
  let schedule: JblScheduleGame | undefined = season.schedule.find((candidate) => candidate.gameId === gameId)
  if (!schedule) {
    // Postseason games are listed in playoffs.json, not in the regular-season schedule,
    // so they never affect the standings.
    const playoffs = await fetchJson<{ games?: JblScheduleGame[] }>(
      `${root}/playoffs.json`,
      "JBL playoffs",
    ).catch(() => null)
    schedule = playoffs?.games?.find((candidate) => candidate.gameId === gameId)
  }
  if (!schedule) return null

  const game = await fetchGameJson<JblGameJson>(`${root}/${schedule.gameFile}`, `JBL game ${gameId}`)
  return { game, schedule }
}

export type JblSeasonArchive = {
  season: number
  playedGames: number
  totalGames: number
  standings: JblStandingLeague[]
  playoffs: unknown | null
}

async function fetchJsonOrNull(url: string): Promise<unknown | null> {
  try {
    const response = await fetch(url)
    if (!response.ok) return null
    // SPA hosts answer missing files with index.html.
    if (!(response.headers.get("content-type") ?? "").includes("json")) return null
    return await response.json()
  } catch {
    return null
  }
}

export type JblStatBatter = {
  name: string; team: string; pos: string; age: number | null
  g: number; ab: number; r: number; h: number; rbi: number; bb: number; so: number; hr: number
}
export type JblStatPitcher = {
  name: string; team: string; role: string
  g: number; gs: number; outs: number; h: number; r: number; er: number; bb: number; so: number; hr: number
  w: number; l: number; sv: number
}
export type JblSeasonStats = {
  season: number
  throughDate: string
  gamesPlayed: number
  qualifying: { pa: number; outs: number }
  leagueEra: number
  awards: {
    mvp: { name: string; team: string; pos: string; value: number } | null
    bestPitcher: { name: string; team: string; role: string; value: number } | null
  }
  batters: JblStatBatter[]
  pitchers: JblStatPitcher[]
}

/** stats.json (season totals built by scripts/build-jbl-stats.mjs); null if the season has none yet. */
export async function getJblStats(season?: number): Promise<JblSeasonStats | null> {
  const year = season ?? (await getJblSeason())
  return (await fetchJsonOrNull(`${seasonRootOf(year)}/stats.json`)) as JblSeasonStats | null
}

/** Seasons that have at least one finished game, newest first (the archive's season picker). */
export async function getJblArchiveSeasons(): Promise<number[]> {
  const found: number[] = []
  for (const season of SEASON_CANDIDATES) {
    const data = (await fetchJsonOrNull(`${seasonRootOf(season)}/season.json`)) as JblSeasonJson | null
    if (data?.schedule?.some((game) => Boolean(game.finalScore))) found.push(season)
  }
  return found
}

/** Final (or current) standings and postseason of any published season. */
export async function getJblSeasonArchive(season: number): Promise<JblSeasonArchive | null> {
  const root = seasonRootOf(season)
  const data = (await fetchJsonOrNull(`${root}/season.json`)) as JblSeasonJson | null
  if (!data) return null
  const finished = data.schedule.filter((game) => Boolean(game.finalScore))
  return {
    season,
    playedGames: finished.length,
    totalGames: data.schedule.length,
    standings: buildStandings(hydrateTeams(data, finished)),
    playoffs: await fetchJsonOrNull(`${root}/playoffs.json`),
  }
}

/** Engine-published draft files for one season (draft/draft.json etc.). */
export type JblDraftFiles = { season: number; draft: unknown; prospects: unknown; changes: unknown; progression: unknown | null }

/** Newest season that has a draft published (the draft exists before the first game is played). */
export async function getJblDraft(): Promise<JblDraftFiles | null> {
  const getJson = async (url: string) => {
    const response = await fetch(url)
    if (!response.ok) return null
    if (!(response.headers.get("content-type") ?? "").includes("json")) return null
    return response.json() as Promise<unknown>
  }
  for (const season of SEASON_CANDIDATES) {
    try {
      const root = seasonRootOf(season)
      const [draft, prospects, changes, progression] = await Promise.all([
        getJson(`${root}/draft/draft.json`),
        getJson(`${root}/draft/prospects.json`),
        getJson(`${root}/draft/roster-changes.json`),
        getJson(`${root}/progression/progression.json`).catch(() => null),
      ])
      if (draft && prospects && changes) return { season, draft, prospects, changes, progression }
    } catch {
      // try the next season
    }
  }
  return null
}

/** Engine-published postseason (null until playoffs.json exists for the season). */
export async function getJblPlayoffs(): Promise<unknown | null> {
  const root = await seasonRoot()
  try {
    const response = await fetch(`${root}/playoffs.json`)
    if (!response.ok) return null
    // Vite dev/preview falls back to index.html for unknown paths.
    if (!(response.headers.get("content-type") ?? "").includes("json")) return null
    return await response.json()
  } catch {
    return null
  }
}

export async function getJblData(asOfDate = todayKey()): Promise<JblData> {
  const root = await seasonRoot()
  const season = await fetchJson<JblSeasonJson>(`${root}/season.json`, "JBL season")
  const gameFiles = await fetchJson<string[]>(`${root}/games/index.json`, "JBL game index")
  const visibleSchedule = season.schedule
    .filter((game) => game.date <= asOfDate)
    .filter((game) => Boolean(game.finalScore))
  const todaySchedule = visibleSchedule.filter((game) => game.date === asOfDate)
  const games = await loadGameDetails(todaySchedule, gameFiles)
  const teams = hydrateTeams(season, visibleSchedule)

  return {
    season,
    games,
    allGamesCount: gameFiles.length,
    visibleGameCount: visibleSchedule.length,
    visibleThrough: asOfDate,
    teams,
    standings: buildStandings(teams),
  }
}
