import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import { withAvatarCacheBust, subscribeAvatarUpdated } from "../utils/avatar"
import {
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
  fetchPlayers,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry, Team } from "../types"
import { calcBattingMetrics, calcPitchingMetrics } from "../utils/metrics"
import PlayerBattingTab from "../components/PlayerBattingTab"
import PlayerPitchingTab from "../components/PlayerPitchingTab"

export type ProfileGoals = {
  avgGoal: string
  hrGoal: string
  rbiGoal: string
  eraGoal: string
  soGoal: string
  whipGoal: string
  seasonGoal: string
  avatarUrl: string
}

export type PitchingRoleKey = "starter" | "reliever" | "closer"

const defaultGoals: ProfileGoals = {
  avgGoal: ".350",
  hrGoal: "5",
  rbiGoal: "20",
  eraGoal: "3.00",
  soGoal: "50",
  whipGoal: "1.20",
  seasonGoal: "Hit .350 this season",
  avatarUrl: "",
}

type PlayerTab = "batting" | "pitching"

const pitchingRoleLabels: Record<PitchingRoleKey, string> = {
  starter: "SP",
  reliever: "RP",
  closer: "CL",
}

function resolvePitchingRole(player: Player): PitchingRoleKey | null {
  const positions = player.positions as string[]
  if (player.pitchingRole) return player.pitchingRole
  if (positions.includes("SP")) return "starter"
  if (positions.includes("CL")) return "closer"
  if (positions.some((p) => p === "RP" || p === "P")) return "reliever"
  return null
}

function mapPlayer(row: {
  id: number; team_id: number; name: string; position: string
  jersey_number: number | null; season_year: number; is_archived: boolean | number | null
}): Player {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    name: row.name,
    positions: (row.position ?? "UTIL").split(",").map((s) => s.trim()) as Player["positions"],
    jerseyNumber: row.jersey_number,
    seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
    pitchingRole: (row as { pitching_role?: "starter" | "reliever" | "closer" | null }).pitching_role ?? null,
  }
}

