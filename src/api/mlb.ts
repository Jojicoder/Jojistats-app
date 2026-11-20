import type {
  DivisionRecord,
  GameLogSplit,
  MLBGame,
  MLBGameLiveFeed,
  MLBTeam,
  MLBTeamStats,
  RosterPlayer,
} from "../components/mlb/types"

const MLB_API = "https://statsapi.mlb.com/api/v1"
const MLB_LIVE_API = "https://statsapi.mlb.com/api/v1.1"

export const MLB_SEASON = new Date().getFullYear()

type StandingsApiRecord = {
  division?: { name?: string }
  teamRecords?: DivisionRecord["teamRecords"]
}

async function fetchJson(url: string, resource: string) {
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`${resource} request failed: ${response.status}`)
  }
  return response.json()
}

export async function getGames(date: string): Promise<MLBGame[]> {
  const json = await fetchJson(
    `${MLB_API}/schedule?sportId=1&date=${date}&hydrate=linescore,probablePitcher,decisions,venue`,
    "Schedule"
  )
  return json.dates?.[0]?.games ?? []
}

export async function getGameLiveFeed(gamePk: number): Promise<MLBGameLiveFeed> {
  return fetchJson(`${MLB_LIVE_API}/game/${gamePk}/feed/live`, "Live game")
}

export async function getStandings(): Promise<DivisionRecord[]> {
  const json = await fetchJson(
    `${MLB_API}/standings?leagueId=103,104&season=${MLB_SEASON}&standingsTypes=regularSeason&hydrate=division`,
    "Standings"
  )

  return ((json.records ?? []) as StandingsApiRecord[])
    .filter(
      (record): record is StandingsApiRecord & {
        division: { name: string }
        teamRecords: DivisionRecord["teamRecords"]
      } => Boolean(record.division?.name && record.teamRecords)
    )
    .map((record) => ({
      name: record.division.name,
      teamRecords: record.teamRecords,
    }))
}

export async function getAllTeams(): Promise<MLBTeam[]> {
  const json = await fetchJson(
    `${MLB_API}/teams?sportId=1&activeStatus=Y&season=${MLB_SEASON}`,
    "Teams"
  )
  return (json.teams ?? []).filter((team: MLBTeam) => team.sport?.id === 1)
}

export async function getTeam(teamId: number): Promise<MLBTeam> {
  const json = await fetchJson(
    `${MLB_API}/teams/${teamId}?season=${MLB_SEASON}&hydrate=league,division,venue`,
    "Team"
  )
  const team = json.teams?.[0] as MLBTeam | undefined
  if (!team) throw new Error("Team not found")
  return team
}

export async function getTeamStats(teamId: number): Promise<MLBTeamStats> {
  const json = await fetchJson(
    `${MLB_API}/teams/${teamId}/stats?stats=season&group=hitting,pitching&season=${MLB_SEASON}`,
    "Team stats"
  )

  const groups = (json.stats ?? []) as Array<{
    group?: { displayName?: string }
    splits?: Array<{ stat?: Record<string, number | string> }>
  }>

  const getGroup = (name: string) =>
    groups.find((entry) => entry.group?.displayName === name)?.splits?.[0]?.stat ?? {}

  return {
    hitting: getGroup("hitting"),
    pitching: getGroup("pitching"),
  }
}

export async function getTeamSchedule(teamId: number): Promise<MLBGame[]> {
  const json = await fetchJson(
    `${MLB_API}/schedule?sportId=1&teamId=${teamId}&season=${MLB_SEASON}&gameType=R&hydrate=linescore,probablePitcher,decisions,venue`,
    "Team schedule"
  )
  return (json.dates ?? []).flatMap((date: { games?: MLBGame[] }) => date.games ?? [])
}

export async function getRoster(teamId: number): Promise<RosterPlayer[]> {
  const json = await fetchJson(
    `${MLB_API}/teams/${teamId}/roster?season=${MLB_SEASON}&rosterType=active&hydrate=person`,
    "Roster"
  )
  return json.roster ?? []
}

export async function getPlayerStats(
  playerId: number,
  group: "hitting" | "pitching"
) {
  const json = await fetchJson(
    `${MLB_API}/people/${playerId}/stats?stats=season&season=${MLB_SEASON}&group=${group}`,
    "Player stats"
  )
  return json.stats?.[0]?.splits?.[0]?.stat ?? null
}

