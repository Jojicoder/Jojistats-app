import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
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

function getMetrics(entries: SavedBattingGameEntry[]) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.games += 1
      acc.ab += entry.statLine.AB
      acc.h += entry.statLine.H
      acc.doubles += entry.statLine.doubles
      acc.triples += entry.statLine.triples
      acc.hr += entry.statLine.HR
      acc.rbi += entry.statLine.RBI
      acc.bb += entry.statLine.BB
      acc.hbp += entry.statLine.HBP
      acc.so += entry.statLine.SO
      return acc
    },
    { games: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, hbp: 0, so: 0 }
  )

  const singles = Math.max(totals.h - totals.doubles - totals.triples - totals.hr, 0)
  const totalBases = singles + totals.doubles * 2 + totals.triples * 3 + totals.hr * 4
  const pa = totals.ab + totals.bb + totals.hbp
  const avg = totals.ab > 0 ? totals.h / totals.ab : 0
  const obp = pa > 0 ? (totals.h + totals.bb + totals.hbp) / pa : 0
  const slg = totals.ab > 0 ? totalBases / totals.ab : 0

  return {
    ...totals,
    avg,
    obp,
    ops: obp + slg,
  }
}

function sortPitchingEntries(entries: SavedPitchingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare =
      new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

function formatInnings(outs: number) {
  const innings = Math.floor(outs / 3)
  const remainder = outs % 3
  return `${innings}.${remainder}`
}

function getPitchingMetrics(entries: SavedPitchingGameEntry[]) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.games += 1
      acc.outs += entry.statLine.inningsPitchedOuts
      acc.h += entry.statLine.hitsAllowed
      acc.r += entry.statLine.runsAllowed
      acc.er += entry.statLine.earnedRuns
      acc.bb += entry.statLine.walks
      acc.so += entry.statLine.strikeouts
      acc.hr += entry.statLine.homeRunsAllowed
      return acc
    },
    { games: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
  )

  const innings = totals.outs / 3
  const era = innings > 0 ? (totals.er * 9) / innings : 0
  const whip = innings > 0 ? (totals.bb + totals.h) / innings : 0

  return {
    ...totals,
    era,
    whip,
    ip: formatInnings(totals.outs),
  }
}

function formatDecimal(value: number) {
  return value.toFixed(2)
}

