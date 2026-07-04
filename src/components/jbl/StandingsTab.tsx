import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getJblData, type JblStandingLeague } from "../../api/jbl"
import { ALL_TEAMS } from "../../sim/jblSeason"
import { teamBadge, teamColors } from "./teamTheme"
import type { SimTeam } from "./types"

function sortStandingsTeams(teams: SimTeam[]) {
  const leagueOrder = new Map(ALL_TEAMS.map((team, index) => [team, index]))
  return [...teams].sort((a, b) => {
    if (a.hasStats !== b.hasStats) return a.hasStats ? -1 : 1
    if (b.pct !== a.pct) return b.pct - a.pct
    if (b.wins !== a.wins) return b.wins - a.wins
    return (leagueOrder.get(a.name) ?? 0) - (leagueOrder.get(b.name) ?? 0)
  })
}

function StandingsCard({
  title,
  teams,
  selectedTeamId,
}: {
  title: string
  teams: SimTeam[]
  selectedTeamId?: string
}) {
  const sorted = sortStandingsTeams(teams)
  const leader = sorted.find((team) => team.hasStats)

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-green-900">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
            <th className="px-4 pb-2 text-left">Team</th>
            <th className="px-2 pb-2 text-right">W</th>
            <th className="px-2 pb-2 text-right">L</th>
            <th className="px-2 pb-2 text-right">PCT</th>
            <th className="px-4 pb-2 text-right">GB</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, index) => {
            const c = teamColors(team.name)
            const gamesBehind = leader && team.hasStats
              ? ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2
              : 0
            const gb = !team.hasStats || index === 0 ? "—" : gamesBehind.toFixed(1)
            const isSelected = team.id === selectedTeamId

            return (
              <tr
                key={team.name}
                className={`border-b border-gray-50 last:border-0 ${
                  isSelected ? "border-l-4 border-l-green-900 bg-green-50" : ""
                }`}
              >
                <td className="px-4 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    {teamBadge(team.name, "xl")}
                    <Link
                      to={`/jbl/teams/${team.id}`}
                      className="truncate font-bold hover:underline"
                      style={{ color: c.primary }}
                    >
                      {team.name}
                    </Link>
                  </div>
                </td>
                <td className="px-2 py-3.5 text-right font-mono font-semibold text-gray-700">{team.wins}</td>
                <td className="px-2 py-3.5 text-right font-mono text-gray-500">{team.losses}</td>
                <td className="px-2 py-3.5 text-right font-mono text-gray-500">
                  {team.hasStats ? team.pct.toFixed(3) : "—"}
                </td>
                <td className="px-4 py-3.5 text-right font-mono text-gray-400">{gb}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function StandingsTab({
  selectedTeamId,
}: {
  selectedTeamId?: string
}) {
  const [standings, setStandings] = useState<JblStandingLeague[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    getJblData()
      .then(({ standings }) => {
        if (!cancelled) setStandings(standings)
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load JBL standings.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  if (!standings && !error) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>

  if (!standings || standings.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        No JBL standings are available.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {standings.map((league) => (
        <section key={league.name} className="space-y-3">
          <h2 className="px-1 text-sm font-black uppercase tracking-[0.18em] text-green-900">
            {league.name.toUpperCase()}
          </h2>
          <StandingsCard
            title={league.name.replace(" Division", "")}
            teams={league.teams}
            selectedTeamId={selectedTeamId}
          />
        </section>
      ))}
    </div>
  )
}
