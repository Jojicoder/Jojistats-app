import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import {
  fetchGamesBySeason,
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchTeams,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import type { GameRow, PlayerRow, TeamRow } from "../api/supabase-api"
import type { SavedBattingGameEntry } from "../types"

function formatRate(v: number) {
  return v.toFixed(3).replace(/^0/, "")
}

function formatDate(iso: string) {
  const [y, m, d] = iso.split("-")
  return `${m}/${d}/${y}`
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
  return players
    .map((player) => {
      const entries = entriesByPlayer[String(player.id)] ?? []
      const gameIds = new Set(entries.map((e) => e.gameId))
      const ab = entries.reduce((s, e) => s + e.statLine.AB, 0)
      const h = entries.reduce((s, e) => s + e.statLine.H, 0)
      const hr = entries.reduce((s, e) => s + e.statLine.HR, 0)
      const rbi = entries.reduce((s, e) => s + e.statLine.RBI, 0)
      const bb = entries.reduce((s, e) => s + e.statLine.BB, 0)
      const so = entries.reduce((s, e) => s + e.statLine.SO, 0)
      return { player, games: gameIds.size, ab, h, avg: ab > 0 ? h / ab : 0, hr, rbi, bb, so }
    })
    .sort((a, b) => b.avg - a.avg)
}

export default function SeasonArchivePage() {
  const navigate = useNavigate()
  const [isAdmin, setIsAdmin] = useState(false)
  const [allTeams, setAllTeams] = useState<TeamRow[]>([])
  const [teamId, setTeamId] = useState<number | null>(null)
  const [teamName, setTeamName] = useState("")
  const [availableSeasons, setAvailableSeasons] = useState<number[]>([])
  const [selectedSeason, setSelectedSeason] = useState<number | null>(null)
  const [players, setPlayers] = useState<PlayerRow[]>([])
  const [games, setGames] = useState<GameRow[]>([])
  const [entriesByPlayer, setEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSeasonLoading, setIsSeasonLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")

  const loadSeasonsForTeam = async (id: number) => {
    const { data: gamesData } = await supabase
      .from("games").select("season_year").eq("team_id", id)
    const years = [...new Set((gamesData ?? []).map((r) => r.season_year as number))].sort((a, b) => b - a)
    setAvailableSeasons(years)
    setSelectedSeason(years[0] ?? null)
  }

  const handleSelectTeam = async (id: number, name: string) => {
    setTeamId(id)
    setTeamName(name)
    setSelectedSeason(null)
    setAvailableSeasons([])
    setGames([])
    setPlayers([])
    setEntriesByPlayer({})
    await loadSeasonsForTeam(id)
  }

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.trim().toLowerCase()
        if (!data.user || !email) { navigate("/login", { replace: true }); return }

        if (email === "admin@jojistats.com") {
          setIsAdmin(true)
          const teams = await fetchTeams()
          setAllTeams(teams)
          const first = teams[0]
          if (!first) return
          setTeamId(first.id)
          setTeamName(first.name)
          await loadSeasonsForTeam(first.id)
          return
        }

        const access = await fetchUserAccessByEmail(email)
        if (!access) { setErrorMessage("No team access assigned."); return }

        const teamRow = await fetchTeamById(Number(access.team_id))
        setTeamId(teamRow.id)
        setTeamName(teamRow.name)
        await loadSeasonsForTeam(teamRow.id)
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Failed to load.")
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
        const [playerRows, entries, gameRows] = await Promise.all([
          fetchPlayers(teamId, selectedSeason),
          fetchSavedEntriesByPlayer(teamId, selectedSeason),
          fetchGamesBySeason(teamId, selectedSeason),
        ])
        setPlayers(playerRows)
        setEntriesByPlayer(entries)
        setGames(gameRows)
      } catch (err) {
        console.error(err)
      } finally {
        setIsSeasonLoading(false)
      }
    }
    load()
  }, [teamId, selectedSeason])

  const allEntries = useMemo(() => Object.values(entriesByPlayer).flat(), [entriesByPlayer])

  const record = useMemo(() => ({
    w: games.filter((g) => g.result === "W").length,
    l: games.filter((g) => g.result === "L").length,
    t: games.filter((g) => g.result === "T").length,
  }), [games])

  const teamStats = useMemo(() => {
    const ab = allEntries.reduce((s, e) => s + e.statLine.AB, 0)
    const h = allEntries.reduce((s, e) => s + e.statLine.H, 0)
    const hr = allEntries.reduce((s, e) => s + e.statLine.HR, 0)
    const rbi = allEntries.reduce((s, e) => s + e.statLine.RBI, 0)
    return { avg: ab > 0 ? h / ab : 0, hr, rbi }
  }, [allEntries])

  const roster = useMemo(() => buildRoster(players, entriesByPlayer), [players, entriesByPlayer])

  const leaders = useMemo(() => {
    if (roster.length === 0) return null
    const qualified = roster.filter((r) => r.ab >= 5)
    return {
      avgLeader: qualified.length > 0 ? qualified.reduce((a, b) => (b.avg > a.avg ? b : a)) : null,
      hrLeader: roster.reduce((a, b) => (b.hr > a.hr ? b : a)),
      rbiLeader: roster.reduce((a, b) => (b.rbi > a.rbi ? b : a)),
      hLeader: roster.reduce((a, b) => (b.h > a.h ? b : a)),
    }
  }, [roster])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3]">
      {/* ── Header ── */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 backdrop-blur shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-2.5">
            <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 rounded-full object-cover sm:h-11 sm:w-11" />
            <span className="text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-3xl">
              JojiStats
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to={isAdmin ? "/admin" : "/stats"} className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-50">
              {isAdmin ? "Admin" : "Stats"}
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8">
        {isLoading ? (
          <div className="flex items-center gap-3 text-sm text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-green-900 border-t-transparent" />
            Loading...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-white p-6 text-sm text-red-600 shadow-sm">{errorMessage}</div>
        ) : (
          <div className="space-y-6">

            {/* ── Team Picker (admin only) ── */}
            {isAdmin && allTeams.length > 1 && (
              <section className="rounded-2xl bg-white p-5 shadow-sm">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Team</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {allTeams.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTeam(t.id, t.name)}
                      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                        teamId === t.id
                          ? "bg-green-900 text-white shadow-sm"
                          : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* ── Title + Season Picker ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">{teamName}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-green-950 sm:text-3xl">
                  Season Archive
                </h1>
              </div>

              {availableSeasons.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {availableSeasons.map((year) => (
                    <button
                      key={year}
                      type="button"
                      onClick={() => setSelectedSeason(year)}
                      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                        selectedSeason === year
                          ? "bg-green-900 text-white shadow-sm"
                          : "bg-white border border-gray-200 text-gray-600 hover:border-green-800 hover:text-green-900"
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400">No seasons recorded yet.</p>
              )}
            </div>

            {selectedSeason != null && (
              isSeasonLoading ? (
                <div className="flex items-center gap-3 text-sm text-gray-500">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-900 border-t-transparent" />
                  Loading {selectedSeason} season...
                </div>
              ) : (
                <>
                  {/* ── Summary Cards ── */}
                  <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <SummaryCard
                      label="Record"
                      value={`${record.w}-${record.l}`}
                      sub={record.t > 0 ? `${record.t} tie` : `${games.length} games`}
                      accent
                    />
                    <SummaryCard label="Team AVG" value={formatRate(teamStats.avg)} sub="batting" />
                    <SummaryCard label="Team HR" value={String(teamStats.hr)} sub="home runs" />
                    <SummaryCard label="Team RBI" value={String(teamStats.rbi)} sub="runs batted in" />
                  </section>

                  {/* ── Season Leaders ── */}
                  {leaders && (
                    <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                      <h2 className="text-base font-bold text-gray-900">Season Leaders</h2>
                      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <LeaderCard stat="AVG"
                          name={leaders.avgLeader?.player.name ?? "—"}
                          value={leaders.avgLeader ? formatRate(leaders.avgLeader.avg) : "—"} />
                        <LeaderCard stat="HR"  name={leaders.hrLeader.player.name}  value={String(leaders.hrLeader.hr)} />
                        <LeaderCard stat="RBI" name={leaders.rbiLeader.player.name} value={String(leaders.rbiLeader.rbi)} />
                        <LeaderCard stat="H"   name={leaders.hLeader.player.name}   value={String(leaders.hLeader.h)} />
                      </div>
                    </section>
                  )}

                  {/* ── Game Results ── */}
                  <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-base font-bold text-gray-900">Game Results</h2>
                    {games.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-400">No games recorded for this season.</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                              <th className="pb-3 pr-5">#</th>
                              <th className="pb-3 pr-5">Date</th>
                              <th className="pb-3 pr-5">Opponent</th>
                              <th className="pb-3 pr-5">Score</th>
                              <th className="pb-3 pr-5">Result</th>
                              <th className="pb-3">Location</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {games.map((game) => {
                              const result = game.result === "W" || game.result === "L" || game.result === "T" ? game.result : null
                              return (
                                <tr key={game.id} className="group">
                                  <td className="py-3 pr-5 text-xs text-gray-300">{game.match_number}</td>
                                  <td className="py-3 pr-5 text-gray-500">{formatDate(game.game_date)}</td>
                                  <td className="py-3 pr-5 font-semibold text-gray-900">{game.opponent_name}</td>
                                  <td className="py-3 pr-5 font-mono font-semibold text-gray-700">
                                    {game.team_score != null && game.opponent_score != null
                                      ? `${game.team_score}–${game.opponent_score}`
                                      : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-3 pr-5">
                                    {result ? (
                                      <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-extrabold ${
                                        result === "W" ? "bg-green-100 text-green-800" :
                                        result === "L" ? "bg-red-50 text-red-600" :
                                        "bg-gray-100 text-gray-500"
                                      }`}>
                                        {result}
                                      </span>
                                    ) : <span className="text-gray-300">—</span>}
                                  </td>
                                  <td className="py-3 text-gray-400">{game.location || "—"}</td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>

                  {/* ── Archived Roster ── */}
                  <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
                    <h2 className="text-base font-bold text-gray-900">Batting Stats</h2>
                    {roster.length === 0 ? (
                      <p className="mt-4 text-sm text-gray-400">No batting stats recorded for this season.</p>
                    ) : (
                      <div className="mt-4 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                              <th className="pb-3 pr-5">Player</th>
                              <th className="pb-3 pr-4">Pos</th>
                              <th className="pb-3 pr-4">G</th>
                              <th className="pb-3 pr-4">AB</th>
                              <th className="pb-3 pr-4">H</th>
                              <th className="pb-3 pr-4 text-green-800">AVG</th>
                              <th className="pb-3 pr-4">HR</th>
                              <th className="pb-3 pr-4">RBI</th>
                              <th className="pb-3 pr-4">BB</th>
                              <th className="pb-3">SO</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {roster.map((row) => (
                              <tr key={row.player.id} className="group">
                                <td className="py-3 pr-5 font-semibold text-gray-900">
                                  {row.player.jersey_number != null && (
                                    <span className="mr-1.5 text-xs text-gray-400">#{row.player.jersey_number}</span>
                                  )}
                                  {row.player.name}
                                </td>
                                <td className="py-3 pr-4 text-gray-500">{row.player.position}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.games}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.ab}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.h}</td>
                                <td className="py-3 pr-4 font-bold text-green-900">{formatRate(row.avg)}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.hr}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.rbi}</td>
                                <td className="py-3 pr-4 text-gray-500">{row.bb}</td>
                                <td className="py-3 text-gray-500">{row.so}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </section>
                </>
              )
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function SummaryCard({
  label, value, sub, accent = false,
}: {
  label: string; value: string; sub?: string; accent?: boolean
}) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm sm:p-5 ${accent ? "bg-green-800 text-white" : "bg-white border border-gray-100"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${accent ? "text-green-300" : "text-gray-400"}`}>
        {label}
      </p>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${accent ? "text-white" : "text-green-950"}`}>
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${accent ? "text-green-400" : "text-gray-400"}`}>{sub}</p>
      )}
    </div>
  )
}

function LeaderCard({ stat, name, value }: { stat: string; name: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7f8f3] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">{stat}</p>
      <p className="mt-2 text-xl font-extrabold text-green-950">{value}</p>
      <p className="mt-0.5 truncate text-xs font-semibold text-gray-500">{name}</p>
    </div>
  )
}
