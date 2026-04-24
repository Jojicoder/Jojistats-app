import { supabase } from "../lib/supabase"
import type {
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"

export type TeamRow = {
  id: number
  name: string
  is_archived: boolean | number | null
  current_season_year: number
}

export type PlayerRow = {
  id: number
  team_id: number
  name: string
  position: string
  jersey_number: number | null
  season_year: number
  is_archived: boolean | number | null
}

type GameRow = {
  id: number
  team_id: number
  game_date: string
  opponent_name: string
  season_year: number
  match_number: number
}

type BattingStatRow = {
  game_id: number
  player_id: number
  ab: number | null
  h: number | null
  double_hits: number | null
  triple_hits: number | null
  hr: number | null
  rbi: number | null
  bb: number | null
  so: number | null
}

type PitchingStatRow = {
  id: number
  game_id: number
  player_id: number
  innings_pitched_outs: number | null
  hits_allowed: number | null
  runs_allowed: number | null
  earned_runs: number | null
  walks: number | null
  strikeouts: number | null
  home_runs_allowed: number | null
  games: GameRow
}

export const fetchTeams = async () => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("id", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TeamRow[]
}

export const fetchPlayers = async (teamId: number, seasonYear: number) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .eq("season_year", seasonYear)
    .order("jersey_number", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as PlayerRow[]
}

// Fetch pitching stats grouped by player
export async function fetchPitchingEntriesByPlayer(
  teamId: number,
  seasonYear: number
): Promise<Record<string, SavedPitchingGameEntry[]>> {
  const { data, error } = await supabase
    .from("pitching_game_stats")
    .select(`
      *,
      games!inner(
        id,
        team_id,
        game_date,
        opponent_name,
        season_year,
        match_number
      )
    `)
    .eq("games.team_id", teamId)
    .eq("games.season_year", seasonYear)

  if (error) throw error

  const grouped: Record<string, SavedPitchingGameEntry[]> = {}

  ;((data ?? []) as PitchingStatRow[]).forEach((row) => {
    const playerId = String(row.player_id)
    if (!grouped[playerId]) grouped[playerId] = []

    grouped[playerId].push({
      id: `db-${row.id}`,
      teamId: String(row.games.team_id),
      playerId,
      gameMeta: {
        date: row.games.game_date,
        opponent: row.games.opponent_name,
        seasonYear: row.games.season_year,
        matchNumber: row.games.match_number,
      },
      statLine: {
        inningsPitchedOuts: row.innings_pitched_outs ?? 0,
        hitsAllowed: row.hits_allowed ?? 0,
        runsAllowed: row.runs_allowed ?? 0,
        earnedRuns: row.earned_runs ?? 0,
        walks: row.walks ?? 0,
        strikeouts: row.strikeouts ?? 0,
        homeRunsAllowed: row.home_runs_allowed ?? 0,
      },
    })
  })

  return grouped
}

export const fetchSavedEntriesByPlayer = async (
  teamId: number,
  seasonYear?: number
): Promise<Record<string, SavedBattingGameEntry[]>> => {
  let gamesQuery = supabase
    .from("games")
    .select("*")
    .eq("team_id", teamId)
    .order("game_date", { ascending: true })
    .order("match_number", { ascending: true })

  if (seasonYear != null) {
    gamesQuery = gamesQuery.eq("season_year", seasonYear)
  }

  const { data: games, error: gamesError } = await gamesQuery
  if (gamesError) throw new Error(gamesError.message)
  if (!games || games.length === 0) return {}

  const gameRows = games as GameRow[]
  const gameIds = gameRows.map((game) => game.id)

  const { data: stats, error: statsError } = await supabase
    .from("batting_game_stats")
    .select("*")
    .in("game_id", gameIds)

  if (statsError) throw new Error(statsError.message)
  if (!stats || stats.length === 0) return {}

  const statRows = stats as BattingStatRow[]
  const gameMap = new Map(gameRows.map((game) => [game.id, game]))
  const result: Record<string, SavedBattingGameEntry[]> = {}

  statRows.forEach((stat) => {
    const game = gameMap.get(stat.game_id)
    if (!game) return

    const playerId = String(stat.player_id)
    const entry: SavedBattingGameEntry = {
      id: `db-${game.id}`,
      gameId: game.id,
      teamId: String(game.team_id),
      gameMeta: {
        date: game.game_date,
        opponent: game.opponent_name,
        seasonYear: game.season_year,
        matchNumber: game.match_number,
      },
      gamePositions: [],
      statLine: {
        AB: stat.ab ?? 0,
        H: stat.h ?? 0,
        doubles: stat.double_hits ?? 0,
        triples: stat.triple_hits ?? 0,
        HR: stat.hr ?? 0,
        RBI: stat.rbi ?? 0,
        BB: stat.bb ?? 0,
        SO: stat.so ?? 0,
        note: "",
      },
    }

    if (!result[playerId]) result[playerId] = []
    result[playerId].push(entry)
  })

  return result
}
