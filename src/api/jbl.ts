import { ALL_TEAMS, DIVISIONS, DIVISION_NAMES } from "../sim/jblSeason"
import type { JblGameJson, JblSeasonJson } from "../sim/jblJsonTypes"

export const JBL_SEASON = 2026
export const JBL_SEASON_ROOT = `/jbl/seasons/${JBL_SEASON}`

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
  const availableFiles = new Set(gameFiles)
  const detailFiles = schedule
    .map((game) => game.gameFile.replace(/^games\//, ""))
    .filter((file) => availableFiles.has(file))

  return mapLimit(
    detailFiles,
    12,
    (file) => fetchJson<JblGameJson>(`${JBL_SEASON_ROOT}/games/${file}`, `JBL game ${file}`)
  )
}

export async function getJblVisibleGames(asOfDate = todayKey()): Promise<JblGameJson[]> {
  const season = await fetchJson<JblSeasonJson>(`${JBL_SEASON_ROOT}/season.json`, "JBL season")
  const gameFiles = await fetchJson<string[]>(`${JBL_SEASON_ROOT}/games/index.json`, "JBL game index")

  return loadGameDetails(
    season.schedule.filter((game) => game.date <= asOfDate && Boolean(game.finalScore)),
    gameFiles,
  )
}

export async function getJblScheduleForDate(date: string): Promise<JblScheduleGame[]> {
  const season = await fetchJson<JblSeasonJson>(`${JBL_SEASON_ROOT}/season.json`, "JBL season")
  return season.schedule.filter((game) => game.date === date)
}

export async function getJblGameById(
  gameId: string,
): Promise<{ game: JblGameJson; schedule: JblScheduleGame } | null> {
  const season = await fetchJson<JblSeasonJson>(`${JBL_SEASON_ROOT}/season.json`, "JBL season")
  const schedule = season.schedule.find((candidate) => candidate.gameId === gameId)
  if (!schedule) return null

  const game = await fetchJson<JblGameJson>(`${JBL_SEASON_ROOT}/${schedule.gameFile}`, `JBL game ${gameId}`)
  return { game, schedule }
}

export async function getJblData(asOfDate = todayKey()): Promise<JblData> {
  const season = await fetchJson<JblSeasonJson>(`${JBL_SEASON_ROOT}/season.json`, "JBL season")
  const gameFiles = await fetchJson<string[]>(`${JBL_SEASON_ROOT}/games/index.json`, "JBL game index")
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
