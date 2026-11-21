import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getWildCardStandings, MLB_SEASON, type WildCardLeague } from "../../api/mlb"

// Top 3 in each league make the playoffs as wild cards.
const WILD_CARD_SPOTS = 3

export default function WildCardTable({ selectedTeamId }: { selectedTeamId?: number | null }) {
  const [leagues, setLeagues] = useState<WildCardLeague[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getWildCardStandings()
      .then(setLeagues)
      .catch(() => setError("Failed to load the wild card standings."))
  }, [])

  if (error) return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
  if (!leagues) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (leagues.length === 0) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">No wild card standings for {MLB_SEASON} yet.</div>
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {leagues.map(({ league, rows }) => (
        <div key={league} className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">
            {league === "AL" ? "American League" : "National League"} wild card
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[300px] text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400">
                  <th className="w-6 pb-1.5 text-left font-semibold">#</th>
                  <th className="pb-1.5 text-left font-semibold">Team</th>
                  <th className="w-8 pb-1.5 text-right font-semibold">W</th>
                  <th className="w-8 pb-1.5 text-right font-semibold">L</th>
                  <th className="w-12 pb-1.5 text-right font-semibold">PCT</th>
                  <th className="w-12 pb-1.5 text-right font-semibold">WCGB</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const isSelected = row.teamId === selectedTeamId
                  const cutLine = row.rank === WILD_CARD_SPOTS
                  return (
                    <tr
                      key={row.teamId}
                      className={`border-b last:border-0 ${cutLine ? "border-gray-300" : "border-gray-50"} ${
                        isSelected ? "border-l-4 border-l-green-900 bg-green-50" : ""
                      }`}
                    >
                      <td className="py-1.5 text-gray-400">{row.rank}</td>
                      <td className="py-1.5 pr-2">
                        <div className="flex items-center gap-1.5">
                          <img src={`https://www.mlbstatic.com/team-logos/${row.teamId}.svg`} alt="" className="h-5 w-5 shrink-0 object-contain" />
                          <Link
                            to={`/mlb/teams/${row.teamId}`}
                            className={`font-medium hover:underline ${row.rank <= WILD_CARD_SPOTS ? "text-green-900" : "text-gray-600"}`}
                          >
                            {row.name}
                          </Link>
                        </div>
                      </td>
                      <td className="py-1.5 text-right tabular-nums text-gray-700">{row.wins}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-700">{row.losses}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-500">{row.pct}</td>
                      <td className="py-1.5 text-right tabular-nums text-gray-400">{row.gamesBack}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-gray-400">The line marks the last wild card spot. WCGB: games ahead (+) or behind the final spot.</p>
        </div>
      ))}
    </div>
  )
}
