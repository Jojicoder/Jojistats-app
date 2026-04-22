import type { SavedBattingGameEntry } from "../types"

const BASE_URL = "http://localhost:3001"

/* =========================
   GAMES
========================= */

export const fetchGames = async (teamId: number, seasonYear?: number) => {
  const params = new URLSearchParams()
  params.append("team_id", String(teamId))

  if (seasonYear != null) {
    params.append("season_year", String(seasonYear))
  }

  const res = await fetch(`${BASE_URL}/games?${params.toString()}`)

  if (!res.ok) {
    throw new Error("Failed to fetch games")
  }

  return res.json()
}

/* =========================
   BATTING GAME STATS
========================= */

export const fetchBattingGameStats = async (
  gameId?: number,
  playerId?: number
) => {
  const params = new URLSearchParams()

  if (gameId != null) {
    params.append("game_id", String(gameId))
  }

  if (playerId != null) {
    params.append("player_id", String(playerId))
  }

  const query = params.toString()
  const url = query
    ? `${BASE_URL}/batting-game-stats?${query}`
    : `${BASE_URL}/batting-game-stats`

  const res = await fetch(url)

  if (!res.ok) {
    throw new Error("Failed to fetch batting game stats")
  }

  return res.json()
}

/* =========================
   SAVED ENTRIES
========================= */

export const fetchSavedEntriesByPlayer = async (
  teamId: number,
  seasonYear?: number
): Promise<Record<string, SavedBattingGameEntry[]>> => {
  const games = await fetchGames(teamId, seasonYear)

  if (!Array.isArray(games) || games.length === 0) {
    return {}
  }

  const allStatsArrays = await Promise.all(
    games.map((game: any) => fetchBattingGameStats(game.id))
  )

  const gameMap = new Map<number, any>()
  games.forEach((game: any) => {
    gameMap.set(game.id, game)
  })

  const result: Record<string, SavedBattingGameEntry[]> = {}

  allStatsArrays.forEach((stats) => {
    if (!Array.isArray(stats)) return

    stats.forEach((stat: any) => {
      const game = gameMap.get(stat.game_id)
      if (!game) return

      const playerId = String(stat.player_id)

      const entry: SavedBattingGameEntry = {
            id: `db-${game.id}`,
            gameId: game.id, // ← 追加（本物のID）
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

      if (!result[playerId]) {
        result[playerId] = []
      }

      result[playerId].push(entry)
    })
  })

  Object.values(result).forEach((entries) => {
    entries.sort((a, b) => {
      if (a.gameMeta.date === b.gameMeta.date) {
        return a.gameMeta.matchNumber - b.gameMeta.matchNumber
      }
      return a.gameMeta.date.localeCompare(b.gameMeta.date)
    })
  })

  return result
}

/* =========================
   TEAMS
========================= */

export const fetchTeams = async () => {
  const res = await fetch(`${BASE_URL}/teams`)
  if (!res.ok) {
    throw new Error("Failed to fetch teams")
  }
  return res.json()
}

export const createTeam = async (payload: {
  name: string
  current_season_year?: number
  is_archived?: number
}) => {
  const res = await fetch(`${BASE_URL}/teams`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Failed to create team")
  }

  return res.json()
}

export const updateTeam = async (teamId: number, payload: {
  name: string
  current_season_year: number
  is_archived?: number
}) => {
  const res = await fetch(`${BASE_URL}/teams/${teamId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Failed to update team")
  }

  return res.json()
}

export const archiveTeam = async (teamId: number) => {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/archive`, {
    method: "PUT",
  })

  if (!res.ok) {
    throw new Error("Failed to archive team")
  }

  return res.json()
}

export const startNewSeason = async (
  teamId: number,
  copyRoster: boolean = true
) => {
  const res = await fetch(`${BASE_URL}/teams/${teamId}/start-new-season`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      copy_roster: copyRoster,
    }),
  })

  if (!res.ok) {
    throw new Error("Failed to start new season")
  }

  return res.json()
}

/* =========================
   PLAYERS
========================= */

export const fetchPlayers = async (
  teamId: number,
  seasonYear: number
) => {
  const res = await fetch(
    `${BASE_URL}/players?team_id=${teamId}&season_year=${seasonYear}`
  )

  if (!res.ok) {
    throw new Error("Failed to fetch players")
  }

  return res.json()
}

export const createPlayer = async (payload: {
  team_id: number
  name: string
  jersey_number?: number | null
  position?: string | null
  season_year: number
  is_archived?: number
}) => {
  const res = await fetch(`${BASE_URL}/players`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Failed to create player")
  }

  return res.json()
}

export const updatePlayer = async (
  playerId: number,
  payload: {
    team_id: number
    name: string
    jersey_number?: number | null
    position?: string | null
    season_year: number
    is_archived?: number
  }
) => {
  const res = await fetch(`${BASE_URL}/players/${playerId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error("Failed to update player")
  }

  return res.json()
}

export const archivePlayer = async (playerId: number) => {
  const res = await fetch(`${BASE_URL}/players/${playerId}/archive`, {
    method: "PUT",
  })

  if (!res.ok) {
    throw new Error("Failed to archive player")
  }

  return res.json()
}

/* =========================
   FULL GAME SAVE / UPDATE / DELETE
========================= */

type FullGamePayload = {
  game: {
    team_id: number
    game_date: string
    opponent_name: string
    season_year: number
    match_number: number
    location?: string | null
  }
  battingStats: any[]
  pitchingStats?: any[]
}

export const createFullGame = async (data: FullGamePayload) => {
  const res = await fetch(`${BASE_URL}/games/full`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || "Failed to create game")
  }

  return res.json()
}

export const updateFullGame = async (gameId: number, data: FullGamePayload) => {
  const res = await fetch(`${BASE_URL}/games/${gameId}/full`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.message || "Failed to update game")
  }

  return res.json()
}

export const deleteGame = async (gameId: number) => {
  const res = await fetch(`${BASE_URL}/games/${gameId}`, {
    method: "DELETE",
  })

  if (!res.ok) {
    throw new Error("Failed to delete game")
  }

  return res.json()
}