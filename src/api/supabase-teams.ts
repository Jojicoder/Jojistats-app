import { supabase } from "./supabase-client"
import type { LeagueKey } from "../types"

export type TeamRow = {
  id: number
  name: string
  is_archived: boolean | number | null
  current_season_year: number
  league: LeagueKey | null
}

export type PlayerRow = {
  id: number
  team_id: number
  name: string
  position: string
  jersey_number: number | null
  season_year: number
  is_archived: boolean | number | null
  pitching_role: "starter" | "reliever" | "closer" | null
}

export const fetchTeams = async () => {
  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("id", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as TeamRow[]
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
