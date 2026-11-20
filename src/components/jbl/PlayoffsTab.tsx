import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getJblData, JBL_SEASON_ROOT, type JblStandingLeague } from "../../api/jbl"
import { buildBracket, seedPlayoffTeams, seedsFromPlayoffs, type BracketSeries, type BracketSlot, type PlayoffsJson } from "./playoffs"
import { teamBadge, teamColors } from "./teamTheme"

function SlotRow({
  slot,
  wins,
  isWinner,
  isLoser,
}: {
  slot: BracketSlot
  wins: number
  isWinner: boolean
  isLoser: boolean
}) {
  if (slot.kind === "tbd") {
    return (
      <div className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-300">
        <span className="w-5 text-center font-mono text-xs">–</span>
        <span className="italic">{slot.label}</span>
      </div>
    )
  }
  const c = teamColors(slot.team.name)
  return (
    <div
      className={`flex items-center gap-3 px-3 py-2.5 ${isWinner ? "bg-green-50" : ""} ${isLoser ? "opacity-45" : ""}`}
    >
      <span className="w-5 text-center font-mono text-xs font-bold text-gray-400">{slot.seed}</span>
      {teamBadge(slot.team.name, "md")}
      <Link
        to={`/jbl/teams/${slot.team.id}`}
        className="min-w-0 flex-1 truncate text-sm font-bold hover:underline"
        style={{ color: c.primary }}
      >
        {slot.team.name}
      </Link>
      <span className={`font-mono text-sm ${isWinner ? "font-black text-green-900" : "text-gray-500"}`}>{wins}</span>
    </div>
  )
}

function SeriesCard({ series }: { series: BracketSeries }) {
  const played = series.wins.top + series.wins.bottom > 0 || series.winner !== null
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
        <span>Best of {series.bestOf}</span>
        <span>{series.winner ? "Final" : played ? "In progress" : "Not played"}</span>
      </div>
      <SlotRow
        slot={series.top}
        wins={series.wins.top}
        isWinner={series.winner === "top"}
        isLoser={series.winner === "bottom"}
      />
      <div className="border-t border-gray-50" />
      <SlotRow
        slot={series.bottom}
        wins={series.wins.bottom}
        isWinner={series.winner === "bottom"}
        isLoser={series.winner === "top"}
      />
      {series.games.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-gray-100 px-3 py-2">
          {series.games.map((gameId, index) => (
            <Link
              key={gameId}
              to={`/jbl/games/${gameId}`}
              className="rounded bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
            >
              G{index + 1}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

async function loadPlayoffs(): Promise<PlayoffsJson | null> {
  try {
    const response = await fetch(`${JBL_SEASON_ROOT}/playoffs.json`)
    if (!response.ok) return null
    const type = response.headers.get("content-type") ?? ""
    // Vite dev/preview falls back to index.html for unknown paths.
    if (!type.includes("json")) return null
    return (await response.json()) as PlayoffsJson
  } catch {
    return null
  }
}

export default function PlayoffsTab() {
  const [standings, setStandings] = useState<JblStandingLeague[] | null>(null)
  const [playoffs, setPlayoffs] = useState<PlayoffsJson | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    Promise.all([getJblData(), loadPlayoffs()])
      .then(([data, results]) => {
        if (cancelled) return
        setStandings(data.standings)
        setPlayoffs(results)
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load JBL playoff data.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const bracket = useMemo(() => {
    if (!standings) return null
    const seeds = (playoffs && seedsFromPlayoffs(playoffs, standings)) ?? seedPlayoffTeams(standings)
    return buildBracket(seeds, playoffs)
  }, [standings, playoffs])

  if (error) return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
  if (!bracket) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (bracket.seeds.length < 6) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        The playoff field is not set yet. It is 3 division winners plus 3 wild cards.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">Postseason</h2>
        <p className="mt-1 text-sm text-gray-500">
          3 division winners and 3 wild cards. Seeds 1–2 get a first-round bye.
        </p>
        {bracket.champion && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            {teamBadge(bracket.champion.name, "xl")}
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">Champion</div>
              <div className="font-black text-gray-900">{bracket.champion.name}</div>
            </div>
          </div>
        )}
        {!playoffs && (
          <p className="mt-3 text-xs text-gray-400">
            Series results have not been published yet. Seeds are based on the regular-season standings.
          </p>
        )}
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        {bracket.rounds.map((round) => (
          <div key={round.name} className="flex flex-col gap-4">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{round.name}</h3>
            {/* Cards are centred between the column's top and bottom, independent of the heading. */}
            <div className="flex flex-1 flex-col justify-around gap-4">
              {round.series.map((series) => (
                <SeriesCard key={series.id} series={series} />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="px-4 py-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-green-900">Seeds</h3>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {bracket.seeds.map(({ seed, team }) => (
              <tr key={team.name} className="border-t border-gray-50">
                <td className="w-10 px-4 py-2.5 font-mono text-xs font-bold text-gray-400">{seed}</td>
                <td className="py-2.5">
                  <div className="flex items-center gap-3">
                    {teamBadge(team.name, "md")}
                    <span className="font-bold" style={{ color: teamColors(team.name).primary }}>{team.name}</span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-xs text-gray-400">{team.league} · {seed <= 3 ? "Division winner" : "Wild card"}</td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-600">
                  {team.wins}-{team.losses}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
