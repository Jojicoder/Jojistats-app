import { supabase } from "./supabase-client"

/* =========================
   TEAMS
========================= */

export const createTeam = async (payload: {
  name: string
  current_season_year?: number
  is_archived?: number
}) => {
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: payload.name,
      current_season_year: payload.current_season_year ?? new Date().getFullYear(),
      is_archived: Boolean(payload.is_archived ?? 0),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
}

export const updateTeam = async (
  teamId: number,
  payload: {
    name: string
    current_season_year: number
    is_archived?: number
  }
) => {
  const { error } = await supabase
    .from("teams")
    .update({
      name: payload.name,
      current_season_year: payload.current_season_year,
      is_archived: Boolean(payload.is_archived ?? 0),
    })
    .eq("id", teamId)
  if (error) throw new Error(error.message)
}

export const archiveTeam = async (teamId: number) => {
  const { error } = await supabase
    .from("teams")
    .update({ is_archived: true })
    .eq("id", teamId)
  if (error) throw new Error(error.message)
}

export const startNewSeason = async (
  teamId: number,
  copyRoster: boolean = true
) => {
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", teamId)
    .single()
  if (teamError) throw new Error(teamError.message)

  const nextSeasonYear = team.current_season_year + 1

  const { error: updateError } = await supabase
    .from("teams")
    .update({ current_season_year: nextSeasonYear })
    .eq("id", teamId)
  if (updateError) throw new Error(updateError.message)

  if (copyRoster) {
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("*")
      .eq("team_id", teamId)
      .eq("season_year", team.current_season_year)
      .eq("is_archived", false)
    if (playersError) throw new Error(playersError.message)

    if (players && players.length > 0) {
      const { error: insertError } = await supabase
        .from("players")
        .insert(
          players.map((p) => ({
            team_id: p.team_id,
            name: p.name,
            jersey_number: p.jersey_number,
            position: p.position,
            season_year: nextSeasonYear,
            is_archived: false,
          }))
        )
      if (insertError) throw new Error(insertError.message)
    }
  }

  return { current_season_year: nextSeasonYear }
}

/* =========================
   PLAYERS
========================= */

export const createPlayer = async (payload: {
  team_id: number
  name: string
  jersey_number?: number | null
  position?: string | null
  season_year: number
  is_archived?: number
}) => {
  const { data, error } = await supabase
    .from("players")
    .insert({
      team_id: payload.team_id,
      name: payload.name,
      jersey_number: payload.jersey_number ?? null,
      position: payload.position ?? null,
      season_year: payload.season_year,
      is_archived: Boolean(payload.is_archived ?? 0),
    })
    .select()
    .single()
  if (error) throw new Error(error.message)
  return data
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
  const { error } = await supabase
    .from("players")
    .update({
      team_id: payload.team_id,
      name: payload.name,
      jersey_number: payload.jersey_number ?? null,
      position: payload.position ?? null,
      season_year: payload.season_year,
      is_archived: Boolean(payload.is_archived ?? 0),
    })
    .eq("id", playerId)
  if (error) throw new Error(error.message)
}

export const archivePlayer = async (playerId: number) => {
  const { error } = await supabase
    .from("players")
    .update({ is_archived: true })
    .eq("id", playerId)
  if (error) throw new Error(error.message)
}

/* =========================
   FULL GAME SAVE / UPDATE / DELETE
========================= */

type BattingGameStatPayload = {
  player_id: number
  batting_order: number
  game_positions?: string[]
  ab?: number
  h?: number
  double_hits?: number
  triple_hits?: number
  hr?: number
  rbi?: number
  bb?: number
  so?: number
  hbp?: number
  sf?: number
  note?: string | null
}

type PitchingGameStatPayload = {
  player_id: number
  innings_pitched_outs?: number
  hits_allowed?: number
  runs_allowed?: number
  earned_runs?: number
  walks?: number
  hbp?: number
  strikeouts?: number
  home_runs_allowed?: number
  win_flag?: boolean
  loss_flag?: boolean
  save_flag?: boolean
  hold_flag?: boolean
}

export type FullGamePayload = {
  game: {
    team_id: number
    game_date: string
    opponent_name: string
    season_year: number
    match_number: number
    location?: string | null
    memo?: string | null
    team_score?: number | null
    opponent_score?: number | null
    result?: "W" | "L" | "T" | "" | null
  }
  battingStats: BattingGameStatPayload[]
  pitchingStats?: PitchingGameStatPayload[]
}

