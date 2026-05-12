import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import {
  fetchPlayers,
  fetchPlayersByTeam,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry, Team } from "../types"
import { calcBattingMetrics, calcPitchingMetrics, fmtRate, fmtDecimal, fmtIp } from "../utils/metrics"

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
    position: row.position as Player["position"],
    jerseyNumber: row.jersey_number,
    seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
  }
}


function getPlayerLabel(player: Player) {
  return player.jerseyNumber != null
    ? `#${player.jerseyNumber} ${player.name}`
    : player.name
}

function getPositionGroup(position: Player["position"]) {
  if (position === "P") return "Pitchers"
  if (position === "C") return "Catchers"
  if (position === "LF" || position === "CF" || position === "RF") return "Outfielders"
  if (position === "UTIL" || position === "DH") return "Utility"
  return "Infielders"
}

function sortLineup(
  summaries: Array<{ player: Player; metrics: ReturnType<typeof calcBattingMetrics> }>,
  style: LineupStyle
) {
  const active = summaries.filter((summary) => summary.metrics.ab > 0)
  const source = active.length > 0 ? active : summaries

  return [...source]
    .sort((a, b) => {
      if (style === "obp") {
        return (
          b.metrics.obp - a.metrics.obp ||
          b.metrics.avg - a.metrics.avg ||
          b.metrics.ops - a.metrics.ops
        )
      }

      if (style === "power") {
        return (
          b.metrics.ops - a.metrics.ops ||
          b.metrics.hr - a.metrics.hr ||
          b.metrics.rbi - a.metrics.rbi
        )
      }

      if (style === "contact") {
        const aContact = a.metrics.ab > 0 ? a.metrics.so / a.metrics.ab : 1
        const bContact = b.metrics.ab > 0 ? b.metrics.so / b.metrics.ab : 1
        return (
          b.metrics.avg - a.metrics.avg ||
          aContact - bContact ||
          b.metrics.h - a.metrics.h
        )
      }

      return (
        b.metrics.obp + b.metrics.ops + b.metrics.avg -
        (a.metrics.obp + a.metrics.ops + a.metrics.avg)
      )
    })
    .slice(0, 9)
}

