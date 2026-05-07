import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import {
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import type { PlayerRow } from "../api/supabase-api"
import type { SavedBattingGameEntry } from "../types"

function formatRate(v: number) {
  return v.toFixed(3).replace(/^0/, "")
}

type RosterRow = {
  player: PlayerRow
  games: number
  ab: number
  h: number
  avg: number
  hr: number
  rbi: number
  bb: number
  so: number
}

function buildRoster(
  players: PlayerRow[],
  entriesByPlayer: Record<string, SavedBattingGameEntry[]>
): RosterRow[] {
  return players.map((player) => {
    const entries = entriesByPlayer[String(player.id)] ?? []
    const gameIds = new Set(entries.map((e) => e.gameId))
    const ab = entries.reduce((s, e) => s + e.statLine.AB, 0)
    const h = entries.reduce((s, e) => s + e.statLine.H, 0)
    const hr = entries.reduce((s, e) => s + e.statLine.HR, 0)
    const rbi = entries.reduce((s, e) => s + e.statLine.RBI, 0)
    const bb = entries.reduce((s, e) => s + e.statLine.BB, 0)
    const so = entries.reduce((s, e) => s + e.statLine.SO, 0)
    return {
      player,
      games: gameIds.size,
      ab,
      h,
      avg: ab > 0 ? h / ab : 0,
      hr,
      rbi,
      bb,
      so,
    }
  })
}

export default function SeasonArchivePage() {
  const navigate = useNavigate()
  const [teamId, setTeamId] = useState<number | null>(null)
  const [teamName, setTeamName] = useState("")
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [entriesByPlayer, setEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSeasonLoading, setIsSeasonLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.trim().toLowerCase()
        if (!data.user || !email) {
          navigate("/login", { replace: true })
          return
        }

        const access = await fetchUserAccessByEmail(email)
        if (!access) {
          setErrorMessage("No team access assigned.")
          return
        }

        const teamRow = await fetchTeamById(Number(access.team_id))
        setTeamId(teamRow.id)
        setTeamName(teamRow.name)

        const { data: gamesData } = await supabase
          .from("games")
          .select("season_year")
          .eq("team_id", teamRow.id)

        const years = [
          ...new Set(
            (gamesData ?? []).map((r) => r.season_year as number)
          ),
        ].sort((a, b) => b - a)

        setAvailableSeasons(years)
        if (years.length > 0) setSelectedSeason(years[0])
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Failed to load."
        )
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [navigate])

  useEffect(() => {
    if (teamId == null || selectedSeason == null) return

    const load = async () => {
      try {
        setIsSeasonLoading(true)
        const [playerRows, entries] = await Promise.all([
          fetchPlayers(teamId, selectedSeason),
          fetchSavedEntriesByPlayer(teamId, selectedSeason),
        ])
        setPlayers(playerRows)
        setEntriesByPlayer(entries)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSeasonLoading(false)
      }
    }
    load()
  }, [teamId, selectedSeason])

  const allEntries = useMemo(
    () => Object.values(entriesByPlayer).flat(),
    [entriesByPlayer]
  )

  const teamStats = useMemo(() => {
    const gameIds = new Set(allEntries.map((e) => e.gameId))
    const ab = allEntries.reduce((s, e) => s + e.statLine.AB, 0)
    const h = allEntries.reduce((s, e) => s + e.statLine.H, 0)
    const hr = allEntries.reduce((s, e) => s + e.statLine.HR, 0)
    const rbi = allEntries.reduce((s, e) => s + e.statLine.RBI, 0)
    return {
      games: gameIds.size,
      avg: ab > 0 ? h / ab : 0,
      hr,
      rbi,
    }
  }, [allEntries])

  const roster = useMemo(
    () => buildRoster(players, entriesByPlayer),
    [players, entriesByPlayer]
  )

  const leaders = useMemo(() => {
    if (roster.length === 0) return null
    const qualified = roster.filter((r) => r.ab >= 5)
    const avgLeader =
      qualified.length > 0
        ? qualified.reduce((a, b) => (b.avg > a.avg ? b : a))
        : null
    const hrLeader = roster.reduce((a, b) => (b.hr > a.hr ? b : a))
    const rbiLeader = roster.reduce((a, b) => (b.rbi > a.rbi ? b : a))
    const hLeader = roster.reduce((a, b) => (b.h > a.h ? b : a))
    return { avgLeader, hrLeader, rbiLeader, hLeader }
  }, [roster])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

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
        ) : (
          <div className="space-y-6">
            {/* Title + Season Selector */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-green-900">
                  {teamName}
                </p>
                <h1 className="mt-1 text-2xl font-bold text-gray-900">
                  Season Archive
                </h1>
              </div>

              {availableSeasons.length > 0 ? (
                <select
                  value={selectedSeason ?? ""}
                  onChange={(e) => setSelectedSeason(Number(e.target.value))}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-sm sm:w-48"
                >
                  {availableSeasons.map((year) => (
                    <option key={year} value={year}>
                      {year} Season
                    </option>
                  ))}
                </select>
              ) : (
                <p className="text-sm text-gray-500">No seasons recorded yet.</p>
              )}
            </div>

            {selectedSeason != null && (
              <>
                {isSeasonLoading ? (
                  <div className="text-sm text-gray-500">Loading season data...</div>
                ) : (
                  <>
                    {/* Summary Cards */}
                    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                      <SummaryCard label="Games" value={String(teamStats.games)} />
                      <SummaryCard
                        label="Team AVG"
                        value={formatRate(teamStats.avg)}
                      />
                      <SummaryCard label="Team HR" value={String(teamStats.hr)} />
                      <SummaryCard label="Team RBI" value={String(teamStats.rbi)} />
                    </section>

                    {/* Season Leaders */}
                    {leaders && (
                      <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                        <h2 className="text-lg font-semibold text-gray-900">
                          Season Leaders
                        </h2>
                        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                          <LeaderCard
                            stat="AVG"
                            name={
                              leaders.avgLeader
                                ? leaders.avgLeader.player.name
                                : "—"
                            }
                            value={
                              leaders.avgLeader
                                ? formatRate(leaders.avgLeader.avg)
                                : "—"
                            }
                          />
                          <LeaderCard
                            stat="HR"
                            name={leaders.hrLeader.player.name}
                            value={String(leaders.hrLeader.hr)}
                          />
                          <LeaderCard
                            stat="RBI"
                            name={leaders.rbiLeader.player.name}
                            value={String(leaders.rbiLeader.rbi)}
                          />
                          <LeaderCard
                            stat="H"
                            name={leaders.hLeader.player.name}
                            value={String(leaders.hLeader.h)}
                          />
                        </div>
                      </section>
                    )}

                    {/* Archived Roster */}
                    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                      <h2 className="text-lg font-semibold text-gray-900">
                        Archived Roster
                      </h2>
                      {roster.length === 0 ? (
                        <p className="mt-4 text-sm text-gray-500">
                          No players recorded for this season.
                        </p>
                      ) : (
                        <div className="mt-4 overflow-x-auto">
                          <table className="min-w-full text-left text-sm">
                            <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                              <tr>
                                <th className="py-2 pr-4">Player</th>
                                <th className="py-2 pr-4">Pos</th>
                                <th className="py-2 pr-4">G</th>
                                <th className="py-2 pr-4">AB</th>
                                <th className="py-2 pr-4">H</th>
                                <th className="py-2 pr-4">AVG</th>
                                <th className="py-2 pr-4">HR</th>
                                <th className="py-2 pr-4">RBI</th>
                                <th className="py-2 pr-4">BB</th>
                                <th className="py-2 pr-4">SO</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {roster.map((row) => (
                                <tr key={row.player.id}>
                                  <td className="py-3 pr-4 font-medium text-gray-900">
                                    {row.player.jersey_number != null
                                      ? `#${row.player.jersey_number} `
                                      : ""}
                                    {row.player.name}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.player.position}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.games}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.ab}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.h}
                                  </td>
                                  <td className="py-3 pr-4 font-semibold text-gray-900">
                                    {formatRate(row.avg)}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.hr}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.rbi}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.bb}
                                  </td>
                                  <td className="py-3 pr-4 text-gray-600">
                                    {row.so}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </section>
                  </>
                )}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function LeaderCard({
  stat,
  name,
  value,
}: {
  stat: string
  name: string
  value: string
}) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-green-900">
        {stat}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-gray-900">
        {name}
      </p>
      <p className="text-lg font-bold text-gray-900">{value}</p>
    </div>
  )
}
