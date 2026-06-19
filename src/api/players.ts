import { supabase } from "./supabase-client"

export const createPlayer = async (payload: {
  team_id: number
  name: string
  jersey_number?: number | null
  position?: string | null
  season_year: number
  is_archived?: number
  pitching_role?: "starter" | "reliever" | "closer" | null
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
      pitching_role: payload.pitching_role ?? null,
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
    pitching_role?: "starter" | "reliever" | "closer" | null
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
      pitching_role: payload.pitching_role ?? null,
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
