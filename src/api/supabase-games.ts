import { supabase } from "./supabase-client"
import type { Position, SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"

export type GameRow = {
  id: number
  team_id: number
  game_date: string
  opponent_name: string
  season_year: number
  match_number: number
  location?: string | null
  memo?: string | null
  team_score?: number | null
  opponent_score?: number | null
  result?: "W" | "L" | "T" | string | null
}

type BattingStatRow = {
  id: number
  game_id: number
  player_id: number
  game_positions?: string[] | null
  ab: number | null
  h: number | null
  double_hits: number | null
  triple_hits: number | null
  hr: number | null
  rbi: number | null
  bb: number | null
  hbp: number | null
  sf: number | null
  so: number | null
  sb: number | null
  cs: number | null
  note: string | null
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
  hbp: number | null
  strikeouts: number | null
  home_runs_allowed: number | null
  note: string | null
  games: GameRow
}

const validPositions = new Set<Position>([
  "P", "C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "UTIL",
])

function parseGamePositions(value: string[] | null | undefined): Position[] {
  if (!Array.isArray(value)) return []
  return value.filter((position): position is Position => validPositions.has(position as Position))
}

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
        match_number,
        location,
        memo,
        team_score,
        opponent_score,
        result
      )
    `)
    .eq("games.team_id", teamId)
    .eq("games.season_year", seasonYear)

  if (error) throw error

  const grouped: Record<string, SavedPitchingGameEntry[]> = {}

  ;((data ?? []) as PitchingStatRow[]).forEach((row) => {
    const statLine = {
      inningsPitchedOuts: row.innings_pitched_outs ?? 0,
      hitsAllowed: row.hits_allowed ?? 0,
      runsAllowed: row.runs_allowed ?? 0,
      earnedRuns: row.earned_runs ?? 0,
      walks: row.walks ?? 0,
      hitBatters: row.hbp ?? 0,
      strikeouts: row.strikeouts ?? 0,
      homeRunsAllowed: row.home_runs_allowed ?? 0,
      note: row.note ?? "",
    }
    const hasPitchingActivity =
      statLine.inningsPitchedOuts > 0 || statLine.hitsAllowed > 0 || statLine.runsAllowed > 0 ||
      statLine.earnedRuns > 0 || statLine.walks > 0 || statLine.hitBatters > 0 ||
      statLine.strikeouts > 0 || statLine.homeRunsAllowed > 0 || statLine.note.trim() !== ""
    if (!hasPitchingActivity) return

    const playerId = String(row.player_id)
    if (!grouped[playerId]) grouped[playerId] = []

    grouped[playerId].push({
      id: `db-${row.id}`,
      statId: row.id,
      gameId: row.game_id,
      teamId: String(row.games.team_id),
      playerId,
      gameMeta: {
        date: row.games.game_date,
        opponent: row.games.opponent_name,
        location: row.games.location ?? "",
        seasonYear: row.games.season_year,
        matchNumber: row.games.match_number,
        memo: row.games.memo ?? "",
        teamScore: row.games.team_score ?? null,
        opponentScore: row.games.opponent_score ?? null,
        result:
          row.games.result === "W" || row.games.result === "L" || row.games.result === "T"
            ? row.games.result
            : "",
      },
      statLine,
    })
  })

  return grouped
}

export const fetchGamesBySeason = async (teamId: number, seasonYear: number): Promise<GameRow[]> => {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .eq("team_id", teamId)
    .eq("season_year", seasonYear)
    .order("game_date", { ascending: true })
    .order("match_number", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as GameRow[]
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
      id: `db-stat-${stat.id}`,
      statId: stat.id,
      gameId: game.id,
      teamId: String(game.team_id),
      playerId,
      gameMeta: {
        date: game.game_date,
        opponent: game.opponent_name,
        location: game.location ?? "",
        seasonYear: game.season_year,
        matchNumber: game.match_number,
        memo: game.memo ?? "",
        teamScore: game.team_score ?? null,
        opponentScore: game.opponent_score ?? null,
        result:
          game.result === "W" || game.result === "L" || game.result === "T" ? game.result : "",
      },
      gamePositions: parseGamePositions(stat.game_positions),
      statLine: {
        AB: stat.ab ?? 0,
        H: stat.h ?? 0,
        doubles: stat.double_hits ?? 0,
        triples: stat.triple_hits ?? 0,
        HR: stat.hr ?? 0,
        RBI: stat.rbi ?? 0,
        BB: stat.bb ?? 0,
        HBP: stat.hbp ?? 0,
        SF: stat.sf ?? 0,
        SO: stat.so ?? 0,
        SB: stat.sb ?? 0,
        CS: stat.cs ?? 0,
        note: stat.note ?? "",
      },
    }

    if (!result[playerId]) result[playerId] = []
    result[playerId].push(entry)
  })

  return result
}
