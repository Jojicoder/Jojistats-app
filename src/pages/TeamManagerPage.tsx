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

function getTotals(entries: SavedBattingGameEntry[]) {
  return entries.reduce(
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
}

function getMetrics(entries: SavedBattingGameEntry[]) {
  const totals = getTotals(entries)
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
    slg,
    ops: obp + slg,
  }
}

function formatRate(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

function formatDecimal(value: number) {
  return value.toFixed(2)
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
  summaries: Array<{ player: Player; metrics: ReturnType<typeof getMetrics> }>,
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
    () => getMetrics(Object.values(entriesByPlayer).flat()),
    [entriesByPlayer]
  )

  const teamPitchingTotals = useMemo(
    () => getPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const playerSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: getMetrics(entriesByPlayer[player.id] ?? []),
      })),
    [entriesByPlayer, players]
  )

  const pitcherSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: getPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
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
                src={avatarUrl || "/logo.png"}
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
          <div className="rounded-2xl bg-white p-6 shadow-sm">
            <p className="text-red-700">{errorMessage}</p>
            {debugMessage && (
              <p className="mt-3 text-sm text-gray-500">{debugMessage}</p>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            <section className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Team Manager
                  </p>
                  <h1 className="mt-2 text-2xl font-bold">{team?.name}</h1>
                  <p className="mt-2 text-sm text-gray-600">
                    Season {team?.currentSeasonYear} · {players.length} players
                  </p>
                </div>

                <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => setManagerMode("batting")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      managerMode === "batting"
                        ? "bg-green-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-green-900"
                    }`}
                  >
                    Batting
                  </button>
                  <button
                    type="button"
                    onClick={() => setManagerMode("pitching")}
                    className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                      managerMode === "pitching"
                        ? "bg-green-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-green-900"
                    }`}
                  >
                    Pitching
                  </button>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-700">
                {managerMode === "batting" ? (
                  <>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      G {teamTotals.games}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      AVG {formatRate(teamTotals.avg)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      OBP {formatRate(teamTotals.obp)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      OPS {formatRate(teamTotals.ops)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      HR {teamTotals.hr}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      RBI {teamTotals.rbi}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      APP {teamPitchingTotals.games}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      ERA {formatDecimal(teamPitchingTotals.era)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      WHIP {formatDecimal(teamPitchingTotals.whip)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      IP {teamPitchingTotals.ip}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      SO {teamPitchingTotals.so}
                    </span>
                    <span className="rounded-full bg-gray-100 px-3 py-1">
                      BB {teamPitchingTotals.bb}
                    </span>
                  </>
                )}
              </div>
            </section>

            {managerMode === "batting" ? (
              <>
            <section className="grid grid-cols-1 gap-4 xl:grid-cols-4">
              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Team Leaders</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex justify-between gap-3">
                    <span className="text-gray-500">AVG</span>
                    <span className="font-semibold">
                      {leaders.byAvg
                        ? `${leaders.byAvg.player.name} ${formatRate(leaders.byAvg.metrics.avg)}`
                        : "No data"}
                    </span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-gray-500">HR</span>
                    <span className="font-semibold">
                      {leaders.byHr
                        ? `${leaders.byHr.player.name} ${leaders.byHr.metrics.hr}`
                        : "No data"}
                    </span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-gray-500">RBI</span>
                    <span className="font-semibold">
                      {leaders.byRbi
                        ? `${leaders.byRbi.player.name} ${leaders.byRbi.metrics.rbi}`
                        : "No data"}
                    </span>
                  </p>
                  <p className="flex justify-between gap-3">
                    <span className="text-gray-500">Hits</span>
                    <span className="font-semibold">
                      {leaders.byHits
                        ? `${leaders.byHits.player.name} ${leaders.byHits.metrics.h}`
                        : "No data"}
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Hot Players</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {hotPlayers.length === 0 ? (
                    <p className="text-gray-500">No batting data yet.</p>
                  ) : (
                    hotPlayers.map((summary) => (
                      <p
                        key={summary.player.id}
                        className="flex justify-between gap-3"
                      >
                        <span className="font-medium">{summary.player.name}</span>
                        <span className="text-gray-500">
                          OPS {formatRate(summary.metrics.ops)}
                        </span>
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Cold Players</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {coldPlayers.length === 0 ? (
                    <p className="text-gray-500">No batting data yet.</p>
                  ) : (
                    coldPlayers.map((summary) => (
                      <p
                        key={summary.player.id}
                        className="flex justify-between gap-3"
                      >
                        <span className="font-medium">{summary.player.name}</span>
                        <span className="text-gray-500">
                          AVG {formatRate(summary.metrics.avg)}
                        </span>
                      </p>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-2xl bg-white p-4 shadow-sm">
                <h2 className="text-lg font-semibold">Position Balance</h2>
                <div className="mt-4 space-y-3 text-sm">
                  {Object.entries(positionBalance).map(([label, count]) => (
                    <p key={label} className="flex justify-between gap-3">
                      <span className="text-gray-500">{label}</span>
                      <span className="font-semibold">{count}</span>
                    </p>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-lg font-semibold">Suggested Lineup</h2>
                <div className="flex flex-wrap gap-2">
                  {(["balanced", "obp", "power", "contact"] as const).map(
                    (style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setLineupStyle(style)}
                        className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase ${
                          lineupStyle === style
                            ? "bg-green-900 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-900"
                        }`}
                      >
                        {style}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                {suggestedLineup.map((summary, index) => (
                  <div
                    key={summary.player.id}
                    className="rounded-xl border border-gray-100 px-4 py-3 text-sm"
                  >
                    <p className="font-semibold text-gray-900">
                      {index + 1}. {getPlayerLabel(summary.player)}{" "}
                      <span className="text-gray-500">
                        {summary.player.position}
                      </span>
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      AVG {formatRate(summary.metrics.avg)} · OBP{" "}
                      {formatRate(summary.metrics.obp)} · OPS{" "}
                      {formatRate(summary.metrics.ops)}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Roster Overview</h2>

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
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {players.map((player) => {
                      const totals = getMetrics(entriesByPlayer[player.id] ?? [])
                      return (
                        <tr key={player.id}>
                          <td className="py-3 pr-4 font-medium text-gray-900">
                            {player.jerseyNumber != null
                              ? `#${player.jerseyNumber} `
                              : ""}
                            {player.name}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {player.position}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {totals.games}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {totals.ab}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {totals.h}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {formatRate(totals.avg)}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {totals.hr}
                          </td>
                          <td className="py-3 pr-4 text-gray-600">
                            {totals.rbi}
                          </td>
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
                <section className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-semibold">Pitching Leaders</h2>
                    <div className="mt-4 space-y-3 text-sm">
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">ERA</span>
                        <span className="font-semibold">
                          {pitchingLeaders.byEra
                            ? `${pitchingLeaders.byEra.player.name} ${formatDecimal(pitchingLeaders.byEra.metrics.era)}`
                            : "No data"}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">WHIP</span>
                        <span className="font-semibold">
                          {pitchingLeaders.byWhip
                            ? `${pitchingLeaders.byWhip.player.name} ${formatDecimal(pitchingLeaders.byWhip.metrics.whip)}`
                            : "No data"}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">SO</span>
                        <span className="font-semibold">
                          {pitchingLeaders.bySo
                            ? `${pitchingLeaders.bySo.player.name} ${pitchingLeaders.bySo.metrics.so}`
                            : "No data"}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">IP</span>
                        <span className="font-semibold">
                          {pitchingLeaders.byIp
                            ? `${pitchingLeaders.byIp.player.name} ${pitchingLeaders.byIp.metrics.ip}`
                            : "No data"}
                        </span>
                      </p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm xl:col-span-2">
                    <h2 className="text-lg font-semibold">Pitcher Usage</h2>
                    <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {pitchingUsage.length === 0 ? (
                        <p className="text-sm text-gray-500">No pitching data yet.</p>
                      ) : (
                        pitchingUsage.map((summary) => (
                          <div
                            key={summary.player.id}
                            className="rounded-xl border border-gray-100 px-4 py-3 text-sm"
                          >
                            <p className="font-semibold text-gray-900">
                              {getPlayerLabel(summary.player)}{" "}
                              <span className="text-gray-500">
                                {summary.player.position}
                              </span>
                            </p>
                            <p className="mt-1 text-xs text-gray-500">
                              IP {summary.metrics.ip} · ERA{" "}
                              {formatDecimal(summary.metrics.era)} · SO{" "}
                              {summary.metrics.so}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-white p-4 shadow-sm">
                    <h2 className="text-lg font-semibold">Staff Notes</h2>
                    <div className="mt-4 space-y-3 text-sm">
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">Pitchers</span>
                        <span className="font-semibold">{positionBalance.Pitchers}</span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">Appearances</span>
                        <span className="font-semibold">
                          {teamPitchingTotals.games}
                        </span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">Runs</span>
                        <span className="font-semibold">{teamPitchingTotals.r}</span>
                      </p>
                      <p className="flex justify-between gap-3">
                        <span className="text-gray-500">ER</span>
                        <span className="font-semibold">{teamPitchingTotals.er}</span>
                      </p>
                    </div>
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold">Strikeouts by Pitcher</h2>

                  <div className="mt-4 space-y-3">
                    {strikeoutLeaders.length === 0 ? (
                      <p className="text-sm text-gray-500">No strikeout data yet.</p>
                    ) : (
                      strikeoutLeaders.map((summary) => {
                        const maxStrikeouts = Math.max(
                          ...strikeoutLeaders.map((leader) => leader.metrics.so),
                          1
                        )
                        const width = `${Math.max((summary.metrics.so / maxStrikeouts) * 100, 8)}%`

                        return (
                          <div key={summary.player.id}>
                            <div className="mb-1 flex justify-between text-sm">
                              <span className="font-medium text-gray-900">
                                {summary.player.name}
                              </span>
                              <span className="text-gray-500">
                                {summary.metrics.so} SO
                              </span>
                            </div>
                            <div className="h-3 rounded-full bg-gray-100">
                              <div
                                className="h-3 rounded-full bg-green-900"
                                style={{ width }}
                              />
                            </div>
                          </div>
                        )
                      })
                    )}
                  </div>
                </section>

                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="text-lg font-semibold">Pitching Roster Overview</h2>

                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                        <tr>
                          <th className="py-2 pr-4">Player</th>
                          <th className="py-2 pr-4">Pos</th>
                          <th className="py-2 pr-4">APP</th>
                          <th className="py-2 pr-4">IP</th>
                          <th className="py-2 pr-4">ERA</th>
                          <th className="py-2 pr-4">WHIP</th>
                          <th className="py-2 pr-4">H</th>
                          <th className="py-2 pr-4">ER</th>
                          <th className="py-2 pr-4">BB</th>
                          <th className="py-2 pr-4">SO</th>
                          <th className="py-2 pr-4">HR</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {pitchingRosterOverview.map(({ player, metrics: totals }) => {

                          return (
                            <tr key={player.id}>
                              <td className="py-3 pr-4 font-medium text-gray-900">
                                {player.jerseyNumber != null
                                  ? `#${player.jerseyNumber} `
                                  : ""}
                                {player.name}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {player.position}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.games}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.ip}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {formatDecimal(totals.era)}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {formatDecimal(totals.whip)}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.h}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.er}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.bb}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.so}
                              </td>
                              <td className="py-3 pr-4 text-gray-600">
                                {totals.hr}
                              </td>
                            </tr>
                          )
                        })}
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
