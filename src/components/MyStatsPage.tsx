import type {
  DisplayStat,
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import { useMemo, useState } from "react"
import SavedEntriesList from "./SavedEntriesList"
import PerformanceTrendCard from "./PerformanceTrendCard"

type MyStatsPageProps = {
  activePlayer: Player
  calculatedStats: DisplayStat[]
  savedEntries: SavedBattingGameEntry[]
  pitchingEntries?: SavedPitchingGameEntry[]
  teamSavedEntries: SavedBattingGameEntry[]
  gamesPlayed: number
  seasonYear: number
}

const statDescriptions: Record<string, string> = {
  AVG: "Batting Average",
  OBP: "On-base Percentage",
  OPS: "On-base Plus Slugging",
  "BB/K": "Walks / Strikeouts",
  HR: "Home Runs",
  RBI: "Runs Batted In",
  HBP: "Hit By Pitch",
}

function getStatCardClass(label: string, value: string, gamesPlayed: number) {
  const baseClass = "rounded-xl border p-3 shadow-sm sm:p-4"

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

function formatRate(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

function formatRatio(value: number) {
  return value.toFixed(2)
}

function buildBattingStats(entry: SavedBattingGameEntry): DisplayStat[] {
  const { statLine } = entry
  const singles = Math.max(
    statLine.H - statLine.doubles - statLine.triples - statLine.HR,
    0
  )
  const totalBases =
    singles + statLine.doubles * 2 + statLine.triples * 3 + statLine.HR * 4
  const hbp = statLine.HBP ?? 0
  const sf = statLine.SF ?? 0
  const obpDenominator = statLine.AB + statLine.BB + hbp + sf
  const avg = statLine.AB > 0 ? statLine.H / statLine.AB : 0
  const obp =
    obpDenominator > 0
      ? (statLine.H + statLine.BB + hbp) / obpDenominator
      : 0
  const slg = statLine.AB > 0 ? totalBases / statLine.AB : 0
  const bbPerK =
    statLine.SO > 0 ? formatRatio(statLine.BB / statLine.SO) : "--"

  return [
    { label: "AVG", value: formatRate(avg) },
    { label: "OBP", value: formatRate(obp) },
    { label: "OPS", value: formatRate(obp + slg) },
    { label: "BB/K", value: bbPerK },
    { label: "HR", value: String(statLine.HR) },
    { label: "RBI", value: String(statLine.RBI) },
  ]
}

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  savedEntries,
  teamSavedEntries,
  gamesPlayed,
  seasonYear,
}: MyStatsPageProps) {
  const [selectedEntry, setSelectedEntry] = useState<SavedBattingGameEntry | null>(null)
  const displayedStats = useMemo(
    () => (selectedEntry ? buildBattingStats(selectedEntry) : calculatedStats),
    [calculatedStats, selectedEntry]
  )

  const displayedEntries = selectedEntry ? [selectedEntry] : savedEntries
  const displayedGamesPlayed = selectedEntry ? 1 : gamesPlayed
  const totalPlateAppearances = displayedEntries.reduce(
    (total, entry) =>
      total +
      entry.statLine.AB +
      entry.statLine.BB +
      (entry.statLine.HBP ?? 0) +
      (entry.statLine.SF ?? 0),
    0
  )

  return (
    <main className="w-full">
      <div className="max-w-6xl space-y-4 sm:space-y-6">
        <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <p className="text-sm font-medium text-green-900">My Stats</p>

          <h1 className="mt-2 text-xl font-bold text-gray-900 sm:mt-3 sm:text-2xl">
            {activePlayer.jerseyNumber != null
              ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
              : activePlayer.name}
          </h1>

          <p className="mt-2 text-sm text-gray-600 sm:mt-3 sm:text-base">{activePlayer.position}</p>
          {selectedEntry && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-100 bg-green-50 px-3 py-2">
              <p className="text-sm font-semibold text-green-900">
                Showing {selectedEntry.gameMeta.date} vs {selectedEntry.gameMeta.opponent}
              </p>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 shadow-sm"
              >
                Clear
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Games Played
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {displayedGamesPlayed}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Plate Apps
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {totalPlateAppearances}
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PA = AB + BB + HBP + SF
              </p>
            </div>
          </div>
        </div>

        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          {displayedStats.map((stat) => (
            <div
              key={stat.label}
              className={getStatCardClass(stat.label, stat.value, displayedGamesPlayed)}
            >
              <div>
                <p className="text-xs font-semibold text-gray-700">
                  {stat.label}
                </p>
                <p className="text-[11px] text-gray-400">
                  {statDescriptions[stat.label]}
                </p>
              </div>

              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {stat.value}
              </p>
            </div>
          ))}
        </section>

        <PerformanceTrendCard
          playerEntries={displayedEntries}
          teamEntries={teamSavedEntries}
          seasonYear={seasonYear}
        />

        <SavedEntriesList
          savedEntries={savedEntries.slice().reverse()}
          title="All Saved Games"
          emptyMessage="No games recorded yet."
          onSelect={setSelectedEntry}
        />
      </div>
    </main>
  )
}