const toGameRow = (game: FullGamePayload["game"]) => ({
  game_date: game.game_date,
  opponent_name: game.opponent_name,
  season_year: game.season_year,
  match_number: game.match_number,
  location: game.location ?? null,
  ...(game.memo !== undefined ? { memo: game.memo ?? null } : {}),
  team_score: game.team_score ?? null,
  opponent_score: game.opponent_score ?? null,
  result: game.result || null,
})

const toBattingStatRow = (s: BattingGameStatPayload, gameId?: number) => ({
  ...(gameId !== undefined ? { game_id: gameId } : {}),
  player_id: s.player_id,
  batting_order: s.batting_order,
  game_positions: s.game_positions ?? [],
  ab: s.ab ?? 0,
  h: s.h ?? 0,
  double_hits: s.double_hits ?? 0,
  triple_hits: s.triple_hits ?? 0,
  hr: s.hr ?? 0,
  rbi: s.rbi ?? 0,
  bb: s.bb ?? 0,
  so: s.so ?? 0,
  hbp: s.hbp ?? 0,
  sf: s.sf ?? 0,
  note: s.note?.trim() || null,
})

const toPitchingStatRow = (
  s: PitchingGameStatPayload,
  gameId?: number,
  includeDecisionFlags = false
) => ({
  ...(gameId !== undefined ? { game_id: gameId } : {}),
  player_id: s.player_id,
  innings_pitched_outs: s.innings_pitched_outs ?? 0,
  hits_allowed: s.hits_allowed ?? 0,
  runs_allowed: s.runs_allowed ?? 0,
  earned_runs: s.earned_runs ?? 0,
  walks: s.walks ?? 0,
  hbp: s.hbp ?? 0,
  strikeouts: s.strikeouts ?? 0,
  home_runs_allowed: s.home_runs_allowed ?? 0,
  ...(includeDecisionFlags
    ? {
        win_flag: s.win_flag ?? false,
        loss_flag: s.loss_flag ?? false,
        save_flag: s.save_flag ?? false,
        hold_flag: s.hold_flag ?? false,
      }
    : {}),
})

const assertRowsChanged = (rows: unknown[] | null, message: string) => {
  if (!rows || rows.length === 0) throw new Error(message)
}

const isMatchNumberConflict = (error: unknown) =>
  error instanceof Error &&
  (error.message.includes("games_team_season_match_number_unique") ||
    error.message.includes("duplicate key value"))

