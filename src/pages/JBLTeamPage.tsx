import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import { getJblData, getJblVisibleGames, JBL_SEASON, type JblTeam } from "../api/jbl"
import { battingFromGames, fmtAvg, pitchingFromGames } from "../components/jbl/stats"
import { filterRevealedGames } from "../components/jbl/gameReveal"
import { jblThemeStyle, teamBadge, teamColors } from "../components/jbl/teamTheme"
import { getStatColor } from "../components/mlb/playerStats"
import type { GameData, SimBatter, SimPitcher } from "../components/jbl/types"

type StatColor = ReturnType<typeof getStatColor>

const NEUTRAL_STAT_COLOR: StatColor = {
  bg: "bg-[#f7f8f3]",
  lbl: "text-gray-400",
  val: "text-gray-900",
}

function getRecordColor(winPercentage: number): StatColor {
  if (!Number.isFinite(winPercentage)) return NEUTRAL_STAT_COLOR
  if (winPercentage >= 0.55) {
    return { bg: "bg-emerald-50", lbl: "text-emerald-700", val: "text-emerald-900" }
  }
  if (winPercentage <= 0.45) {
    return { bg: "bg-rose-50", lbl: "text-rose-600", val: "text-rose-900" }
  }
  return NEUTRAL_STAT_COLOR
}

