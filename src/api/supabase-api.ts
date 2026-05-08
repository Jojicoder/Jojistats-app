import { supabase } from "./supabase-client"
import type {
  Position,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  UserAccess,
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

export type UserAccessRow = {
  id: number
  email: string
  team_id: number
  player_id: number
  role: string | null
  is_active: boolean | number | null
}

type GameRow = {
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
}

const validPositions = new Set<Position>([
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "UTIL",
])

function parseGamePositions(value: string[] | null | undefined): Position[] {
  if (!Array.isArray(value)) return []
  return value.filter((position): position is Position =>
    validPositions.has(position as Position)
  )
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

export const fetchPlayersByTeam = async (teamId: number) => {
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("team_id", teamId)
    .order("season_year", { ascending: false })
    .order("jersey_number", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as PlayerRow[]
}

export const fetchTeamById = async (teamId: number) => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single()

  if (error) throw new Error(error.message)
  return data as TeamRow
}

export const fetchUserAccessRows = async () => {
  const { data, error } = await supabase
    .from("user_access")
    .select("*")
    .order("email", { ascending: true })

  if (error) throw new Error(error.message)
  return (data ?? []) as UserAccessRow[]
}

export const fetchUserAccessByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from("user_access")
    .select("*")
    .eq("email", email.trim().toLowerCase())
    .eq("is_active", true)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? (data as UserAccessRow) : null
}

export const upsertUserAccess = async (access: Omit<UserAccess, "id">) => {
  const { error } = await supabase.from("user_access").upsert(
    {
      email: access.email.trim().toLowerCase(),
      team_id: Number(access.teamId),
      player_id: Number(access.playerId),
      role: access.role,
      is_active: access.isActive,
    },
    { onConflict: "email" }
  )

  if (error) throw new Error(error.message)
}

export const updateUserAccessStatus = async (
  accessId: string,
  isActive: boolean
) => {
  const { error } = await supabase
    .from("user_access")
    .update({ is_active: isActive })
    .eq("id", Number(accessId))

  if (error) throw new Error(error.message)
}

export function mapUserAccessRow(row: UserAccessRow): UserAccess {
  const role =
    row.role === "admin" ||
    row.role === "manager" ||
    row.role === "recorder" ||
    row.role === "player"
      ? row.role
      : "player"

  return {
    id: String(row.id),
    email: row.email,
    teamId: String(row.team_id),
    playerId: String(row.player_id),
    role,
    isActive: Boolean(row.is_active),
  }
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
    }
    const hasPitchingActivity = Object.values(statLine).some((value) => value > 0)
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
          game.result === "W" || game.result === "L" || game.result === "T"
            ? game.result
            : "",
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
        note: "",
      },
    }

    if (!result[playerId]) result[playerId] = []
    result[playerId].push(entry)
  })

  return result
}