const getNextAvailableMatchNumber = async (
  teamId: number,
  seasonYear: number,
  attemptedMatchNumber: number
) => {
  const { data, error } = await supabase
    .from("games")
    .select("match_number")
    .eq("team_id", teamId)
    .eq("season_year", seasonYear)
    .order("match_number", { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)

  const maxMatchNumber = Number(data?.[0]?.match_number) || 0
  return Math.max(maxMatchNumber + 1, attemptedMatchNumber + 1)
}

const deleteRowsByGameId = async (gameId: number) => {
  const { error: battingError } = await supabase
    .from("batting_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (battingError) throw new Error(battingError.message)

  const { error: pitchingError } = await supabase
    .from("pitching_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (pitchingError) throw new Error(pitchingError.message)
}

const deleteGameIfNoStats = async (gameId: number) => {
  const { count: remainingBattingCount, error: battingCountError } = await supabase
    .from("batting_game_stats")
    .select("game_id", { count: "exact", head: true })
    .eq("game_id", gameId)
  if (battingCountError) throw new Error(battingCountError.message)

  const { count: remainingPitchingCount, error: pitchingCountError } = await supabase
    .from("pitching_game_stats")
    .select("game_id", { count: "exact", head: true })
    .eq("game_id", gameId)
  if (pitchingCountError) throw new Error(pitchingCountError.message)

  if ((remainingBattingCount ?? 0) > 0 || (remainingPitchingCount ?? 0) > 0) return

  const { error: gameError } = await supabase
    .from("games")
    .delete()
    .eq("id", gameId)
  if (gameError) throw new Error(gameError.message)
}

const updateGameRow = async (gameId: number, game: FullGamePayload["game"]) => {
  const { data: updatedRows, error } = await supabase
    .from("games")
    .update(toGameRow(game))
    .eq("id", gameId)
    .select("id")

  if (error) throw new Error(error.message)
  assertRowsChanged(
    updatedRows,
    `No game was updated for game ${gameId}. The database update policy is not allowing this user to update that row.`
  )
}

export const createFullGame = async (data: FullGamePayload) => {
  try {
    return await createFullGameOnce(data)
  } catch (error) {
    if (!isMatchNumberConflict(error)) throw error

    const nextMatchNumber = await getNextAvailableMatchNumber(
      data.game.team_id,
      data.game.season_year,
      data.game.match_number
    )
    return await createFullGameOnce({
      ...data,
      game: { ...data.game, match_number: nextMatchNumber },
    })
  }
}

const createFullGameOnce = async (data: FullGamePayload) => {
  let createdGameId: number | null = null

  try {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        team_id: data.game.team_id,
        ...toGameRow(data.game),
      })
      .select()
      .single()
    if (gameError) throw new Error(gameError.message)
    createdGameId = game.id

    if (data.battingStats.length > 0) {
      const { error: battingError } = await supabase
        .from("batting_game_stats")
        .insert(data.battingStats.map((s) => toBattingStatRow(s, game.id)))
      if (battingError) throw new Error(battingError.message)
    }

    if (data.pitchingStats && data.pitchingStats.length > 0) {
      const { error: pitchingError } = await supabase
        .from("pitching_game_stats")
        .insert(data.pitchingStats.map((s) => toPitchingStatRow(s, game.id, true)))
      if (pitchingError) throw new Error(pitchingError.message)
    }

    createdGameId = null
    return { game_id: game.id }
  } catch (error) {
    if (createdGameId != null) {
      await cleanupCreatedGame(createdGameId).catch((cleanupError) => {
        console.error("Failed to clean up partially saved game", cleanupError)
      })
    }
    throw error
  }
}

const cleanupCreatedGame = async (gameId: number) => {
  await deleteRowsByGameId(gameId)
  const { error } = await supabase.from("games").delete().eq("id", gameId)
  if (error) throw new Error(error.message)
}

export const updateFullGame = async (gameId: number, data: FullGamePayload) => {
  const [existingGameResult, existingBattingResult, existingPitchingResult] = await Promise.all([
    supabase.from("games").select("*").eq("id", gameId).single(),
    supabase.from("batting_game_stats").select("*").eq("game_id", gameId),
    supabase.from("pitching_game_stats").select("*").eq("game_id", gameId),
  ])

  if (existingGameResult.error) throw new Error(existingGameResult.error.message)
  if (existingBattingResult.error) throw new Error(existingBattingResult.error.message)
  if (existingPitchingResult.error) throw new Error(existingPitchingResult.error.message)

  const existingGame = existingGameResult.data
  const existingBattingStats = existingBattingResult.data ?? []
  const existingPitchingStats = existingPitchingResult.data ?? []
  let shouldRestore = false

  try {
    await updateGameRow(gameId, data.game)
    shouldRestore = true
    await deleteRowsByGameId(gameId)

    if (data.battingStats.length > 0) {
      const { error: battingError } = await supabase
        .from("batting_game_stats")
        .insert(data.battingStats.map((s) => toBattingStatRow(s, gameId)))
      if (battingError) throw new Error(battingError.message)
    }

    if (data.pitchingStats && data.pitchingStats.length > 0) {
      const { error: pitchingError } = await supabase
        .from("pitching_game_stats")
        .insert(data.pitchingStats.map((s) => toPitchingStatRow(s, gameId, true)))
      if (pitchingError) throw new Error(pitchingError.message)
    }
  } catch (error) {
    if (shouldRestore) {
      await restoreFullGame(gameId, existingGame, existingBattingStats, existingPitchingStats).catch((restoreError) => {
        console.error("Failed to restore game after update error", restoreError)
      })
    }
    throw error
  }
}

const restoreFullGame = async (
  gameId: number,
  existingGame: Record<string, unknown>,
  existingBattingStats: Record<string, unknown>[],
  existingPitchingStats: Record<string, unknown>[]
) => {
  const { error: gameError } = await supabase
    .from("games")
    .update({
      game_date: existingGame.game_date,
      opponent_name: existingGame.opponent_name,
      season_year: existingGame.season_year,
      match_number: existingGame.match_number,
      location: existingGame.location,
      memo: existingGame.memo,
      team_score: existingGame.team_score,
      opponent_score: existingGame.opponent_score,
      result: existingGame.result,
    })
    .eq("id", gameId)
  if (gameError) throw new Error(gameError.message)

  await deleteRowsByGameId(gameId)

  if (existingBattingStats.length > 0) {
    const { error: battingError } = await supabase
      .from("batting_game_stats")
      .insert(existingBattingStats)
    if (battingError) throw new Error(battingError.message)
  }

  if (existingPitchingStats.length > 0) {
    const { error: pitchingError } = await supabase
      .from("pitching_game_stats")
      .insert(existingPitchingStats)
    if (pitchingError) throw new Error(pitchingError.message)
  }
}

export const deleteGame = async (gameId: number) => {
  const { error: battingError } = await supabase
    .from("batting_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (battingError) throw new Error(battingError.message)

  const { error: pitchingError } = await supabase
    .from("pitching_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (pitchingError) throw new Error(pitchingError.message)

  const { error } = await supabase.from("games").delete().eq("id", gameId)
  if (error) throw new Error(error.message)
}

export const deleteBattingGameEntry = async (gameId: number, playerId: number) => {
  const { data: deletedBattingRows, error: battingError } = await supabase
    .from("batting_game_stats")
    .delete()
    .eq("game_id", gameId)
    .eq("player_id", playerId)
    .select("game_id")

  if (battingError) throw new Error(battingError.message)
  assertRowsChanged(
    deletedBattingRows,
    `No batting entry was deleted for game ${gameId}, player ${playerId}. Check delete permission for this team.`
  )

  const { error: pitchingDeleteError } = await supabase
    .from("pitching_game_stats")
    .delete()
    .eq("game_id", gameId)
    .eq("player_id", playerId)
  if (pitchingDeleteError) throw new Error(pitchingDeleteError.message)

  await deleteGameIfNoStats(gameId)
}

export const deleteBattingStatEntry = async (statId: number, gameId: number) => {
  const { data: deletedBattingRows, error: battingError } = await supabase
    .from("batting_game_stats")
    .delete()
    .eq("id", statId)
    .select("id, player_id")

  if (battingError) throw new Error(battingError.message)
  assertRowsChanged(
    deletedBattingRows,
    `No batting entry was deleted for stat ${statId}. The database delete policy is not allowing this user to delete that row.`
  )

  const playerId = deletedBattingRows[0]?.player_id
  if (playerId != null) {
    const { error: pitchingDeleteError } = await supabase
      .from("pitching_game_stats")
      .delete()
      .eq("game_id", gameId)
      .eq("player_id", playerId)
    if (pitchingDeleteError) throw new Error(pitchingDeleteError.message)
  }

  await deleteGameIfNoStats(gameId)
}

export const updateGameInfo = async (
  gameId: number,
  game: FullGamePayload["game"]
) => {
  await updateGameRow(gameId, game)
}

export const updateBattingStatEntry = async (
  statId: number,
  gameId: number,
  data: {
    game: FullGamePayload["game"]
    battingStat: FullGamePayload["battingStats"][number]
  }
) => {
  await updateGameRow(gameId, data.game)

  const { data: updatedBattingRows, error: battingError } = await supabase
    .from("batting_game_stats")
    .update(toBattingStatRow(data.battingStat))
    .eq("id", statId)
    .select("id")
  if (battingError) throw new Error(battingError.message)
  assertRowsChanged(
    updatedBattingRows,
    `No batting entry was updated for stat ${statId}. The database update policy is not allowing this user to update that row.`
  )
}

export const updatePitchingStatEntry = async (
  statId: number,
  gameId: number,
  data: {
    game: FullGamePayload["game"]
    pitchingStat: PitchingGameStatPayload
  }
) => {
  await updateGameRow(gameId, data.game)

  const { data: updatedPitchingRows, error: pitchingError } = await supabase
    .from("pitching_game_stats")
    .update(toPitchingStatRow(data.pitchingStat))
    .eq("id", statId)
    .select("id")
  if (pitchingError) throw new Error(pitchingError.message)
  assertRowsChanged(
    updatedPitchingRows,
    `No pitching entry was updated for stat ${statId}. The database update policy is not allowing this user to update that row.`
  )
}

export const deletePitchingStatEntry = async (statId: number, gameId: number) => {
  const { data: deletedPitchingRows, error: pitchingError } = await supabase
    .from("pitching_game_stats")
    .delete()
    .eq("id", statId)
    .select("id")

  if (pitchingError) throw new Error(pitchingError.message)
  assertRowsChanged(
    deletedPitchingRows,
    `No pitching entry was deleted for stat ${statId}. The database delete policy is not allowing this user to delete that row.`
  )

  await deleteGameIfNoStats(gameId)
}
