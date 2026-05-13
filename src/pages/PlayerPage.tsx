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
import type {
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  Team,
} from "../types"
import PerformanceTrendCard from "../components/PerformanceTrendCard"
import PitchingTrendChart from "../components/PitchingTrendChart"
import { calcBattingMetrics, calcPitchingMetrics, fmtRate, fmtDecimal, fmtIp } from "../utils/metrics"

type ProfileGoals = {
  avgGoal: string
  hrGoal: string
  rbiGoal: string
  eraGoal: string
  soGoal: string
  whipGoal: string
  seasonGoal: string
  avatarUrl: string
}

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

function mapPlayer(row: {
  id: number
  team_id: number
  name: string
  position: string
  jersey_number: number | null
  season_year: number
  is_archived: boolean | number | null
}): Player {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    name: row.name,
    position: row.position as Player["position"],
    jerseyNumber: row.jersey_number,
    seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
  }
}

function sortEntries(entries: SavedBattingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare =
      new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}


function sortPitchingEntries(entries: SavedPitchingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare =
      new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}


function formatDate(date: string) {
  const nextDate = new Date(`${date}T00:00:00`)
  return nextDate.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
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
        }

        const playerRows = await fetchPlayers(
          Number(nextTeam.id),
          nextTeam.currentSeasonYear
        )
        const assignedPlayer = playerRows
          .map(mapPlayer)
          .find((nextPlayer) => nextPlayer.id === String(access.player_id))

        if (!assignedPlayer) {
          setErrorMessage("Assigned player was not found.")
          return
        }

        const savedEntries = await fetchSavedEntriesByPlayer(
          Number(nextTeam.id)
        )
        const savedPitchingEntries = await fetchPitchingEntriesByPlayer(
          Number(nextTeam.id),
          nextTeam.currentSeasonYear
        )

        setTeam(nextTeam)
        setPlayer(assignedPlayer)
        setEntries(sortEntries(savedEntries[assignedPlayer.id] ?? []))
        setAllTeamEntries(Object.values(savedEntries).flat())
        setPitchingEntries(
          sortPitchingEntries(savedPitchingEntries[assignedPlayer.id] ?? [])
        )
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error
            ? `Failed to load player page: ${error.message}`
            : "Failed to load player page."
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate])

  useEffect(() => subscribeAvatarUpdated((url) => setGoals((prev) => ({ ...prev, avatarUrl: url }))), [])

  const metrics = useMemo(() => calcBattingMetrics(entries), [entries])
  const pitchingMetrics = useMemo(
    () => calcPitchingMetrics(pitchingEntries),
    [pitchingEntries]
  )
  const lastFiveEntries = useMemo(() => entries.slice(-5), [entries])
  const recentMetrics = useMemo(() => calcBattingMetrics(lastFiveEntries), [lastFiveEntries])
  const lastThreePitchingEntries = useMemo(
    () => pitchingEntries.slice(-3),
    [pitchingEntries]
  )
  const recentPitchingMetrics = useMemo(
    () => calcPitchingMetrics(lastThreePitchingEntries),
    [lastThreePitchingEntries]
  )
  const bestGame = useMemo(
    () =>
      [...entries].sort(
        (a, b) =>
          b.statLine.H - a.statLine.H ||
          b.statLine.RBI - a.statLine.RBI ||
          b.statLine.HR - a.statLine.HR
      )[0],
    [entries]
  )

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

      if (error) {
        window.alert(error.message)
        return
      }

      setIsEditingGoals(false)
    } finally {
      setIsSavingGoals(false)
    }
  }

  const bbPerK = metrics.so > 0 ? (metrics.bb / metrics.so).toFixed(2) : "--"

  const statCards = [
    { label: "AVG", value: fmtRate(metrics.avg) },
    { label: "OBP", value: fmtRate(metrics.obp) },
    { label: "OPS", value: fmtRate(metrics.ops) },
    { label: "BB/K", value: bbPerK },
    { label: "H", value: String(metrics.h) },
    { label: "HR", value: String(metrics.hr) },
    { label: "RBI", value: String(metrics.rbi) },
    { label: "BB", value: String(metrics.bb) },
    { label: "SO", value: String(metrics.so) },
  ]

  const pitchingStatCards = [
    { label: "ERA", value: fmtDecimal(pitchingMetrics.era) },
    { label: "WHIP", value: fmtDecimal(pitchingMetrics.whip) },
    { label: "IP", value: fmtIp(pitchingMetrics.outs) },
    { label: "SO", value: String(pitchingMetrics.so) },
    { label: "BB", value: String(pitchingMetrics.bb) },
    { label: "H", value: String(pitchingMetrics.h) },
    { label: "ER", value: String(pitchingMetrics.er) },
    { label: "HR", value: String(pitchingMetrics.hr) },
  ]

  return (
    <div className="min-h-screen bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-12 w-12 rounded-full object-cover"
            />
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to="/stats"
              className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
            >
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
              <img
                src={goals.avatarUrl || "/logo.png"}
                alt="avatar"
                className="h-full w-full object-cover"
              />
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
          <div className="rounded-2xl bg-white p-6 text-red-700 shadow-sm">
            {errorMessage}
          </div>
        ) : player && team ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                My Player Page
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
                {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                {player.name}
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                {player.position} · {team.name} · {team.currentSeasonYear} Season
              </p>
              <p className="mt-4 rounded-xl bg-[#f7f8f3] px-4 py-3 text-sm font-medium text-green-900">
                Goal: {goals.seasonGoal || "Not set"}
              </p>
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("batting")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "batting"
                    ? "bg-green-900 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Batting
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pitching")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  activeTab === "pitching"
                    ? "bg-green-900 text-white"
                    : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                Pitching
              </button>
            </div>

            {activeTab === "batting" ? (
              <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-extrabold tracking-tight text-green-950">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-base font-bold text-gray-900">Season Goals</h2>
                  <button
                    type="button"
                    onClick={() =>
                      isEditingGoals ? handleSaveGoals() : setIsEditingGoals(true)
                    }
                    disabled={isSavingGoals}
                    className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {isEditingGoals
                      ? isSavingGoals
                        ? "Saving..."
                        : "Save"
                      : "Edit"}
                  </button>
                </div>

                <div className="mt-4 space-y-3 text-sm">
                  {isEditingGoals ? (
                    <>
                      <label className="block">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                          Season Goal
                        </span>
                        <input
                          value={goals.seasonGoal}
                          onChange={(event) =>
                            setGoals((prev) => ({
                              ...prev,
                              seasonGoal: event.target.value,
                            }))
                          }
                          className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            AVG Goal
                          </span>
                          <input
                            value={goals.avgGoal}
                            onChange={(event) =>
                              setGoals((prev) => ({
                                ...prev,
                                avgGoal: event.target.value,
                              }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                            placeholder=".350"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            HR Goal
                          </span>
                          <input
                            value={goals.hrGoal}
                            onChange={(event) =>
                              setGoals((prev) => ({
                                ...prev,
                                hrGoal: event.target.value,
                              }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                            placeholder="5"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                            RBI Goal
                          </span>
                          <input
                            value={goals.rbiGoal}
                            onChange={(event) =>
                              setGoals((prev) => ({
                                ...prev,
                                rbiGoal: event.target.value,
                              }))
                            }
                            className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                            placeholder="20"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">AVG Goal</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {goals.avgGoal} → {fmtRate(metrics.avg)}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">HR Goal</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {goals.hrGoal} → {metrics.hr}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                        <span className="text-xs font-bold uppercase tracking-widest text-gray-400">RBI Goal</span>
                        <span className="text-sm font-semibold text-gray-900">
                          {goals.rbiGoal} → {metrics.rbi}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-base font-bold text-gray-900">Recent Form</h2>
                <p className="mt-4 text-sm text-gray-500">
                  Last 5 Games: AVG {fmtRate(recentMetrics.avg)} · H{" "}
                  {recentMetrics.h} · RBI {recentMetrics.rbi} · SO{" "}
                  {recentMetrics.so}
                </p>
                <div className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-gray-700">
                  {bestGame ? (
                    <>
                      <p className="font-bold text-gray-900">Personal Strength</p>
                      <p className="mt-1 text-gray-500">
                        Best game: {bestGame.statLine.H} hits vs{" "}
                        {bestGame.gameMeta.opponent}
                      </p>
                    </>
                  ) : (
                    <span className="text-gray-400">No games recorded yet.</span>
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">Hits by Game</h2>
              <div className="mt-4 flex h-48 items-end gap-2 rounded-xl bg-[#f7f8f3] px-4 pb-0 pt-4">
                {entries.length === 0 ? (
                  <p className="self-center text-sm text-gray-500">
                    No games recorded yet.
                  </p>
                ) : (
                  entries.map((entry, index) => {
                    const maxHits = Math.max(...entries.map((item) => item.statLine.H), 1)
                    const height = `${Math.max((entry.statLine.H / maxHits) * 100, 8)}%`

                    return (
                      <div
                        key={entry.id}
                        className="flex flex-1 flex-col items-center justify-end gap-2"
                      >
                        <div
                          className="w-full rounded-t bg-green-900"
                          style={{ height }}
                          title={`${entry.statLine.H} hits vs ${entry.gameMeta.opponent}`}
                        />
                        <span className="text-xs text-gray-500">G{index + 1}</span>
                      </div>
                    )
                  })
                )}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">Game Log</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-4">Date</th>
                      <th className="pb-3 pr-4">Opponent</th>
                      <th className="pb-3 pr-4">AB</th>
                      <th className="pb-3 pr-4">H</th>
                      <th className="pb-3 pr-4">HR</th>
                      <th className="pb-3 pr-4">RBI</th>
                      <th className="pb-3 pr-4">BB</th>
                      <th className="pb-3 pr-4">SO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {entries.map((entry) => (
                      <tr key={entry.id}>
                        <td className="py-3 pr-4 text-gray-600">
                          {formatDate(entry.gameMeta.date)}
                        </td>
                        <td className="py-3 pr-4 font-medium text-gray-900">
                          {entry.gameMeta.opponent}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.AB}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.H}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.HR}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.RBI}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.BB}
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {entry.statLine.SO}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {team && (
              <PerformanceTrendCard
                playerEntries={entries}
                teamEntries={allTeamEntries}
                seasonYear={team.currentSeasonYear}
              />
            )}
              </>
            ) : (
              <>
                <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  {pitchingStatCards.map((stat) => (
                    <div
                      key={stat.label}
                      className="rounded-xl bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-extrabold tracking-tight text-green-950">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-base font-bold text-gray-900">Pitching Goals</h2>
                      <button
                        type="button"
                        onClick={() =>
                          isEditingGoals
                            ? handleSaveGoals()
                            : setIsEditingGoals(true)
                        }
                        disabled={isSavingGoals}
                        className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
                      >
                        {isEditingGoals
                          ? isSavingGoals
                            ? "Saving..."
                            : "Save"
                          : "Edit"}
                      </button>
                    </div>

                    <div className="mt-4 space-y-3 text-sm">
                      {isEditingGoals ? (
                        <div className="grid grid-cols-3 gap-2">
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              ERA Goal
                            </span>
                            <input
                              value={goals.eraGoal}
                              onChange={(event) =>
                                setGoals((prev) => ({
                                  ...prev,
                                  eraGoal: event.target.value,
                                }))
                              }
                              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                              placeholder="3.00"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              SO Goal
                            </span>
                            <input
                              value={goals.soGoal}
                              onChange={(event) =>
                                setGoals((prev) => ({
                                  ...prev,
                                  soGoal: event.target.value,
                                }))
                              }
                              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                              placeholder="50"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                              WHIP Goal
                            </span>
                            <input
                              value={goals.whipGoal}
                              onChange={(event) =>
                                setGoals((prev) => ({
                                  ...prev,
                                  whipGoal: event.target.value,
                                }))
                              }
                              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                              placeholder="1.20"
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">ERA Goal</span>
                            <span className="text-sm font-semibold text-gray-900">
                              under {goals.eraGoal} → {fmtDecimal(pitchingMetrics.era)}
                            </span>
                          </p>
                          <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">SO Goal</span>
                            <span className="text-sm font-semibold text-gray-900">
                              {goals.soGoal} → {pitchingMetrics.so}
                            </span>
                          </p>
                          <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                            <span className="text-xs font-bold uppercase tracking-widest text-gray-400">WHIP Goal</span>
                            <span className="text-sm font-semibold text-gray-900">
                              under {goals.whipGoal} → {fmtDecimal(pitchingMetrics.whip)}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold text-gray-900">Recent Pitching Form</h2>
                    <p className="mt-4 text-sm text-gray-500">
                      Last 3 Appearances: ERA{" "}
                      {fmtDecimal(recentPitchingMetrics.era)} · IP{" "}
                      {fmtIp(recentPitchingMetrics.outs)} · SO {recentPitchingMetrics.so} · BB{" "}
                      {recentPitchingMetrics.bb} · WHIP{" "}
                      {fmtDecimal(recentPitchingMetrics.whip)}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">
                    Strikeouts by Appearance
                  </h2>
                  <div className="mt-4 flex h-48 items-end gap-2 rounded-xl bg-[#f7f8f3] px-4 pb-0 pt-4">
                    {pitchingEntries.length === 0 ? (
                      <p className="self-center text-sm text-gray-500">
                        No pitching records yet.
                      </p>
                    ) : (
                      pitchingEntries.map((entry, index) => {
                        const maxStrikeouts = Math.max(
                          ...pitchingEntries.map(
                            (item) => item.statLine.strikeouts
                          ),
                          1
                        )
                        const height = `${Math.max(
                          (entry.statLine.strikeouts / maxStrikeouts) * 100,
                          8
                        )}%`

                        return (
                          <div
                            key={entry.id}
                            className="flex flex-1 flex-col items-center justify-end gap-2"
                          >
                            <div
                              className="w-full rounded-t bg-green-900"
                              style={{ height }}
                              title={`${entry.statLine.strikeouts} strikeouts vs ${entry.gameMeta.opponent}`}
                            />
                            <span className="text-xs text-gray-500">
                              G{index + 1}
                            </span>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                <PitchingTrendChart entries={pitchingEntries} />

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">Pitching Game Log</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                          <th className="pb-3 pr-4">Date</th>
                          <th className="pb-3 pr-4">Opponent</th>
                          <th className="pb-3 pr-4">IP</th>
                          <th className="pb-3 pr-4">H</th>
                          <th className="pb-3 pr-4">R</th>
                          <th className="pb-3 pr-4">ER</th>
                          <th className="pb-3 pr-4">BB</th>
                          <th className="pb-3 pr-4">SO</th>
                          <th className="pb-3 pr-4">HR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pitchingEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-3 pr-4 text-gray-600">
                              {formatDate(entry.gameMeta.date)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-gray-900">
                              {entry.gameMeta.opponent}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {fmtIp(entry.statLine.inningsPitchedOuts)}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.hitsAllowed}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.runsAllowed}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.earnedRuns}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.walks}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.strikeouts}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {entry.statLine.homeRunsAllowed}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        ) : null}
      </main>
    </div>
  )
}
