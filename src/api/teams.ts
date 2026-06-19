import { supabase } from "./supabase-client"

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
