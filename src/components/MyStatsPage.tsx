import type {
  DisplayStat,
  Player,
  SavedBattingGameEntry,
} from "../types"
import SavedEntriesList from "./SavedEntriesList"
import PerformanceTrendCard from "./PerformanceTrendCard"

type MyStatsPageProps = {
  activePlayer: Player
  calculatedStats: DisplayStat[]
  savedEntries: SavedBattingGameEntry[]
  teamSavedEntries: SavedBattingGameEntry[]
  gamesPlayed: number
  seasonYear: number
}

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  savedEntries,
  teamSavedEntries,
  gamesPlayed,
  seasonYear,
}: MyStatsPageProps) {
  return (
    <main className="w-full">
      <div className="max-w-6xl space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">My Stats</p>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {activePlayer.jerseyNumber != null
              ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
              : activePlayer.name}
          </h1>

          <p className="mt-3 text-gray-600">
            {activePlayer.position} · Games Played {gamesPlayed}
          </p>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {calculatedStats.map((stat) => (
            <div
              key={stat.label}
              className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-medium text-gray-500">
                {stat.label}
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <PerformanceTrendCard
          playerEntries={savedEntries}
          teamEntries={teamSavedEntries}
          seasonYear={seasonYear}
        />

        <SavedEntriesList
          savedEntries={savedEntries.slice().reverse()}
          title="All Saved Games"
          emptyMessage="No games recorded yet."
        />
      </div>
    </main>
  )
}