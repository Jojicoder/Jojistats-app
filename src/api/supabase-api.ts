import { supabase } from "../lib/supabase"
import type { SavedBattingGameEntry } from "../types"

export const fetchTeams = async () => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("id", { ascending: false })

  if (error) throw new Error(error.message)
  return data ?? []
}

export const fetchPlayers = async (teamId: number, seasonYear: number) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .eq("season_year", seasonYear)
    .order("jersey_number", { ascending: true })

  if (error) throw new Error(error.message)
  return data ?? []
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

  const gameIds = games.map((g: any) => g.id)

  const { data: stats, error: statsError } = await supabase
    .from("batting_game_stats")
    .select("*")
    .in("game_id", gameIds)

  if (statsError) throw new Error(statsError.message)
  if (!stats || stats.length === 0) return {}

  const gameMap = new Map(games.map((g: any) => [g.id, g]))
  const result: Record<string, SavedBattingGameEntry[]> = {}

  stats.forEach((stat: any) => {
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
