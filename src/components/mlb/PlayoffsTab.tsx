import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getPostseason, MLB_SEASON, type PostseasonSeries, type PostseasonTeam } from "../../api/mlb"

const ROUNDS: { key: PostseasonSeries["round"]; name: string }[] = [
  { key: "F", name: "Wild Card Series" },
  { key: "D", name: "Division Series" },
  { key: "L", name: "Championship Series" },
]

const logo = (id: number) => `https://www.mlbstatic.com/team-logos/${id}.svg`

function TeamRow({ team, won, decided }: { team: PostseasonTeam; won: boolean; decided: boolean }) {
  return (
    <div className={`flex items-center gap-2 px-3 py-2 ${won ? "bg-green-50" : ""}`}>
      <img src={logo(team.id)} alt="" className={`h-6 w-6 object-contain ${decided && !won ? "opacity-40" : ""}`} />
      <span className={`min-w-0 flex-1 truncate text-sm ${won ? "font-black text-gray-900" : decided ? "text-gray-400" : "font-semibold text-gray-700"}`}>
        {team.name}
      </span>
      <span className={`font-mono text-sm font-black tabular-nums ${won ? "text-green-800" : "text-gray-400"}`}>{team.wins}</span>
    </div>
  )
}

function SeriesCard({ series, teamsById }: { series: PostseasonSeries; teamsById: Map<number, string> }) {
  const decided = series.winnerId !== null
  return (
    <div className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-black/5">
      {series.teams.map((team) => (
        <TeamRow key={team.id} team={team} won={team.isWinner} decided={decided} />
      ))}
      <div className="flex flex-wrap gap-1 border-t border-gray-100 px-3 py-2">
        {series.games.map((game) => {
          const label =
            game.final && game.awayScore !== null && game.homeScore !== null
              ? `G${game.gameNumber} ${teamsById.get(game.awayId)?.split(" ").pop()} ${game.awayScore}-${game.homeScore}`
              : `G${game.gameNumber}`
          return game.final ? (
            <Link
              key={game.gamePk}
              to={`/mlb/games/${game.gamePk}`}
              className="rounded-full bg-gray-100 px-2 py-0.5 text-[11px] font-semibold text-gray-600 hover:bg-gray-200"
            >
              {label}
            </Link>
          ) : (
            <span key={game.gamePk} className="rounded-full bg-gray-50 px-2 py-0.5 text-[11px] text-gray-400">
              {label}
            </span>
          )
        })}
      </div>
      <div className="bg-gray-50 px-3 py-1 text-right text-[10px] font-bold uppercase tracking-wider text-gray-400">
        Best of {series.bestOf}
      </div>
    </div>
  )
}

export default function PlayoffsTab() {
  const [season, setSeason] = useState(MLB_SEASON)
  const [series, setSeries] = useState<PostseasonSeries[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setSeries(null)
    getPostseason(season)
      .then(async (found) => {
        // Early in a new year there is no postseason yet: show last year's instead.
        if (found.length === 0 && season === MLB_SEASON) {
          const previous = await getPostseason(season - 1)
          if (!cancelled && previous.length > 0) {
            setSeason(season - 1)
            return
          }
        }
        if (!cancelled) setSeries(found)
      })
      .catch(() => !cancelled && setError("Failed to load the MLB postseason."))
    return () => {
      cancelled = true
    }
  }, [season])

  if (error) return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
  if (!series) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (series.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        The {season} postseason has not started yet.
      </div>
    )
  }

  const teamsById = new Map(series.flatMap((s) => s.teams.map((t) => [t.id, t.name] as const)))
  const worldSeries = series.find((s) => s.round === "W")
  const champion = worldSeries?.teams.find((t) => t.isWinner)

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">{season} MLB Postseason</h2>
        {champion && (
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-200">
            <img src={logo(champion.id)} alt="" className="h-10 w-10 object-contain" />
            <div>
              <div className="text-[10px] font-black uppercase tracking-widest text-amber-700">World Series champion</div>
              <div className="font-black text-gray-900">{champion.name}</div>
            </div>
          </div>
        )}
        <div className="mt-3 flex gap-2">
          {[MLB_SEASON, MLB_SEASON - 1].map((year) => (
            <button
              key={year}
              onClick={() => setSeason(year)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${year === season ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {(["AL", "NL"] as const).map((league) => (
        <section key={league} className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">
            {league === "AL" ? "American League" : "National League"}
          </h3>
          <div className="grid gap-5 md:grid-cols-3">
            {ROUNDS.map((round) => (
              <div key={round.key} className="flex flex-col gap-2">
                <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400">{round.name}</div>
                <div className="flex flex-1 flex-col justify-around gap-3">
                  {series
                    .filter((s) => s.round === round.key && s.league === league)
                    .map((s) => (
                      <SeriesCard key={s.id} series={s} teamsById={teamsById} />
                    ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}

      {worldSeries && (
        <section className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">World Series</h3>
          <div className="md:w-1/3">
            <SeriesCard series={worldSeries} teamsById={teamsById} />
          </div>
        </section>
      )}
    </div>
  )
}
