import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import { withAvatarCacheBust } from "../utils/avatar"
import { getLeagueConfig } from "../config/leagueConfig"
import {
  fetchPlayers,
  fetchPlayersByTeam,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry, Team } from "../types"
import { calcBattingMetrics, calcPitchingMetrics, fmtDecimal, fmtIp, fmtRate } from "../utils/metrics"
import ManagerBattingSection, { sortLineup } from "../components/ManagerBattingSection"
import ManagerPitchingSection from "../components/ManagerPitchingSection"

type ManagerMode = "batting" | "pitching"
type LineupStyle = "balanced" | "obp" | "power" | "contact"


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
    positions: (row.position ?? "UTIL").split(",").map((s) => s.trim()) as Player["positions"],
    jerseyNumber: row.jersey_number,
    seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
    pitchingRole: (row as { pitching_role?: "starter" | "reliever" | "closer" | null }).pitching_role ?? null,
  }
}

function getPositionGroup(position: string) {
  if (position === "P") return "Pitchers"
  if (position === "C") return "Catchers"
  if (position === "LF" || position === "CF" || position === "RF") return "Outfielders"
  if (position === "UTIL" || position === "DH") return "Utility"
  return "Infielders"
}

function fmtStealPct(sb: number, cs: number) {
  const attempts = sb + cs
  return attempts > 0 ? fmtRate(sb / attempts) : "--"
}

