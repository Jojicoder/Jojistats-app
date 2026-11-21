import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getJblArchiveSeasons, getJblSeasonArchive, jblTeamSlug, type JblSeasonArchive, type JblTeam } from "../../api/jbl"
import type { PlayoffsJson } from "./playoffs"
import { teamBadge, teamColors } from "./teamTheme"

const ROUND_ORDER = ["Wild Card Series", "Division Series", "Championship Series"]

function TeamLink({ name, size = "md" }: { name: string; size?: "md" | "lg" | "xl" }) {
  return (
    <Link to={`/jbl/teams/${jblTeamSlug(name)}`} className="flex items-center gap-2 hover:underline">
      {teamBadge(name, size)}
      <span className="font-bold" style={{ color: teamColors(name).primary }}>{name}</span>
    </Link>
  )
}

function Highlight({ label, team, value }: { label: string; team: JblTeam; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-3">
      <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
      <div className="mt-1 text-sm"><TeamLink name={team.name} /></div>
      <p className="mt-0.5 text-xs text-gray-500">{value}</p>
    </div>
  )
}

export default function ArchiveTab() {
  const [seasons, setSeasons] = useState<number[] | null>(null)
  const [season, setSeason] = useState<number | null>(null)
  const [archive, setArchive] = useState<JblSeasonArchive | null>(null)

  useEffect(() => {
    getJblArchiveSeasons()
      .then((list) => {
        setSeasons(list)
        setSeason(list[0] ?? null)
      })
      .catch(() => setSeasons([]))
  }, [])

  useEffect(() => {
    if (season === null) return
    let cancelled = false
    setArchive(null)
    getJblSeasonArchive(season).then((result) => !cancelled && setArchive(result)).catch(() => {})
    return () => {
      cancelled = true
    }
  }, [season])

  const teams = useMemo(() => archive?.standings.flatMap((d) => d.teams).filter((t) => t.hasStats) ?? [], [archive])
  const playoffs = archive?.playoffs as PlayoffsJson | null

  if (seasons === null) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (seasons.length === 0) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">No seasons have been played yet.</div>
  }

  const complete = archive ? archive.playedGames >= archive.totalGames : false
  const best = (pick: (t: JblTeam) => number, dir: 1 | -1) =>
    [...teams].sort((a, b) => dir * (pick(b) - pick(a)))[0]
  const bestRecord = best((t) => t.pct, 1)
  const topOffense = best((t) => t.rs, 1)
  const topPitching = best((t) => t.ra, -1)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">Season Archive</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {seasons.map((year) => (
            <button
              key={year}
              onClick={() => setSeason(year)}
              className={`rounded-full px-4 py-1.5 text-sm font-bold ${year === season ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {!archive ? (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      ) : (
        <>
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-lg font-black text-gray-900">{archive.season} Season</h3>
              <span className="text-xs font-semibold text-gray-500">
                {complete ? "Final" : `In progress · ${archive.playedGames}/${archive.totalGames} games`}
              </span>
            </div>
            {playoffs?.champion && (
              <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
                {teamBadge(playoffs.champion, "xl")}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Champion</div>
                  <div className="font-black text-gray-900">{playoffs.champion}</div>
                </div>
              </div>
            )}
            {teams.length > 0 && (
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <Highlight label="Best record" team={bestRecord} value={`${bestRecord.wins}-${bestRecord.losses}`} />
                <Highlight label="Most runs scored" team={topOffense} value={`${topOffense.rs} runs`} />
                <Highlight label="Fewest runs allowed" team={topPitching} value={`${topPitching.ra} runs`} />
              </div>
            )}
          </div>

          {playoffs && playoffs.series.length > 0 && (
            <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
              <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">Postseason</h3>
              <div className="mt-3 space-y-4">
                {ROUND_ORDER.map((round) => {
                  const list = (playoffs.series as unknown as { id: string; round?: string; winner?: string; wins?: Record<string, number> }[]).filter(
                    (s) => s.round === round,
                  )
                  if (list.length === 0) return null
                  return (
                    <div key={round}>
                      <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{round}</div>
                      <ul className="mt-1 divide-y divide-gray-100">
                        {list.map((s) => {
                          const names = Object.keys(s.wins ?? {})
                          const loser = names.find((n) => n !== s.winner)
                          return (
                            <li key={s.id} className="flex flex-wrap items-center gap-x-3 py-2 text-sm">
                              {s.winner ? <TeamLink name={s.winner} /> : <span className="text-gray-400">TBD</span>}
                              <span className="font-mono text-xs text-gray-500">
                                {s.winner && s.wins ? `${s.wins[s.winner]}-${loser ? s.wins[loser] : 0}` : ""}
                              </span>
                              {loser && <span className="text-gray-400">over {loser}</span>}
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
            {archive.standings.map((division) => (
              <div key={division.name} className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="px-4 py-3 text-xs font-black uppercase tracking-widest text-green-900">{division.name}</div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      <th className="px-4 py-1 text-left">Team</th>
                      <th className="px-2 py-1 text-right">W</th>
                      <th className="px-2 py-1 text-right">L</th>
                      <th className="px-2 py-1 text-right">PCT</th>
                      <th className="px-4 py-1 text-right">DIFF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...division.teams]
                      .sort((a, b) => b.pct - a.pct || b.rs - b.ra - (a.rs - a.ra))
                      .map((team) => (
                        <tr key={team.id} className="border-t border-gray-50">
                          <td className="px-4 py-2"><TeamLink name={team.name} /></td>
                          <td className="px-2 py-2 text-right font-mono">{team.wins}</td>
                          <td className="px-2 py-2 text-right font-mono">{team.losses}</td>
                          <td className="px-2 py-2 text-right font-mono">{team.pct.toFixed(3).replace(/^0/, "")}</td>
                          <td className="px-4 py-2 text-right font-mono text-gray-500">{team.rs - team.ra > 0 ? "+" : ""}{team.rs - team.ra}</td>
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