function sortEntries(entries: SavedBattingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const d = new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    return d !== 0 ? d : a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

function sortPitchingEntries(entries: SavedPitchingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const d = new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    return d !== 0 ? d : a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

export default function PlayerPage() {
  const navigate = useNavigate()
  const [userId, setUserId] = useState("")
  const [player, setPlayer] = useState<Player | null>(null)
  const [team, setTeam] = useState<Team | null>(null)
  const [activeTab, setActiveTab] = useState<PlayerTab>("batting")
  const [entries, setEntries] = useState<SavedBattingGameEntry[]>([])
  const [pitchingEntries, setPitchingEntries] = useState<SavedPitchingGameEntry[]>([])
  const [allTeamEntries, setAllTeamEntries] = useState<SavedBattingGameEntry[]>([])
  const [goals, setGoals] = useState<ProfileGoals>(defaultGoals)
  const [isEditingGoals, setIsEditingGoals] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingGoals, setIsSavingGoals] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")

        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.trim().toLowerCase()
        if (!data.user || !email) {
          navigate("/login", { replace: true })
          return
        }

        setUserId(data.user.id)

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, season_goal, avg_goal, hr_goal, rbi_goal, era_goal, so_goal, whip_goal")
          .eq("id", data.user.id)
          .maybeSingle()

        setGoals({
          avatarUrl: profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : "",
          seasonGoal: profile?.season_goal ?? defaultGoals.seasonGoal,
          avgGoal: profile?.avg_goal ?? defaultGoals.avgGoal,
          hrGoal: profile?.hr_goal == null ? defaultGoals.hrGoal : String(profile.hr_goal),
          rbiGoal: profile?.rbi_goal == null ? defaultGoals.rbiGoal : String(profile.rbi_goal),
          eraGoal: profile?.era_goal ?? defaultGoals.eraGoal,
          soGoal: profile?.so_goal == null ? defaultGoals.soGoal : String(profile.so_goal),
          whipGoal: profile?.whip_goal ?? defaultGoals.whipGoal,
        })

        if (email === "admin@jojistats.com") {
          navigate("/admin", { replace: true })
          return
        }

        const access = await fetchUserAccessByEmail(email)
        if (!access) {
          setErrorMessage("No Player Page access has been assigned.")
          return
        }

        const teamRow = await fetchTeamById(Number(access.team_id))
        const nextTeam: Team = {
          id: String(teamRow.id),
          name: teamRow.name,
          isArchived: Boolean(teamRow.is_archived),
          currentSeasonYear: teamRow.current_season_year,
          league: teamRow.league ?? null,
        }

        const playerRows = await fetchPlayers(Number(nextTeam.id), nextTeam.currentSeasonYear)
        const assignedPlayer = playerRows.map(mapPlayer).find((p) => p.id === String(access.player_id))

        if (!assignedPlayer) {
          setErrorMessage("Assigned player was not found.")
          return
        }

        const savedEntries = await fetchSavedEntriesByPlayer(Number(nextTeam.id))
        const savedPitchingEntries = await fetchPitchingEntriesByPlayer(Number(nextTeam.id), nextTeam.currentSeasonYear)

        setTeam(nextTeam)
        setPlayer(assignedPlayer)
        setEntries(sortEntries(savedEntries[assignedPlayer.id] ?? []))
        setAllTeamEntries(Object.values(savedEntries).flat())
        setPitchingEntries(sortPitchingEntries(savedPitchingEntries[assignedPlayer.id] ?? []))
      } catch (error) {
        console.error(error)
        setErrorMessage(error instanceof Error ? `Failed to load player page: ${error.message}` : "Failed to load player page.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [navigate])

  useEffect(() => subscribeAvatarUpdated(userId, (url) => setGoals((prev) => ({ ...prev, avatarUrl: url }))), [userId])

  useEffect(() => {
    if (!player) return
    if (resolvePitchingRole(player) != null) setActiveTab("pitching")
  }, [player])

  const metrics = useMemo(() => calcBattingMetrics(entries), [entries])
  const pitchingMetrics = useMemo(() => calcPitchingMetrics(pitchingEntries), [pitchingEntries])
  const lastFiveEntries = useMemo(() => entries.slice(-5), [entries])
  const recentMetrics = useMemo(() => calcBattingMetrics(lastFiveEntries), [lastFiveEntries])
  const lastThreePitchingEntries = useMemo(() => pitchingEntries.slice(-3), [pitchingEntries])
  const recentPitchingMetrics = useMemo(() => calcPitchingMetrics(lastThreePitchingEntries), [lastThreePitchingEntries])
  const bestGame = useMemo(
    () => [...entries].sort((a, b) => b.statLine.H - a.statLine.H || b.statLine.RBI - a.statLine.RBI || b.statLine.HR - a.statLine.HR)[0],
    [entries]
  )
  const pitchingRole = player ? resolvePitchingRole(player) : null

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  const handleSaveGoals = async () => {
    if (!userId) return
    try {
      setIsSavingGoals(true)
      const { error } = await supabase.from("profiles").upsert({
        id: userId,
        season_goal: goals.seasonGoal.trim() || null,
        avg_goal: goals.avgGoal.trim() || null,
        hr_goal: goals.hrGoal ? Number(goals.hrGoal) : null,
        rbi_goal: goals.rbiGoal ? Number(goals.rbiGoal) : null,
        era_goal: goals.eraGoal.trim() || null,
        so_goal: goals.soGoal ? Number(goals.soGoal) : null,
        whip_goal: goals.whipGoal.trim() || null,
        updated_at: new Date().toISOString(),
      })
      if (error) { window.alert(error.message); return }
      setIsEditingGoals(false)
    } finally {
      setIsSavingGoals(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img src="/logo.png" alt="JojiStats logo" className="h-12 w-12 rounded-full object-cover" />
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">Joji Stats</p>
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/stats" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50">
              Stats
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Logout
            </button>
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className="h-10 w-10 overflow-hidden rounded-full border border-gray-200"
              aria-label="Open profile"
            >
              <img src={goals.avatarUrl || "/logo.png"} alt="avatar" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-900 border-t-transparent" />
            Loading...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-white p-6 text-red-700 shadow-sm">{errorMessage}</div>
        ) : player && team ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Player Page</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
                {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}{player.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {pitchingRole ? pitchingRoleLabels[pitchingRole] : player.positions.join(", ")} · {team.name} · {team.currentSeasonYear} Season
              </p>
              <p className="mt-4 rounded-xl bg-[#f7f8f3] px-4 py-3 text-sm font-medium text-green-900">
                Goal: {goals.seasonGoal || "Not set"}
              </p>
            </section>

            <div className="flex gap-2">
              {(["batting", "pitching"] as const).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    activeTab === tab
                      ? "bg-green-900 text-white"
                      : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {tab === "batting" ? "Batting" : "Pitching"}
                </button>
              ))}
            </div>

            {activeTab === "batting" ? (
              <PlayerBattingTab
                entries={entries}
                allTeamEntries={allTeamEntries}
                team={team}
                metrics={metrics}
                recentMetrics={recentMetrics}
                bestGame={bestGame}
                goals={goals}
                isEditingGoals={isEditingGoals}
                isSavingGoals={isSavingGoals}
                setGoals={setGoals}
                onEditGoals={() => setIsEditingGoals(true)}
                onSaveGoals={handleSaveGoals}
              />
            ) : (
              <PlayerPitchingTab
                entries={pitchingEntries}
                team={team}
                metrics={pitchingMetrics}
                recentMetrics={recentPitchingMetrics}
                pitchingRole={pitchingRole}
                goals={goals}
                isEditingGoals={isEditingGoals}
                isSavingGoals={isSavingGoals}
                setGoals={setGoals}
                onEditGoals={() => setIsEditingGoals(true)}
                onSaveGoals={handleSaveGoals}
              />
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
