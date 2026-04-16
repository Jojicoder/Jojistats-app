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

const statDescriptions: Record<string, string> = {
  AVG: "Batting Average",
  OBP: "On-base Percentage",
  OPS: "On-base Plus Slugging",
  "BB/K": "Walks per Strikeout",
  HR: "Home Runs",
  RBI: "Runs Batted In",
}

function getStatCardClass(label: string, value: string, gamesPlayed: number) {
  const baseClass = "rounded-xl border p-4 shadow-sm"

  const strongGood = `${baseClass} border-emerald-300 bg-emerald-100`
  const good = `${baseClass} border-green-200 bg-green-50`
  const neutral = `${baseClass} border-gray-200 bg-white`
  const weak = `${baseClass} border-rose-200 bg-rose-50`
  const bad = `${baseClass} border-red-200 bg-red-50`

  if (gamesPlayed === 0) return neutral

  if (label === "AVG") {
    const numericValue = Number(value)
    if (numericValue >= 0.33) return strongGood
    if (numericValue >= 0.3) return good
    if (numericValue >= 0.25) return neutral
    if (numericValue >= 0.22) return weak
    return bad
  }

  if (label === "OBP") {
    const numericValue = Number(value)
    if (numericValue >= 0.4) return strongGood
    if (numericValue >= 0.37) return good
    if (numericValue >= 0.31) return neutral
    if (numericValue >= 0.28) return weak
    return bad
  }

  if (label === "OPS") {
    const numericValue = Number(value)
    if (numericValue >= 0.9) return strongGood
    if (numericValue >= 0.8) return good
    if (numericValue >= 0.65) return neutral
    if (numericValue >= 0.55) return weak
    return bad
  }

  if (label === "BB/K") {
    if (value === "--") return neutral

    const numericValue = Number(value)
    if (Number.isNaN(numericValue)) return neutral
    if (numericValue >= 1.0) return strongGood
    if (numericValue >= 0.7) return good
    if (numericValue >= 0.4) return neutral
    if (numericValue >= 0.2) return weak
    return bad
  }

  if (label === "HR") {
    const numericValue = Number(value)
    if (numericValue >= 4) return strongGood
    if (numericValue >= 2) return good
    return neutral
  }

  if (label === "RBI") {
    const numericValue = Number(value)
    if (numericValue >= 10) return strongGood
    if (numericValue >= 7) return good
    return neutral
  }

  return neutral
}

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  savedEntries,
  teamSavedEntries,
  gamesPlayed,
  seasonYear,
}: MyStatsPageProps) {
  const totalPlateAppearances = savedEntries.reduce(
    (total, entry) => total + entry.statLine.AB + entry.statLine.BB,
    0
  )

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

          <p className="mt-3 text-gray-600">{activePlayer.position}</p>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Games Played
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {gamesPlayed}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Plate Appearances
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalPlateAppearances}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PA = AB + BB
              </p>
            </div>
          </div>
        </div>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {calculatedStats.map((stat) => (
            <div
              key={stat.label}
              className={getStatCardClass(stat.label, stat.value, gamesPlayed)}
            >
              <div>
                <p className="text-xs font-semibold text-gray-700">
                  {stat.label}
                </p>
                <p className="text-[11px] text-gray-400">
                  {statDescriptions[stat.label]}
                </p>
              </div>

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