export async function getPlayerGameLog(
  playerId: number,
  group: "hitting" | "pitching"
): Promise<GameLogSplit[]> {
  const json = await fetchJson(
    `${MLB_API}/people/${playerId}/stats?stats=gameLog&season=${MLB_SEASON}&group=${group}`,
    "Player game log"
  )
  return json.stats?.[0]?.splits ?? []
}

export async function getPlayerRecentGamePks(playerId: number, limit = 15): Promise<number[]> {
  const json = await fetchJson(
    `${MLB_API}/people/${playerId}/stats?stats=gameLog&season=${MLB_SEASON}&group=hitting`,
    "Player game log"
  )
  const splits: Array<{ game?: { gamePk?: number } }> = json.stats?.[0]?.splits ?? []
  return splits
    .slice(-limit)
    .map((s) => s.game?.gamePk)
    .filter((pk): pk is number => pk != null)
}

export type PostseasonTeam = { id: number; name: string; wins: number; isWinner: boolean }
export type PostseasonGame = {
  gamePk: number
  date: string
  gameNumber: number
  awayId: number
  homeId: number
  awayScore: number | null
  homeScore: number | null
  final: boolean
}
export type PostseasonSeries = {
  id: string // F_1 (Wild Card), D_1 (Division), L_1 (League Championship), W_1 (World Series)
  round: "F" | "D" | "L" | "W"
  /** AL for series 1-2 of a round (or L_1), NL for the rest; the World Series has none. */
  league: "AL" | "NL" | null
  bestOf: number
  teams: [PostseasonTeam, PostseasonTeam]
  winnerId: number | null
  games: PostseasonGame[]
}

type ApiGame = {
  gamePk: number
  officialDate: string
  gamesInSeries: number
  seriesGameNumber: number
  status?: { detailedState?: string; abstractGameState?: string }
  teams: {
    away: { team: { id: number; name: string }; score?: number; leagueRecord?: { wins: number } }
    home: { team: { id: number; name: string }; score?: number; leagueRecord?: { wins: number } }
  }
}

/** Real MLB postseason for one season, grouped by series. Empty before the postseason starts. */
export async function getPostseason(season: number): Promise<PostseasonSeries[]> {
  const json = await fetchJson(
    `${MLB_API}/schedule/postseason/series?season=${season}&sportId=1`,
    "Postseason"
  )
  const result: PostseasonSeries[] = []
  for (const entry of (json.series ?? []) as { series: { id: string }; games: ApiGame[] }[]) {
    const games = [...entry.games].sort((a, b) => a.seriesGameNumber - b.seriesGameNumber)
    if (games.length === 0) continue
    const round = entry.series.id[0] as PostseasonSeries["round"]
    if (!["F", "D", "L", "W"].includes(round)) continue
    const number = Number(entry.series.id.split("_")[1])
    const first = games[0]
    const bestOf = first.gamesInSeries
    const latest = [...games].reverse().find((g) => g.status?.abstractGameState === "Final") ?? null
    const ids = [first.teams.away.team, first.teams.home.team]
    const winsOf = (id: number) => {
      if (!latest) return 0
      const side = latest.teams.away.team.id === id ? latest.teams.away : latest.teams.home
      return side.leagueRecord?.wins ?? 0
    }
    const teams = ids.map((team) => ({
      id: team.id,
      name: team.name,
      wins: winsOf(team.id),
      isWinner: false,
    })) as [PostseasonTeam, PostseasonTeam]
    const needed = Math.ceil(bestOf / 2)
    const winner = teams.find((team) => team.wins >= needed)
    if (winner) winner.isWinner = true
    result.push({
      id: entry.series.id,
      round,
      league: round === "W" ? null : round === "L" ? (number === 1 ? "AL" : "NL") : number <= 2 ? "AL" : "NL",
      bestOf,
      teams,
      winnerId: winner?.id ?? null,
      games: games.map((g) => ({
        gamePk: g.gamePk,
        date: g.officialDate,
        gameNumber: g.seriesGameNumber,
        awayId: g.teams.away.team.id,
        homeId: g.teams.home.team.id,
        awayScore: g.teams.away.score ?? null,
        homeScore: g.teams.home.score ?? null,
        final: g.status?.abstractGameState === "Final",
      })),
    })
  }
  return result
}
