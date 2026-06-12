import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getStandings, MLB_SEASON } from "./api"
import type { DivisionRecord } from "./types"

// ── Standings ─────────────────────────────────────────────────────────

const DIVISION_ORDER = [
  "American League East", "American League Central", "American League West",
  "National League East", "National League Central", "National League West",
]

const LEAGUES = [
  { name: "American League", prefix: "American" },
  { name: "National League", prefix: "National" },
]

export default function StandingsTab({
  selectedTeamId,
}: {
  selectedTeamId?: number | null
}) {
  const [divisions, setDivisions] = useState<DivisionRecord[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getStandings()
      .then(setDivisions)
      .catch(() => setError("Failed to load standings."))
  }, [])

  if (!divisions && !error) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>

  const sorted = [...(divisions ?? [])].sort(
    (a, b) => DIVISION_ORDER.indexOf(a.name) - DIVISION_ORDER.indexOf(b.name)
  )

  if (sorted.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        No standings are available for the {MLB_SEASON} season.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {LEAGUES.map(({ name, prefix }) => {
        const leagueDivs = sorted.filter((d) => d.name.startsWith(prefix))
        return (
          <section key={prefix}>
            <h2 className="mb-3 text-sm font-extrabold uppercase tracking-widest text-green-900">
              {name}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {leagueDivs.map((div) => (
                <div key={div.name} className="rounded-2xl bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">
                    {div.name.replace("American League", "AL").replace("National League", "NL")}
                  </p>
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[300px] text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-gray-400">
                        <th className="pb-1.5 text-left font-semibold">Team</th>
                        <th className="pb-1.5 text-right font-semibold w-8">W</th>
                        <th className="pb-1.5 text-right font-semibold w-8">L</th>
                        <th className="pb-1.5 text-right font-semibold w-12">PCT</th>
                        <th className="pb-1.5 text-right font-semibold w-10">GB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {div.teamRecords.map((row, i) => {
                        const isSelected = row.team.id === selectedTeamId

                        return (
                        <tr
                          key={row.team.id}
                          className={`border-b border-gray-50 last:border-0 ${
                            isSelected
                              ? "border-l-4 border-l-green-900 bg-green-50"
                              : ""
                          }`}
                        >
                          <td className="py-1.5 pr-2">
                            <div className="flex items-center gap-1.5">
                              <img
                                src={`https://www.mlbstatic.com/team-logos/${row.team.id}.svg`}
                                alt=""
                                className="h-5 w-5 shrink-0 object-contain"
                              />
                              <Link
                                to={`/mlb/teams/${row.team.id}`}
                                className={`font-medium hover:underline ${
                                  isSelected || i === 0 ? "text-green-900" : "text-gray-700"
                                }`}
                              >
                                {row.team.name}
                              </Link>
                            </div>
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-gray-700">{row.wins}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-700">{row.losses}</td>
                          <td className="py-1.5 text-right tabular-nums text-gray-500">
                            {row.winningPercentage}
                          </td>
                          <td className="py-1.5 text-right tabular-nums text-gray-400">
                            {i === 0 ? "—" : row.gamesBack}
                          </td>
                        </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
