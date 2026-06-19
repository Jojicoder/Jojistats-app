import { supabase } from "./supabase-client"
import type { UserAccess } from "../types"

export type UserAccessRow = {
  id: number
  email: string
  team_id: number
  player_id: number
  role: "player" | "recorder" | "manager" | "admin" | null
  is_active: boolean | number | null
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

export const updateUserAccessStatus = async (accessId: string, isActive: boolean) => {
  const { error } = await supabase
    .from("user_access")
    .update({ is_active: isActive })
    .eq("id", Number(accessId))

  if (error) throw new Error(error.message)
}

export function mapUserAccessRow(row: UserAccessRow): UserAccess {
  const role =
    row.role === "admin" || row.role === "manager" || row.role === "recorder" || row.role === "player"
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
