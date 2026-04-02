import StatCard from "./StatCard"
import AvgTrendCard from "./AvgTrendCard"
import SavedEntriesList from "./SavedEntriesList"
import type {
  Player,
  SavedBattingGameEntry,
  DisplayStat,
  TrendPoint,
} from "../types"

type MyStatsPageProps = {
  activePlayer: Player
  calculatedStats: DisplayStat[]
  avgTrend: TrendPoint[]
  savedEntries: SavedBattingGameEntry[]
  gamesPlayed: number
}

// My Stats page focuses on review and analysis.
// It shows cumulative batting KPIs, recent trend, and full saved history.
export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  avgTrend,
  savedEntries,
  gamesPlayed,
}: MyStatsPageProps) {
  const topStats: DisplayStat[] = [
    ...calculatedStats,
    { label: "GAMES", value: String(gamesPlayed) },
  ]

  return (
    <main className="flex-1 p-6 bg-gray-50">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">My Stats</p>
        <h1 className="text-2xl font-bold mt-2">
          {activePlayer.jerseyNumber != null
            ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
            : activePlayer.name}
        </h1>
        <p className="text-gray-600 mt-2">
          Position: {activePlayer.position}
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Games Played: {gamesPlayed}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Saved Records: {savedEntries.length}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mt-6">
        {topStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </div>

      <AvgTrendCard avgTrend={avgTrend} />

      <SavedEntriesList
        savedEntries={savedEntries}
        title="Game History"
        emptyMessage="No saved batting history yet. Record a game first."
      />
    </main>
  )
}