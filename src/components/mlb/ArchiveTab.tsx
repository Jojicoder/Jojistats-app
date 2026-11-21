import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getAwards, getPostseason, getStandings, MLB_SEASON, type AwardWinner, type PostseasonSeries } from "../../api/mlb"
import type { DivisionRecord } from "./types"

const FIRST_SEASON = 2015
const ROUND_NAMES: Record<PostseasonSeries["round"], string> = {
  F: "Wild Card",
  D: "Division Series",
  L: "Championship Series",
  W: "World Series",
}
const ROUND_ORDER: PostseasonSeries["round"][] = ["F", "D", "L", "W"]

const logo = (id: number) => `https://www.mlbstatic.com/team-logos/${id}.svg`

type Archive = { standings: DivisionRecord[]; series: PostseasonSeries[]; awards: AwardWinner[] }

export default function ArchiveTab() {
  const years = Array.from({ length: MLB_SEASON - FIRST_SEASON + 1 }, (_, i) => MLB_SEASON - i)
  const [season, setSeason] = useState(MLB_SEASON - 1)
  const [data, setData] = useState<Archive | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError("")
    Promise.all([getStandings(season), getPostseason(season), getAwards(season)])
      .then(([standings, series, awards]) => !cancelled && setData({ standings, series, awards }))
      .catch(() => !cancelled && setError(`Failed to load the ${season} season.`))
    return () => {
      cancelled = true
    }
  }, [season])

  const worldSeries = data?.series.find((s) => s.round === "W")
  const champion = worldSeries?.teams.find((t) => t.isWinner)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">MLB Season Archive</h2>
        <select
          value={season}
          onChange={(e) => setSeason(Number(e.target.value))}
          className="mt-3 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-bold text-gray-700"
          aria-label="Season"
        >
          {years.map((year) => (
            <option key={year} value={year}>{year}</option>
          ))}
        </select>
      </div>

      {error && <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>}
      {!error && !data && <div className="p-4 text-sm text-gray-500">Loading...</div>}

      {data && (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <h3 className="text-lg font-black text-gray-900">{season} Season</h3>
            {champion ? (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                <img src={logo(champion.id)} alt="" className="h-10 w-10 object-contain" />
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">World Series champion</div>
                  <div className="font-black text-gray-900">{champion.name}</div>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm text-gray-500">No World Series result for this season.</p>
            )}
          </div>

          {data.awards.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Awards</h3>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {data.awards.map((award) => (
                  <div key={award.id} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                    <img
                      src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_96,q_auto:best/v1/people/${award.personId}/headshot/67/current`}
                      alt=""
                      className="h-12 w-12 rounded-full bg-gray-200 object-cover"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-widest text-gray-400">{award.name}</div>
                      <div className="truncate text-sm font-black text-gray-900">{award.player}</div>
                    </div>
                    {award.teamId && <img src={logo(award.teamId)} alt="" className="h-7 w-7 object-contain" />}
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.series.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Postseason</h3>
              <div className="mt-3 space-y-4">
                {ROUND_ORDER.map((round) => {
                  const list = data.series.filter((s) => s.round === round)
                  if (list.length === 0) return null
                  return (
                    <div key={round}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{ROUND_NAMES[round]}</div>
                      <ul className="mt-1 divide-y divide-gray-100">
                        {list.map((s) => {
                          const winner = s.teams.find((t) => t.isWinner)
                          const loser = s.teams.find((t) => !t.isWinner)
                          const last = [...s.games].reverse().find((g) => g.final)
                          return (
                            <li key={s.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-sm">
                              {winner && loser ? (
                                <>
                                  <img src={logo(winner.id)} alt="" className="h-6 w-6 object-contain" />
                                  <span className="font-bold text-gray-900">{winner.name}</span>
                                  <span className="font-mono text-xs text-gray-500">{winner.wins}-{loser.wins}</span>
                                  <span className="text-gray-400">over {loser.name}</span>
                                  {last && (
                                    <Link to={`/mlb/games/${last.gamePk}`} className="ml-auto text-xs font-semibold text-green-800 hover:underline">
                                      Final game
                                    </Link>
                                  )}
                                </>
                              ) : (
                                <span className="text-gray-400">{s.teams[0].name} vs {s.teams[1].name}</span>
                              )}
                            </li>
                          )
                        })}
                      </ul>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            {data.standings.map((division) => (
              <div key={division.name} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-green-900">{division.name}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-4 py-1 text-left">Team</th>
                      <th className="px-2 py-1 text-right">W</th>
                      <th className="px-2 py-1 text-right">L</th>
                      <th className="px-2 py-1 text-right">PCT</th>
                      <th className="px-4 py-1 text-right">GB</th>
                    </tr>
                  </thead>
                  <tbody>
                    {division.teamRecords.map((row) => (
                      <tr key={row.team.id} className="border-t border-gray-50">
                        <td className="px-4 py-2">
                          <Link to={`/mlb/teams/${row.team.id}`} className="flex items-center gap-2 font-semibold text-gray-800 hover:underline">
                            <img src={logo(row.team.id)} alt="" className="h-6 w-6 object-contain" />
                            {row.team.name}
                          </Link>
                        </td>
                        <td className="px-2 py-2 text-right font-mono">{row.wins}</td>
                        <td className="px-2 py-2 text-right font-mono">{row.losses}</td>
                        <td className="px-2 py-2 text-right font-mono">{row.winningPercentage}</td>
                        <td className="px-4 py-2 text-right font-mono text-gray-500">{row.gamesBack}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