export default function TeamManagerPage() {
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [players, setPlayers] = useState<Player[]>([])
  const [entriesByPlayer, setEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<
    Record<string, SavedPitchingGameEntry[]>
  >({})
  const [managerMode, setManagerMode] = useState<ManagerMode>("batting")
  const [lineupStyle, setLineupStyle] = useState<LineupStyle>("balanced")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [debugMessage, setDebugMessage] = useState("")

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")
        setDebugMessage("")

        const { data } = await supabase.auth.getUser()
        const email = data.user?.email?.trim().toLowerCase()

        if (!email) {
          navigate("/login", { replace: true })
          return
        }

        if (!data.user) return
        setDebugMessage(`Signed in as ${email}`)

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .maybeSingle()
        setAvatarUrl(profile?.avatar_url ?? "")

        if (email === "admin@jojistats.com") {
          navigate("/admin", { replace: true })
          return
        }

        const access = await fetchUserAccessByEmail(email)
        if (!access) {
          setErrorMessage("No User Access has been assigned.")
          return
        }

        if (access.role !== "manager" && access.role !== "recorder") {
          setErrorMessage(
            `This account has ${access.role} access, not Team Manager access.`
          )
          return
        }
        setDebugMessage(`Access found: ${access.role}, team ${access.team_id}`)

        const teamRow = await fetchTeamById(Number(access.team_id))
        const nextTeam: Team = {
          id: String(teamRow.id),
          name: teamRow.name,
          isArchived: Boolean(teamRow.is_archived),
          currentSeasonYear: teamRow.current_season_year,
        }
        setDebugMessage(`Team loaded: ${nextTeam.name}`)

        let playerRows = await fetchPlayers(
          Number(nextTeam.id),
          nextTeam.currentSeasonYear
        )
        if (playerRows.length === 0) {
          playerRows = await fetchPlayersByTeam(Number(nextTeam.id))
        }
        setDebugMessage(`Players loaded: ${playerRows.length}`)

        setTeam(nextTeam)
        setPlayers(
          playerRows
            .map(mapPlayer)
            .filter((player) => !player.isArchived)
            .sort((a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999))
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
          setDebugMessage(
            statsError instanceof Error
              ? `Players loaded, stats unavailable: ${statsError.message}`
              : "Players loaded, stats unavailable."
          )
          setEntriesByPlayer({})
          setPitchingEntriesByPlayer({})
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error
            ? `Failed to load manager page: ${error.message}`
            : "Failed to load manager page."
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate])

  const teamTotals = useMemo(
    () => calcBattingMetrics(Object.values(entriesByPlayer).flat()),
    [entriesByPlayer]
  )

  const teamPitchingTotals = useMemo(
    () => calcPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const playerSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: calcBattingMetrics(entriesByPlayer[player.id] ?? []),
      })),
    [entriesByPlayer, players]
  )

  const pitcherSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: calcPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
      })),
    [pitchingEntriesByPlayer, players]
  )

  const leaders = useMemo(() => {
    const eligible = playerSummaries.filter((summary) => summary.metrics.ab > 0)
    const byAvg = [...eligible].sort((a, b) => b.metrics.avg - a.metrics.avg)[0]
    const byHr = [...playerSummaries].sort((a, b) => b.metrics.hr - a.metrics.hr)[0]
    const byRbi = [...playerSummaries].sort((a, b) => b.metrics.rbi - a.metrics.rbi)[0]
    const byHits = [...playerSummaries].sort((a, b) => b.metrics.h - a.metrics.h)[0]

    return { byAvg, byHr, byRbi, byHits }
  }, [playerSummaries])

  const pitchingLeaders = useMemo(() => {
    const eligible = pitcherSummaries.filter((summary) => summary.metrics.outs > 0)
    const byEra = [...eligible].sort((a, b) => a.metrics.era - b.metrics.era)[0]
    const byWhip = [...eligible].sort((a, b) => a.metrics.whip - b.metrics.whip)[0]
    const bySo = [...pitcherSummaries].sort((a, b) => b.metrics.so - a.metrics.so)[0]
    const byIp = [...pitcherSummaries].sort((a, b) => b.metrics.outs - a.metrics.outs)[0]

    return { byEra, byWhip, bySo, byIp }
  }, [pitcherSummaries])

  const pitchingUsage = useMemo(
    () =>
      [...pitcherSummaries]
        .filter((summary) => summary.metrics.outs > 0 || summary.player.position === "P")
        .sort((a, b) => b.metrics.outs - a.metrics.outs || b.metrics.so - a.metrics.so)
        .slice(0, 6),
    [pitcherSummaries]
  )

  const strikeoutLeaders = useMemo(
    () =>
      [...pitcherSummaries]
        .filter((summary) => summary.metrics.so > 0)
        .sort((a, b) => b.metrics.so - a.metrics.so)
        .slice(0, 5),
    [pitcherSummaries]
  )

  const pitchingRosterOverview = useMemo(
    () =>
      [...pitcherSummaries].sort((a, b) => {
        if (a.player.position === "P" && b.player.position !== "P") return -1
        if (a.player.position !== "P" && b.player.position === "P") return 1
        return (
          b.metrics.outs - a.metrics.outs ||
          b.metrics.so - a.metrics.so ||
          (a.player.jerseyNumber ?? 999) - (b.player.jerseyNumber ?? 999)
        )
      }),
    [pitcherSummaries]
  )

  const hotPlayers = useMemo(
    () =>
      [...playerSummaries]
        .filter((summary) => summary.metrics.ab > 0)
        .sort((a, b) => b.metrics.ops - a.metrics.ops)
        .slice(0, 3),
    [playerSummaries]
  )

  const coldPlayers = useMemo(
    () =>
      [...playerSummaries]
        .filter((summary) => summary.metrics.ab > 0)
        .sort((a, b) => a.metrics.ops - b.metrics.ops)
        .slice(0, 3),
    [playerSummaries]
  )

  const suggestedLineup = useMemo(
    () => sortLineup(playerSummaries, lineupStyle),
    [lineupStyle, playerSummaries]
  )

  const positionBalance = useMemo(() => {
    const counts: Record<string, number> = {
      Pitchers: 0,
      Catchers: 0,
      Infielders: 0,
      Outfielders: 0,
      Utility: 0,
    }

    players.forEach((player) => {
      counts[getPositionGroup(player.position)] += 1
    })

    return counts
  }, [players])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3]">
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white/95 px-4 py-3 shadow-sm backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/stats" className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-11 sm:w-11" />
            <span className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-3xl">
              JojiStats
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/stats" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-50">
              Stats
            </Link>
            <Link to="/record-game" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 transition-colors hover:bg-green-50">
              Record Game
            </Link>
            <button type="button" onClick={handleLogout} className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-800">
              Logout
            </button>
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

            {/* ── Title + Mode Picker ── */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">{team?.name}</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-green-950 sm:text-3xl">
                  Team Manager
                </h1>
                <p className="mt-1 text-sm text-gray-400">
                  {team?.currentSeasonYear} Season · {players.length} players
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setManagerMode("batting")}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    managerMode === "batting"
                      ? "bg-green-900 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                  }`}
                >
                  Batting
                </button>
                <button
                  type="button"
                  onClick={() => setManagerMode("pitching")}
                  className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                    managerMode === "pitching"
                      ? "bg-green-900 text-white shadow-sm"
                      : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                  }`}
                >
                  Pitching
                </button>
              </div>
            </div>

            {/* Team summary tiles */}
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
                <p className="text-sm text-gray-400">
                  Review leaders, roster balance, and suggested decisions for the selected team.
                </p>
              </div>
            </section>

            {managerMode === "batting" ? (
              <>
                {/* ── Leaders row ── */}
                <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
                  <MgrCard title="Team Leaders">
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "AVG",  text: leaders.byAvg  ? leaders.byAvg.player.name  : "", val: leaders.byAvg  ? fmtRate(leaders.byAvg.metrics.avg)  : "—" },
                        { label: "HR",   text: leaders.byHr   ? leaders.byHr.player.name   : "", val: leaders.byHr   ? String(leaders.byHr.metrics.hr)         : "—" },
                        { label: "RBI",  text: leaders.byRbi  ? leaders.byRbi.player.name  : "", val: leaders.byRbi  ? String(leaders.byRbi.metrics.rbi)        : "—" },
                        { label: "Hits", text: leaders.byHits ? leaders.byHits.player.name : "", val: leaders.byHits ? String(leaders.byHits.metrics.h)         : "—" },
                      ].map(({ label, text, val }) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{text || "No data"}</p>
                            {text && <p className="text-xs font-bold text-green-900">{val}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </MgrCard>

                  <MgrCard title="Hot Players">
                    <div className="mt-4 space-y-2">
                      {hotPlayers.length === 0 ? (
                        <p className="text-sm text-gray-400">No batting data yet.</p>
                      ) : (
                        hotPlayers.map((summary) => (
                          <div key={summary.player.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                            <p className="text-sm font-semibold text-gray-900">{summary.player.name}</p>
                            <p className="text-xs font-bold text-green-900">OPS {fmtRate(summary.metrics.ops)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </MgrCard>

                  <MgrCard title="Cold Players">
                    <div className="mt-4 space-y-2">
                      {coldPlayers.length === 0 ? (
                        <p className="text-sm text-gray-400">No batting data yet.</p>
                      ) : (
                        coldPlayers.map((summary) => (
                          <div key={summary.player.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                            <p className="text-sm font-semibold text-gray-900">{summary.player.name}</p>
                            <p className="text-xs font-bold text-green-900">AVG {fmtRate(summary.metrics.avg)}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </MgrCard>

                  <MgrCard title="Position Balance">
                    <div className="mt-4 space-y-2">
                      {Object.entries(positionBalance).map(([label, count]) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                          <p className="text-sm font-extrabold text-green-950">{count}</p>
                        </div>
                      ))}
                    </div>
                  </MgrCard>
                </section>

                {/* ── Suggested Lineup ── */}
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h2 className="text-base font-bold text-gray-900">Suggested Lineup</h2>
                    <div className="flex flex-wrap gap-2">
                      {(["balanced", "obp", "power", "contact"] as const).map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => setLineupStyle(style)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                            lineupStyle === style
                              ? "bg-green-900 text-white"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {suggestedLineup.map((summary, index) => (
                      <div key={summary.player.id} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
                        <p className="text-sm font-semibold text-gray-900">
                          <span className="mr-1.5 text-xs text-gray-400">{index + 1}.</span>
                          {getPlayerLabel(summary.player)}{" "}
                          <span className="text-xs text-gray-400">{summary.player.position}</span>
                        </p>
                        <p className="mt-1 text-xs text-gray-400">
                          AVG {fmtRate(summary.metrics.avg)} · OBP {fmtRate(summary.metrics.obp)} · OPS {fmtRate(summary.metrics.ops)}
                        </p>
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Roster Overview ── */}
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">Roster Overview</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                          <th className="pb-3 pr-4 text-left">Player</th>
                          <th className="pb-3 px-2 text-center">Pos</th>
                          <th className="pb-3 px-2 text-center">G</th>
                          <th className="pb-3 px-2 text-center">AB</th>
                          <th className="pb-3 px-2 text-center">H</th>
                          <th className="pb-3 px-2 text-center text-green-700">AVG</th>
                          <th className="pb-3 px-2 text-center">HR</th>
                          <th className="pb-3 px-2 text-center">RBI</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {players.map((player) => {
                          const totals = calcBattingMetrics(entriesByPlayer[player.id] ?? [])
                          return (
                            <tr key={player.id}>
                              <td className="py-3 pr-4 font-semibold text-gray-900">
                                {player.jerseyNumber != null && (
                                  <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                                )}
                                {player.name}
                              </td>
                              <td className="px-2 py-3 text-center text-gray-500">{player.position}</td>
                              <td className="px-2 py-3 text-center text-gray-500">{totals.games}</td>
                              <td className="px-2 py-3 text-center text-gray-500">{totals.ab}</td>
                              <td className="px-2 py-3 text-center text-gray-500">{totals.h}</td>
                              <td className="px-2 py-3 text-center font-bold text-green-900">{fmtRate(totals.avg)}</td>
                              <td className="px-2 py-3 text-center text-gray-500">{totals.hr}</td>
                              <td className="px-2 py-3 text-center text-gray-500">{totals.rbi}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            ) : (
              <>
                {/* ── Pitching leaders row ── */}
                <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
                  <MgrCard title="Pitching Leaders">
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "ERA",  text: pitchingLeaders.byEra  ? pitchingLeaders.byEra.player.name  : "", val: pitchingLeaders.byEra  ? fmtDecimal(pitchingLeaders.byEra.metrics.era)    : "—" },
                        { label: "WHIP", text: pitchingLeaders.byWhip ? pitchingLeaders.byWhip.player.name : "", val: pitchingLeaders.byWhip ? fmtDecimal(pitchingLeaders.byWhip.metrics.whip)  : "—" },
                        { label: "SO",   text: pitchingLeaders.bySo   ? pitchingLeaders.bySo.player.name   : "", val: pitchingLeaders.bySo   ? String(pitchingLeaders.bySo.metrics.so)              : "—" },
                        { label: "IP",   text: pitchingLeaders.byIp   ? pitchingLeaders.byIp.player.name   : "", val: pitchingLeaders.byIp   ? fmtIp(pitchingLeaders.byIp.metrics.outs)              : "—" },
                      ].map(({ label, text, val }) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-gray-900">{text || "No data"}</p>
                            {text && <p className="text-xs font-bold text-green-900">{val}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </MgrCard>

                  <div className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
                    <h2 className="text-base font-bold text-gray-900">Pitcher Usage</h2>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {pitchingUsage.length === 0 ? (
                        <p className="text-sm text-gray-400">No pitching data yet.</p>
                      ) : (
                        pitchingUsage.map((summary) => (
                          <div key={summary.player.id} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
                            <p className="text-sm font-semibold text-gray-900">
                              {getPlayerLabel(summary.player)}{" "}
                              <span className="text-xs text-gray-400">{summary.player.position}</span>
                            </p>
                            <p className="mt-1 text-xs text-gray-400">
                              IP {fmtIp(summary.metrics.outs)} · ERA {fmtDecimal(summary.metrics.era)} · SO {summary.metrics.so}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <MgrCard title="Staff Notes">
                    <div className="mt-4 space-y-2">
                      {[
                        { label: "Pitchers",     val: String(positionBalance.Pitchers) },
                        { label: "Appearances",  val: String(teamPitchingTotals.games) },
                        { label: "Runs",         val: String(teamPitchingTotals.r) },
                        { label: "Earned Runs",  val: String(teamPitchingTotals.er) },
                      ].map(({ label, val }) => (
                        <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                          <p className="text-sm font-extrabold text-green-950">{val}</p>
                        </div>
                      ))}
                    </div>
                  </MgrCard>
                </section>

                {/* ── Strikeouts chart ── */}
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">Strikeouts by Pitcher</h2>
                  <div className="mt-4 space-y-3">
                    {strikeoutLeaders.length === 0 ? (
                      <p className="text-sm text-gray-400">No strikeout data yet.</p>
                    ) : (
                      strikeoutLeaders.map((summary) => {
                        const maxSo = Math.max(...strikeoutLeaders.map((l) => l.metrics.so), 1)
                        const width = `${Math.max((summary.metrics.so / maxSo) * 100, 6)}%`
                        return (
                          <div key={summary.player.id}>
                            <div className="mb-1.5 flex justify-between text-sm">
                              <span className="font-semibold text-gray-900">{summary.player.name}</span>
                              <span className="text-xs font-bold text-green-900">{summary.metrics.so} SO</span>
                            </div>
                            <div className="h-2 rounded-full bg-[#f7f8f3]">
                              <div className="h-2 rounded-full bg-green-800" style={{ width }} />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                {/* ── Pitching Roster Overview ── */}
                <section className="rounded-2xl bg-white p-5 shadow-sm">
                  <h2 className="text-base font-bold text-gray-900">Pitching Roster Overview</h2>
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                          <th className="pb-3 pr-4 text-left">Player</th>
                          <th className="pb-3 px-2 text-center">Pos</th>
                          <th className="pb-3 px-2 text-center">APP</th>
                          <th className="pb-3 px-2 text-center">IP</th>
                          <th className="pb-3 px-2 text-center text-green-700">ERA</th>
                          <th className="pb-3 px-2 text-center">WHIP</th>
                          <th className="pb-3 px-2 text-center">H</th>
                          <th className="pb-3 px-2 text-center">ER</th>
                          <th className="pb-3 px-2 text-center">BB</th>
                          <th className="pb-3 px-2 text-center">SO</th>
                          <th className="pb-3 px-2 text-center">HR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {pitchingRosterOverview.map(({ player, metrics: totals }) => (
                          <tr key={player.id}>
                            <td className="py-3 pr-4 font-semibold text-gray-900">
                              {player.jerseyNumber != null && (
                                <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                              )}
                              {player.name}
                            </td>
                            <td className="px-2 py-3 text-center text-gray-500">{player.position}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.games}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{fmtIp(totals.outs)}</td>
                            <td className="px-2 py-3 text-center font-bold text-green-900">{fmtDecimal(totals.era)}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{fmtDecimal(totals.whip)}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.h}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.er}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.bb}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.so}</td>
                            <td className="px-2 py-3 text-center text-gray-500">{totals.hr}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function MgrCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function ManagerSummaryCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm sm:p-5 ${
        accent ? "bg-green-800 text-white" : "border border-gray-100 bg-white"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-widest ${
          accent ? "text-green-300" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-extrabold tracking-tight ${
          accent ? "text-white" : "text-green-950"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${accent ? "text-green-400" : "text-gray-400"}`}>
          {sub}
        </p>
      )}
    </div>
  )
}
