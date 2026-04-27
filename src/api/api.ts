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
}

type PitchingGameStatPayload = {
  player_id: number
  innings_pitched_outs?: number
  hits_allowed?: number
  runs_allowed?: number
  earned_runs?: number
  walks?: number
  strikeouts?: number
  home_runs_allowed?: number
  win_flag?: boolean
  loss_flag?: boolean
  save_flag?: boolean
  hold_flag?: boolean
}

type FullGamePayload = {
  game: {
    team_id: number
    game_date: string
    opponent_name: string
    season_year: number
    match_number: number
    location?: string | null
  }
  battingStats: BattingGameStatPayload[]
  pitchingStats?: PitchingGameStatPayload[]
}

export const createFullGame = async (data: FullGamePayload) => {
  const { data: game, error: gameError } = await supabase
    .from("games")
    .insert({
      team_id: data.game.team_id,
      game_date: data.game.game_date,
      opponent_name: data.game.opponent_name,
      season_year: data.game.season_year,
      match_number: data.game.match_number,
      location: data.game.location ?? null,
    })
    .select()
    .single()
  if (gameError) throw new Error(gameError.message)

  if (data.battingStats.length > 0) {
    const { error: battingError } = await supabase
      .from("batting_game_stats")
      .insert(
        data.battingStats.map((s) => ({
          game_id: game.id,
          player_id: s.player_id,
          batting_order: s.batting_order,
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
        }))
      )
    if (battingError) throw new Error(battingError.message)
  }

  if (data.pitchingStats && data.pitchingStats.length > 0) {
    const { error: pitchingError } = await supabase
      .from("pitching_game_stats")
      .insert(
        data.pitchingStats.map((s) => ({
          game_id: game.id,
          player_id: s.player_id,
          innings_pitched_outs: s.innings_pitched_outs ?? 0,
          hits_allowed: s.hits_allowed ?? 0,
          runs_allowed: s.runs_allowed ?? 0,
          earned_runs: s.earned_runs ?? 0,
          walks: s.walks ?? 0,
          strikeouts: s.strikeouts ?? 0,
          home_runs_allowed: s.home_runs_allowed ?? 0,
          win_flag: s.win_flag ?? false,
          loss_flag: s.loss_flag ?? false,
          save_flag: s.save_flag ?? false,
          hold_flag: s.hold_flag ?? false,
        }))
      )
    if (pitchingError) throw new Error(pitchingError.message)
  }

  return { game_id: game.id }
}

export const updateFullGame = async (gameId: number, data: FullGamePayload) => {
  const { error: gameError } = await supabase
    .from("games")
    .update({
      game_date: data.game.game_date,
      opponent_name: data.game.opponent_name,
      season_year: data.game.season_year,
      match_number: data.game.match_number,
      location: data.game.location ?? null,
    })
    .eq("id", gameId)
  if (gameError) throw new Error(gameError.message)

  const { error: deleteError } = await supabase
    .from("batting_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (deleteError) throw new Error(deleteError.message)

  const { error: deletePitchingError } = await supabase
    .from("pitching_game_stats")
    .delete()
    .eq("game_id", gameId)
  if (deletePitchingError) throw new Error(deletePitchingError.message)

  if (data.battingStats.length > 0) {
    const { error: battingError } = await supabase
      .from("batting_game_stats")
      .insert(
        data.battingStats.map((s) => ({
          game_id: gameId,
          player_id: s.player_id,
          batting_order: s.batting_order,
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
        }))
      )
    if (battingError) throw new Error(battingError.message)
  }

  if (data.pitchingStats && data.pitchingStats.length > 0) {
    const { error: pitchingError } = await supabase
      .from("pitching_game_stats")
      .insert(
        data.pitchingStats.map((s) => ({
          game_id: gameId,
          player_id: s.player_id,
          innings_pitched_outs: s.innings_pitched_outs ?? 0,
          hits_allowed: s.hits_allowed ?? 0,
          runs_allowed: s.runs_allowed ?? 0,
          earned_runs: s.earned_runs ?? 0,
          walks: s.walks ?? 0,
          strikeouts: s.strikeouts ?? 0,
          home_runs_allowed: s.home_runs_allowed ?? 0,
          win_flag: s.win_flag ?? false,
          loss_flag: s.loss_flag ?? false,
          save_flag: s.save_flag ?? false,
          hold_flag: s.hold_flag ?? false,
        }))
      )
    if (pitchingError) throw new Error(pitchingError.message)
  }
}

export const deleteGame = async (gameId: number) => {
  await supabase.from("batting_game_stats").delete().eq("game_id", gameId)
  await supabase.from("pitching_game_stats").delete().eq("game_id", gameId)

  const { error } = await supabase.from("games").delete().eq("id", gameId)
  if (error) throw new Error(error.message)
}
