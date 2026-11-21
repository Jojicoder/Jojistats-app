import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getJblData, type JblStandingLeague } from "../../api/jbl"
import { ALL_TEAMS } from "../../sim/jblSeason"
import { fmtAvg } from "./stats"
import { teamBadge, teamColors } from "./teamTheme"
import type { SimTeam } from "./types"
import { compareRecord } from "./playoffs"

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
                  {team.hasStats ? fmtAvg(team.pct) : "—"}
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

const WILD_CARD_SPOTS = 3

/** Division winners are not in this race; the best 3 of the rest qualify. */
function wildCardRace(standings: JblStandingLeague[]) {
  const rest = standings.flatMap((division) => {
    const ranked = [...division.teams].filter((team) => team.hasStats).sort(compareRecord)
    return ranked.slice(1)
  })
  rest.sort(compareRecord)
  const last = rest[WILD_CARD_SPOTS - 1]
  const firstOut = rest[WILD_CARD_SPOTS]
  return rest.map((team, index) => {
    // Ahead of the first team out (+) for qualifiers, behind the last qualifier otherwise.
    const ref = index < WILD_CARD_SPOTS ? firstOut : last
    const diff = ref ? ((team.wins - ref.wins) + (ref.losses - team.losses)) / 2 : 0
    const label = index === WILD_CARD_SPOTS - 1 && !ref ? "—" : index < WILD_CARD_SPOTS ? `+${diff.toFixed(1)}` : diff === 0 ? "—" : (-diff).toFixed(1)
    return { team, rank: index + 1, label }
  })
}

function WildCardCard({ standings, selectedTeamId }: { standings: JblStandingLeague[]; selectedTeamId?: string }) {
  const race = wildCardRace(standings)
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5 lg:max-w-2xl">
      <div className="px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-green-900">Wild card race</h3>
        <p className="mt-1 text-xs text-gray-500">
          Division leaders are already in. The 3 best of the remaining teams take the wild card spots.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
            <th className="w-8 px-4 pb-2 text-left">#</th>
            <th className="pb-2 text-left">Team</th>
            <th className="px-2 pb-2 text-right">W</th>
            <th className="px-2 pb-2 text-right">L</th>
            <th className="px-2 pb-2 text-right">PCT</th>
            <th className="px-4 pb-2 text-right">WCGB</th>
          </tr>
        </thead>
        <tbody>
          {race.map(({ team, rank, label }) => (
            <tr
              key={team.name}
              className={`border-b last:border-0 ${rank === WILD_CARD_SPOTS ? "border-gray-300" : "border-gray-50"} ${
                team.id === selectedTeamId ? "border-l-4 border-l-green-900 bg-green-50" : ""
              }`}
            >
              <td className="px-4 py-3 font-mono text-xs text-gray-400">{rank}</td>
              <td className="py-3">
                <div className="flex min-w-0 items-center gap-3">
                  {teamBadge(team.name, "lg")}
                  <Link
                    to={`/jbl/teams/${team.id}`}
                    className="truncate font-bold hover:underline"
                    style={{ color: teamColors(team.name).primary }}
                  >
                    {team.name}
                  </Link>
                  <span className="hidden text-xs text-gray-400 sm:inline">{team.league.replace(" Division", "")}</span>
                </div>
              </td>
              <td className="px-2 py-3 text-right font-mono font-semibold text-gray-700">{team.wins}</td>
              <td className="px-2 py-3 text-right font-mono text-gray-500">{team.losses}</td>
              <td className="px-2 py-3 text-right font-mono text-gray-500">{fmtAvg(team.pct)}</td>
              <td className="px-4 py-3 text-right font-mono text-gray-400">{label}</td>
            </tr>
          ))}
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
  const [mode, setMode] = useState<"division" | "wildcard">("division")

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

  const toggle = (
    <div className="flex gap-2">
      {([["division", "Divisions"], ["wildcard", "Wild Card"]] as const).map(([key, label]) => (
        <button
          key={key}
          onClick={() => setMode(key)}
          className={`rounded-full px-4 py-1.5 text-sm font-bold ${mode === key ? "bg-green-900 text-white" : "bg-white text-gray-600 shadow-sm hover:bg-gray-50"}`}
        >
          {label}
        </button>
      ))}
    </div>
  )

  if (mode === "wildcard") {
    return (
      <div className="space-y-4">
        {toggle}
        <WildCardCard standings={standings} selectedTeamId={selectedTeamId} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {toggle}
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
    </div>
  )
}
