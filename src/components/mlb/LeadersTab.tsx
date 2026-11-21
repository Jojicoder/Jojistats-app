import { useEffect, useState } from "react"
import { getLeaders, MLB_SEASON, type LeaderCategory } from "../../api/mlb"

const LABELS: Record<string, string> = {
  homeRuns: "Home runs",
  battingAverage: "Batting average",
  runsBattedIn: "RBI",
  stolenBases: "Stolen bases",
  hits: "Hits",
  onBasePlusSlugging: "OPS",
  earnedRunAverage: "ERA",
  strikeouts: "Strikeouts",
  wins: "Wins",
  saves: "Saves",
  walksAndHitsPerInningPitched: "WHIP",
  inningsPitched: "Innings pitched",
}

const logo = (id: number) => `https://www.mlbstatic.com/team-logos/${id}.svg`
const headshot = (id: number) =>
  `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_96,q_auto:best/v1/people/${id}/headshot/67/current`

function LeaderCard({ category }: { category: LeaderCategory }) {
  const [top, ...rest] = category.entries
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 pt-3 text-[10px] font-black uppercase tracking-widest text-green-900">
        {LABELS[category.key] ?? category.key}
      </div>
      <div className="flex items-center gap-3 px-4 py-3">
        <img src={headshot(top.personId)} alt="" className="h-14 w-14 rounded-full bg-gray-100 object-cover" loading="lazy" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-gray-900">{top.name}</div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <img src={logo(top.teamId)} alt="" className="h-4 w-4 object-contain" />
            <span className="truncate">{top.team}</span>
          </div>
        </div>
        <div className="text-3xl font-black tabular-nums text-gray-900">{top.value}</div>
      </div>
      <ul className="border-t border-gray-100">
        {rest.map((entry) => (
          <li key={entry.personId} className="flex items-center gap-2 px-4 py-1.5 text-xs">
            <span className="w-4 text-gray-400">{entry.rank}</span>
            <img src={logo(entry.teamId)} alt="" className="h-4 w-4 object-contain" />
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">{entry.name}</span>
            <span className="font-mono tabular-nums text-gray-600">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function LeadersTab() {
  const [season, setSeason] = useState(MLB_SEASON)
  const [data, setData] = useState<{ hitting: LeaderCategory[]; pitching: LeaderCategory[] } | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false
    setData(null)
    setError("")
    Promise.all([getLeaders(season, "hitting"), getLeaders(season, "pitching")])
      .then(([hitting, pitching]) => {
        if (cancelled) return
        // Early in a new year nothing has been played: fall back to last season.
        if (hitting.length === 0 && pitching.length === 0 && season === MLB_SEASON) {
          setSeason(season - 1)
          return
        }
        setData({ hitting, pitching })
      })
      .catch(() => !cancelled && setError("Failed to load the league leaders."))
    return () => {
      cancelled = true
    }
  }, [season])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">{season} MLB League Leaders</h2>
        <div className="flex gap-2">
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

      {error && <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>}
      {!error && !data && <div className="p-4 text-sm text-gray-500">Loading...</div>}

      {data &&
        ([
          ["Batting", data.hitting],
          ["Pitching", data.pitching],
        ] as const).map(([title, categories]) => (
          <section key={title} className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{title}</h3>
            {categories.length === 0 ? (
              <p className="text-sm text-gray-500">No data yet.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {categories.map((category) => (
                  <LeaderCard key={category.key} category={category} />
                ))}
              </div>
            )}
          </section>
        ))}
    </div>
  )
}