function StatTile({
  label,
  value,
  detail,
  color,
}: {
  label: string
  value: string
  detail?: string
  color?: StatColor
}) {
  const resolved = color ?? getStatColor(label, value, "jbl")
  return (
    <div className={`rounded-xl p-3 text-center sm:p-4 ${resolved.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${resolved.lbl}`}>{label}</p>
      <p className={`mt-1.5 text-xl font-extrabold sm:text-2xl ${resolved.val}`}>{value}</p>
      {detail && <p className="mt-0.5 text-xs text-gray-400">{detail}</p>}
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

// Weighted by playing time (PA / IP) since the sim only exports rate stats
// per player, not the underlying raw counts a true team total needs.
function weightedAvg(rows: { value: number; weight: number }[]) {
  const totalWeight = rows.reduce((sum, r) => sum + r.weight, 0)
  if (totalWeight <= 0) return 0
  return rows.reduce((sum, r) => sum + r.value * r.weight, 0) / totalWeight
}

export default function JBLTeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<JblTeam[]>([])
  const [batters, setBatters] = useState<SimBatter[]>([])
  const [pitchers, setPitchers] = useState<SimPitcher[]>([])
  const [games, setGames] = useState<GameData[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { teams, visibleThrough } = await getJblData()
        const rawGames = filterRevealedGames(await getJblVisibleGames(visibleThrough))
        if (cancelled) return
        setTeams([...teams].sort((a, b) => a.name.localeCompare(b.name)))
        setBatters(battingFromGames(rawGames))
        setPitchers(pitchingFromGames(rawGames))
        setGames(rawGames as unknown as GameData[])
      } catch {
        if (!cancelled) setError("Failed to load this JBL team.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const team = teams.find((candidate) => candidate.id === teamId) ?? null
  const handleChangeTeam = (name: string) => {
    const selected = teams.find((candidate) => candidate.name === name)
    if (selected) navigate(`/jbl/teams/${selected.id}`)
  }

  const teamBatters = useMemo(
    () => (team ? batters.filter((p) => p.team === team.name).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [batters, team]
  )
  const teamPitchers = useMemo(
    () => (team ? pitchers.filter((p) => p.team === team.name).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [pitchers, team]
  )
  const recentGames = useMemo(() => {
    if (!team) return []
    return games
      .filter((g) => g.away === team.name || g.home === team.name)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8)
  }, [games, team])

  return (
    <PageShell
      variant="mlb"
      style={jblThemeStyle(team?.name ?? "")}
      headerProps={{
        teamName: team?.name ?? "",
        teams: teams.map((candidate) => candidate.name),
        onChangeTeam: handleChangeTeam,
        placeholder: "Select a JBL team...",
      }}
      activeView="team"
      onChangeView={() => {}}
      tabs={[
        { label: "Team Overview", view: "team" },
        { label: "Players", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=players` },
        { label: "Today's Games", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=today` },
        { label: "Standings", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=standings` },
        { label: "Team Identity", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=identity` },
        { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
      {loading && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading team...
        </div>
      )}

      {!loading && (error || !team) && (
        <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">
          {error || "Team not found."}
        </div>
      )}

      {!loading && team && (
        <div className="space-y-5">
          {(() => {
            const c = teamColors(team.name)
            const gamesPlayed = team.wins + team.losses
            const rosterCount = teamBatters.length + teamPitchers.length
            const recordColor = getRecordColor(team.pct)

            const teamAvg = weightedAvg(teamBatters.map((p) => ({ value: p.avg, weight: p.pa })))
            const teamObp = weightedAvg(teamBatters.map((p) => ({ value: p.obp, weight: p.pa })))
            const teamOps = weightedAvg(teamBatters.map((p) => ({ value: p.ops, weight: p.pa })))
            const teamHr = teamBatters.reduce((sum, p) => sum + p.hr, 0)
            const teamRbi = teamBatters.reduce((sum, p) => sum + p.rbi, 0)

            const teamEra = weightedAvg(teamPitchers.map((p) => ({ value: p.era, weight: p.ip })))
            const teamWhip = weightedAvg(teamPitchers.map((p) => ({ value: p.whip, weight: p.ip })))
            const teamIp = teamPitchers.reduce((sum, p) => sum + p.ip, 0)
            const teamWins = teamPitchers.reduce((sum, p) => sum + p.w, 0)
            const teamSaves = teamPitchers.reduce((sum, p) => sum + p.sv, 0)

            return (
              <>
                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                      {teamBadge(team.name, "3xl")}
                      <div className="min-w-0">
                        <p className="text-[10px] font-bold uppercase tracking-wider sm:text-xs sm:tracking-widest" style={{ color: c.primary }}>
                          {team.league}
                        </p>
                        <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                          {team.name}
                        </h1>
                      </div>
                    </div>
                    <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-900">
                      {JBL_SEASON} Season
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                    <StatTile label="Record" value={`${team.wins}-${team.losses}`} detail={`${gamesPlayed} games`} color={recordColor} />
                    <StatTile label="Win PCT" value={fmtAvg(team.pct)} color={recordColor} />
                    <StatTile label="Games" value={String(gamesPlayed)} />
                    <StatTile label="Players" value={String(rosterCount)} />
                  </div>
                </section>

                <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
                  <div className="min-w-0 flex-1 space-y-5">
                    <Card title="Roster">
                      <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                        {teamBatters.map((p) => (
                          <Link
                            key={`bat-${p.name}`}
                            to={`/jbl?team=${encodeURIComponent(team.name)}&view=players&player=${encodeURIComponent(p.name)}`}
                            className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5 transition hover:bg-[#eef0e9] hover:shadow-sm"
                          >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-xs font-bold text-green-900">
                              {p.position || "B"}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-800">{p.name}</p>
                              <p className="text-xs text-gray-400">
                                {p.jerseyNumber ? `#${p.jerseyNumber} · ` : ""}
                                {p.position || "Batter"}
                              </p>
                            </div>
                          </Link>
                        ))}
                        {teamPitchers.map((p) => {
                          const role = p.role
                          return (
                            <Link
                              key={`pit-${p.name}`}
                              to={`/jbl?team=${encodeURIComponent(team.name)}&view=players&player=${encodeURIComponent(p.name)}`}
                              className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5 transition hover:bg-[#eef0e9] hover:shadow-sm"
                            >
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-xs font-bold text-blue-900">
                                P
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-semibold text-gray-800">{p.name}</p>
                                <p className="text-xs text-gray-400">
                                  {p.jerseyNumber ? `#${p.jerseyNumber} · ` : ""}
                                  {role}
                                </p>
                              </div>
                            </Link>
                          )
                        })}
                      </div>
                    </Card>

                    <Card title="Team Batting">
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                        <StatTile label="AVG" value={fmtAvg(teamAvg)} />
                        <StatTile label="OBP" value={fmtAvg(teamObp)} />
                        <StatTile label="OPS" value={fmtAvg(teamOps)} />
                        <StatTile label="HR" value={String(teamHr)} />
                        <StatTile label="RBI" value={String(teamRbi)} />
                      </div>
                    </Card>

                    <Card title="Team Pitching">
                      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                        <StatTile label="ERA" value={teamEra.toFixed(2)} />
                        <StatTile label="WHIP" value={teamWhip.toFixed(2)} />
                        <StatTile label="IP" value={teamIp.toFixed(1)} />
                        <StatTile label="W" value={String(teamWins)} />
                        <StatTile label="SV" value={String(teamSaves)} />
                      </div>
                    </Card>
                  </div>

                  <aside className="shrink-0 lg:w-72">
                    <div className="rounded-2xl bg-white p-5 shadow-sm lg:sticky lg:top-4">
                      <h2 className="text-base font-bold text-gray-900">Recent Results</h2>
                      <p className="mt-0.5 text-xs text-gray-400">
                        Last {recentGames.length} completed games
                      </p>
                      <div className="mt-4 space-y-2">
                        {recentGames.map((game) => {
                          const isHome = game.home === team.name
                          const own = isHome ? game.finalScore.home : game.finalScore.away
                          const opp = isHome ? game.finalScore.away : game.finalScore.home
                          const opponent = isHome ? game.away : game.home
                          const result = own === opp ? "T" : own > opp ? "W" : "L"
                          return (
                            <Link
                              key={game.gameId}
                              to={`/jbl/games/${game.gameId}?team=${encodeURIComponent(team.name)}&date=${game.date}`}
                              className="block rounded-xl bg-[#f7f8f3] px-3 py-3 transition hover:bg-[#eef0e9]"
                            >
                              <div className="flex items-center gap-3">
                                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
                                  result === "W"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : result === "L"
                                    ? "bg-red-100 text-red-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}>
                                  {result}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-sm font-semibold text-gray-900">
                                    vs {opponent}
                                  </p>
                                  <p className="text-xs text-gray-400">
                                    {new Date(`${game.date}T00:00:00`).toLocaleDateString("en-US", {
                                      month: "short",
                                      day: "numeric",
                                    })}
                                  </p>
                                </div>
                                <span className="text-sm font-extrabold tabular-nums text-gray-700">
                                  {own}-{opp}
                                </span>
                              </div>
                            </Link>
                          )
                        })}
                        {recentGames.length === 0 && (
                          <p className="text-sm text-gray-400">No completed games yet.</p>
                        )}
                      </div>
                    </div>
                  </aside>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </PageShell>
  )
}