export default function TeamManagerPage() {
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [entriesByPlayer, setEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<Record<string, SavedPitchingGameEntry[]>>({})
  const [managerMode, setManagerMode] = useState<ManagerMode>("batting")
  const [lineupStyle, setLineupStyle] = useState<LineupStyle>("balanced")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [debugMessage, setDebugMessage] = useState("")
  const leagueConfig = useMemo(() => getLeagueConfig(team?.league), [team?.league])

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")
        setDebugMessage("")

        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.trim().toLowerCase()

        if (!email) { navigate("/login", { replace: true }); return }
        if (!data.user) return

        setDebugMessage(`Signed in as ${email}`)

        const { data: profile } = await supabase
          .from("profiles").select("avatar_url").eq("id", data.user.id).maybeSingle()
        setAvatarUrl(profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : "")

        if (email === "admin@jojistats.com") { navigate("/admin", { replace: true }); return }

        const access = await fetchUserAccessByEmail(email)
        if (!access) { setErrorMessage("No User Access has been assigned."); return }
        if (access.role !== "manager" && access.role !== "recorder") {
          setErrorMessage(`This account has ${access.role} access, not Team Manager access.`)
          return
        }
        setDebugMessage(`Access found: ${access.role}, team ${access.team_id}`)

        const teamRow = await fetchTeamById(Number(access.team_id))
        const nextTeam: Team = {
          id: String(teamRow.id), name: teamRow.name,
          isArchived: Boolean(teamRow.is_archived),
          currentSeasonYear: teamRow.current_season_year,
          league: teamRow.league ?? null,
        }
        setDebugMessage(`Team loaded: ${nextTeam.name}`)

        let playerRows = await fetchPlayers(Number(nextTeam.id), nextTeam.currentSeasonYear)
        if (playerRows.length === 0) playerRows = await fetchPlayersByTeam(Number(nextTeam.id))
        setDebugMessage(`Players loaded: ${playerRows.length}`)

        setTeam(nextTeam)
        setPlayers(
          playerRows.map(mapPlayer).filter((p) => !p.isArchived).sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
        )
        try {
          const [battingEntries, pitchingEntries] = await Promise.all([
            fetchSavedEntriesByPlayer(Number(nextTeam.id), nextTeam.currentSeasonYear),
            fetchPitchingEntriesByPlayer(Number(nextTeam.id), nextTeam.currentSeasonYear),
          ])
          setEntriesByPlayer(battingEntries)
          setPitchingEntriesByPlayer(pitchingEntries)
        } catch (statsError) {
          console.error(statsError)
          setDebugMessage(statsError instanceof Error ? `Players loaded, stats unavailable: ${statsError.message}` : "Players loaded, stats unavailable.")
          setEntriesByPlayer({})
          setPitchingEntriesByPlayer({})
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(error instanceof Error ? `Failed to load manager page: ${error.message}` : "Failed to load manager page.")
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [navigate])

  const teamTotals = useMemo(() => calcBattingMetrics(Object.values(entriesByPlayer).flat()), [entriesByPlayer])
  const teamPitchingTotals = useMemo(() => calcPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()), [pitchingEntriesByPlayer])

  const playerSummaries = useMemo(
    () => players.map((p) => ({ player: p, metrics: calcBattingMetrics(entriesByPlayer[p.id] ?? []) })),
    [entriesByPlayer, players]
  )
  const pitcherSummaries = useMemo(
    () => players.map((p) => ({ player: p, metrics: calcPitchingMetrics(pitchingEntriesByPlayer[p.id] ?? []) })),
    [pitchingEntriesByPlayer, players]
  )

  const leaders = useMemo(() => {
    const eligible = playerSummaries.filter((s) => s.metrics.pa >= leagueConfig.manager.minimumRatePa)
    return {
      byAvg: [...eligible].sort((a, b) => b.metrics.avg - a.metrics.avg)[0],
      byHr: [...playerSummaries].sort((a, b) => b.metrics.hr - a.metrics.hr)[0],
      byRbi: [...playerSummaries].sort((a, b) => b.metrics.rbi - a.metrics.rbi)[0],
      bySb: [...playerSummaries].sort((a, b) => b.metrics.sb - a.metrics.sb)[0],
      byHits: [...playerSummaries].sort((a, b) => b.metrics.h - a.metrics.h)[0],
    }
  }, [leagueConfig, playerSummaries])

  const pitchingLeaders = useMemo(() => {
    const eligible = pitcherSummaries.filter((s) => s.metrics.outs > 0)
    return {
      byEra: [...eligible].sort((a, b) => a.metrics.era - b.metrics.era)[0],
      byWhip: [...eligible].sort((a, b) => a.metrics.whip - b.metrics.whip)[0],
      bySo: [...pitcherSummaries].sort((a, b) => b.metrics.so - a.metrics.so)[0],
      byIp: [...pitcherSummaries].sort((a, b) => b.metrics.outs - a.metrics.outs)[0],
    }
  }, [pitcherSummaries])

  const pitchingUsage = useMemo(
    () => [...pitcherSummaries].filter((s) => s.metrics.outs > 0 || s.player.positions.includes("P")).sort((a, b) => b.metrics.outs - a.metrics.outs || b.metrics.so - a.metrics.so).slice(0, 6),
    [pitcherSummaries]
  )
  const strikeoutLeaders = useMemo(
    () => [...pitcherSummaries].filter((s) => s.metrics.so > 0).sort((a, b) => b.metrics.so - a.metrics.so).slice(0, 5),
    [pitcherSummaries]
  )
  const pitchingRosterOverview = useMemo(
    () => pitcherSummaries.filter((s) => s.player.positions.includes("P")).sort((a, b) => b.metrics.outs - a.metrics.outs || b.metrics.so - a.metrics.so || (a.player.jerseyNumber ?? 999) - (b.player.jerseyNumber ?? 999)),
    [pitcherSummaries]
  )
  const hotPlayers = useMemo(
    () => [...playerSummaries].filter((s) => s.metrics.pa >= leagueConfig.manager.minimumRatePa).sort((a, b) => b.metrics.ops - a.metrics.ops || b.metrics.pa - a.metrics.pa).slice(0, 3),
    [leagueConfig, playerSummaries]
  )
  const coldPlayers = useMemo(
    () => [...playerSummaries].filter((s) => s.metrics.pa >= leagueConfig.manager.minimumRatePa).sort((a, b) => a.metrics.ops - b.metrics.ops || b.metrics.pa - a.metrics.pa).slice(0, 3),
    [leagueConfig, playerSummaries]
  )
  const suggestedLineup = useMemo(
    () => sortLineup(playerSummaries, lineupStyle, leagueConfig),
    [leagueConfig, lineupStyle, playerSummaries]
  )
  const positionBalance = useMemo(() => {
    const counts: Record<string, number> = { Pitchers: 0, Catchers: 0, Infielders: 0, Outfielders: 0, Utility: 0 }
    players.forEach((p) => { counts[getPositionGroup(p.positions[0])] += 1 })
    return counts
  }, [players])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/stats" className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11" />
            <span className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-3xl">JojiStats</span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/stats" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-50">Stats</Link>
            <Link to="/record-game" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-50">Record Game</Link>
            <button type="button" onClick={handleLogout} className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800">Logout</button>
            <button type="button" onClick={() => navigate("/profile")} className="h-10 w-10 overflow-hidden rounded-full border border-gray-200" aria-label="Open profile">
              <img src={avatarUrl || "/logo.png"} alt="avatar" className="h-full w-full object-cover" />
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
          <div className="rounded-2xl bg-white p-6 text-sm shadow-sm">
            <p className="text-red-700">{errorMessage}</p>
            {debugMessage && <p className="mt-3 text-sm text-gray-500">{debugMessage}</p>}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-green-700">{team?.name}</p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-green-950 sm:text-3xl">Team Manager</h1>
                  <p className="mt-1 text-sm text-gray-400">{team?.currentSeasonYear} Season · {players.length} players</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {(["batting", "pitching"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setManagerMode(m)}
                      className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                        managerMode === m ? "bg-green-900 text-white shadow-sm" : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                      }`}
                    >
                      {m === "batting" ? "Batting" : "Pitching"}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {managerMode === "batting" ? (
                <>
                  {[
                    { label: "Games", value: String(teamTotals.games), sub: "played", accent: true },
                    { label: "AVG", value: fmtRate(teamTotals.avg), sub: "team batting" },
                    { label: "OBP", value: fmtRate(teamTotals.obp), sub: "on-base" },
                    { label: "OPS", value: fmtRate(teamTotals.ops), sub: "production" },
                    { label: "HR", value: String(teamTotals.hr), sub: "home runs" },
                    { label: "RBI", value: String(teamTotals.rbi), sub: "runs batted in" },
                    { label: "SB", value: String(teamTotals.sb), sub: "stolen bases" },
                    { label: "SB%", value: fmtStealPct(teamTotals.sb, teamTotals.cs), sub: "steal rate" },
                  ].map(({ label, value, sub, accent }) => (
                    <ManagerSummaryCard key={label} label={label} value={value} sub={sub} accent={accent} />
                  ))}
                </>
              ) : (
                <>
                  {[
                    { label: "APP", value: String(teamPitchingTotals.games), sub: "appearances", accent: true },
                    { label: "ERA", value: fmtDecimal(teamPitchingTotals.era), sub: "earned runs" },
                    { label: "WHIP", value: fmtDecimal(teamPitchingTotals.whip), sub: "traffic" },
                    { label: "IP", value: fmtIp(teamPitchingTotals.outs), sub: "innings" },
                    { label: "SO", value: String(teamPitchingTotals.so), sub: "strikeouts" },
                    { label: "BB", value: String(teamPitchingTotals.bb), sub: "walks" },
                  ].map(({ label, value, sub, accent }) => (
                    <ManagerSummaryCard key={label} label={label} value={value} sub={sub} accent={accent} />
                  ))}
                </>
              )}
            </section>

            <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Current View</p>
                  <h2 className="mt-1 text-base font-bold text-gray-900">
                    {managerMode === "batting" ? "Batting Dashboard" : "Pitching Dashboard"}
                  </h2>
                </div>
                <p className="text-sm text-gray-400">Review leaders, roster balance, and suggested decisions for the selected team.</p>
              </div>
            </section>

            {managerMode === "batting" ? (
              <ManagerBattingSection
                players={players}
                playerSummaries={playerSummaries}
                leaders={leaders}
                hotPlayers={hotPlayers}
                coldPlayers={coldPlayers}
                positionBalance={positionBalance}
                suggestedLineup={suggestedLineup}
                teamTotals={teamTotals}
                leagueConfig={leagueConfig}
                lineupStyle={lineupStyle}
                setLineupStyle={setLineupStyle}
                entriesByPlayer={entriesByPlayer}
              />
            ) : (
              <ManagerPitchingSection
                pitchingLeaders={pitchingLeaders}
                pitchingUsage={pitchingUsage}
                strikeoutLeaders={strikeoutLeaders}
                pitchingRosterOverview={pitchingRosterOverview}
                teamPitchingTotals={teamPitchingTotals}
                positionBalance={positionBalance}
              />
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function ManagerSummaryCard({ label, value, sub, accent = false }: { label: string; value: string; sub?: string; accent?: boolean }) {
  return (
    <div className={`rounded-2xl p-4 shadow-sm sm:p-5 ${accent ? "bg-green-800 text-white" : "border border-gray-100 bg-white"}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${accent ? "text-green-300" : "text-gray-400"}`}>{label}</p>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${accent ? "text-white" : "text-green-950"}`}>{value}</p>
      {sub && <p className={`mt-1 text-xs ${accent ? "text-green-400" : "text-gray-400"}`}>{sub}</p>}
    </div>
  )
}