function formatRate(value: number) {
  return value.toFixed(3).replace("0.", ".")
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
          avatarUrl: profile?.avatar_url ?? "",
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

  const metrics = useMemo(() => getMetrics(entries), [entries])
  const pitchingMetrics = useMemo(
    () => getPitchingMetrics(pitchingEntries),
    [pitchingEntries]
  )
  const lastFiveEntries = useMemo(() => entries.slice(-5), [entries])
  const recentMetrics = useMemo(() => getMetrics(lastFiveEntries), [lastFiveEntries])
  const lastThreePitchingEntries = useMemo(
    () => pitchingEntries.slice(-3),
    [pitchingEntries]
  )
  const recentPitchingMetrics = useMemo(
    () => getPitchingMetrics(lastThreePitchingEntries),
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

  const statCards = [
    { label: "AVG", value: formatRate(metrics.avg) },
    { label: "OBP", value: formatRate(metrics.obp) },
    { label: "OPS", value: formatRate(metrics.ops) },
    { label: "H", value: String(metrics.h) },
    { label: "HR", value: String(metrics.hr) },
    { label: "RBI", value: String(metrics.rbi) },
    { label: "BB", value: String(metrics.bb) },
    { label: "SO", value: String(metrics.so) },
  ]

  const pitchingStatCards = [
    { label: "ERA", value: formatDecimal(pitchingMetrics.era) },
    { label: "WHIP", value: formatDecimal(pitchingMetrics.whip) },
    { label: "IP", value: pitchingMetrics.ip },
    { label: "SO", value: String(pitchingMetrics.so) },
    { label: "BB", value: String(pitchingMetrics.bb) },
    { label: "H", value: String(pitchingMetrics.h) },
    { label: "ER", value: String(pitchingMetrics.er) },
    { label: "HR", value: String(pitchingMetrics.hr) },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-12 w-12 rounded-full object-cover"
            />
            <p className="text-4xl font-extrabold uppercase tracking-tight text-green-900">
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
          <div className="text-gray-600">Loading...</div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-white p-6 text-red-700 shadow-sm">
            {errorMessage}
          </div>
        ) : player && team ? (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-green-900">
                My Player Page
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                {player.name}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {player.position} · {team.name} · {team.currentSeasonYear} Season
              </p>
              <p className="mt-4 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-900">
                Goal: {goals.seasonGoal || "Not set"}
              </p>
            </section>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("batting")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  activeTab === "batting"
                    ? "bg-green-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Batting
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("pitching")}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  activeTab === "pitching"
                    ? "bg-green-900 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Pitching
              </button>
            </div>

            {activeTab === "batting" ? (
              <>
            <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {statCards.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {stat.label}
                  </p>
                  <p className="mt-2 text-2xl font-bold text-gray-900">
                    {stat.value}
                  </p>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold">Season Goals</h2>
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
                        <span className="text-xs font-medium text-gray-500">
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
                          className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                        />
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
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
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                            placeholder="Example: .350"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
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
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                            placeholder="Example: 5"
                          />
                        </label>

                        <label className="block">
                          <span className="text-xs font-medium text-gray-500">
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
                            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                            placeholder="Example: 20"
                          />
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">AVG Goal</span>
                        <span className="font-semibold">
                          {goals.avgGoal} → Current {formatRate(metrics.avg)}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">HR Goal</span>
                        <span className="font-semibold">
                          {goals.hrGoal} → Current {metrics.hr}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">RBI Goal</span>
                        <span className="font-semibold">
                          {goals.rbiGoal} → Current {metrics.rbi}
                        </span>
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-5 shadow-sm">
                <h2 className="text-lg font-semibold">Recent Form</h2>
                <p className="mt-4 text-sm text-gray-700">
                  Last 5 Games: AVG {formatRate(recentMetrics.avg)} · H{" "}
                  {recentMetrics.h} · RBI {recentMetrics.rbi} · SO{" "}
                  {recentMetrics.so}
                </p>
                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                  {bestGame ? (
                    <>
                      <p className="font-semibold">Personal Strength</p>
                      <p className="mt-1">
                        Best game: {bestGame.statLine.H} hits vs{" "}
                        {bestGame.gameMeta.opponent}
                      </p>
                    </>
                  ) : (
                    "No games recorded yet."
                  )}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold">Hits by Game</h2>
              <div className="mt-4 flex h-48 items-end gap-2 border-b border-gray-200 px-2">
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
              <h2 className="text-lg font-semibold">Game Log</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                    <tr>
                      <th className="py-2 pr-4">Date</th>
                      <th className="py-2 pr-4">Opponent</th>
                      <th className="py-2 pr-4">AB</th>
                      <th className="py-2 pr-4">H</th>
                      <th className="py-2 pr-4">HR</th>
                      <th className="py-2 pr-4">RBI</th>
                      <th className="py-2 pr-4">BB</th>
                      <th className="py-2 pr-4">SO</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
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
                      className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
                    >
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {stat.label}
                      </p>
                      <p className="mt-2 text-2xl font-bold text-gray-900">
                        {stat.value}
                      </p>
                    </div>
                  ))}
                </section>

                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-semibold">Pitching Goals</h2>
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
                            <span className="text-xs font-medium text-gray-500">
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
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                              placeholder="Example: 3.00"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-gray-500">
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
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                              placeholder="Example: 50"
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs font-medium text-gray-500">
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
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2"
                              placeholder="Example: 1.20"
                            />
                          </label>
                        </div>
                      ) : (
                        <>
                          <p className="flex justify-between gap-3">
                            <span className="text-gray-500">ERA Goal</span>
                            <span className="font-semibold">
                              under {goals.eraGoal} → Current{" "}
                              {formatDecimal(pitchingMetrics.era)}
                            </span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-gray-500">SO Goal</span>
                            <span className="font-semibold">
                              {goals.soGoal} → Current {pitchingMetrics.so}
                            </span>
                          </p>
                          <p className="flex justify-between gap-3">
                            <span className="text-gray-500">WHIP Goal</span>
                            <span className="font-semibold">
                              under {goals.whipGoal} → Current{" "}
                              {formatDecimal(pitchingMetrics.whip)}
                            </span>
                          </p>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-lg font-semibold">Recent Pitching Form</h2>
                    <p className="mt-4 text-sm text-gray-700">
                      Last 3 Appearances: ERA{" "}
                      {formatDecimal(recentPitchingMetrics.era)} · IP{" "}
                      {recentPitchingMetrics.ip} · SO {recentPitchingMetrics.so} · BB{" "}
                      {recentPitchingMetrics.bb} · WHIP{" "}
                      {formatDecimal(recentPitchingMetrics.whip)}
                    </p>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-lg font-semibold">
                    Strikeouts by Appearance
                  </h2>
                  <div className="mt-4 flex h-48 items-end gap-2 border-b border-gray-200 px-2">
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
                  <h2 className="text-lg font-semibold">Pitching Game Log</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 pr-4">Date</th>
                          <th className="py-2 pr-4">Opponent</th>
                          <th className="py-2 pr-4">IP</th>
                          <th className="py-2 pr-4">H</th>
                          <th className="py-2 pr-4">R</th>
                          <th className="py-2 pr-4">ER</th>
                          <th className="py-2 pr-4">BB</th>
                          <th className="py-2 pr-4">SO</th>
                          <th className="py-2 pr-4">HR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pitchingEntries.map((entry) => (
                          <tr key={entry.id}>
                            <td className="py-3 pr-4 text-gray-600">
                              {formatDate(entry.gameMeta.date)}
                            </td>
                            <td className="py-3 pr-4 font-medium text-gray-900">
                              {entry.gameMeta.opponent}
                            </td>
                            <td className="py-3 pr-4 text-gray-600">
                              {formatInnings(entry.statLine.inningsPitchedOuts)}
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
