import type {
  DisplayStat,
  Player,
  SavedBattingGameEntry,
  TrendPoint,
} from "../types"
import StatCard from "./StatCard"
import AvgTrendCard from "./AvgTrendCard"
import SavedEntriesList from "./SavedEntriesList"

type MyStatsPageProps = {
  activePlayer: Player
  calculatedStats: DisplayStat[]
  avgTrend: TrendPoint[]
  savedEntries: SavedBattingGameEntry[]
  gamesPlayed: number
}

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  avgTrend,
  savedEntries,
  gamesPlayed,
}: MyStatsPageProps) {
  return (
  <main className="w-full">
    <div className="max-w-6xl space-y-6">
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">My Stats</p>
        <h1 className="mt-3 text-2xl font-bold">
          {activePlayer.jerseyNumber != null
            ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
            : activePlayer.name}
        </h1>
        <p className="mt-3 text-gray-600">
          {activePlayer.position} · Games Played {gamesPlayed}
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {calculatedStats.map((stat) => (
          <StatCard key={stat.label} stat={stat} />
        ))}
      </section>

      <AvgTrendCard avgTrend={avgTrend} />

      <SavedEntriesList
        savedEntries={savedEntries.slice().reverse()}
        title="All Saved Games"
        emptyMessage="No games recorded yet."
      />
    </div>
  </main>
)
}
