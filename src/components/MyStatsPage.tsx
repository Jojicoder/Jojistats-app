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

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  savedEntries,
  pitchingEntries = [],
  teamSavedEntries,
  gamesPlayed,
  seasonYear,
}: MyStatsPageProps) {
  const [selectedEntry, setSelectedEntry] = useState<SavedBattingGameEntry | null>(null)
  const selectedPitchingEntry = useMemo(() => {
    if (!selectedEntry) return null
    return (
      pitchingEntries.find((entry) => entry.gameId === selectedEntry.gameId) ??
      pitchingEntries.find(
        (entry) =>
          entry.gameMeta.date === selectedEntry.gameMeta.date &&
          entry.gameMeta.matchNumber === selectedEntry.gameMeta.matchNumber &&
          entry.gameMeta.opponent === selectedEntry.gameMeta.opponent
      ) ??
      null
    )
  }, [pitchingEntries, selectedEntry])

  const totalPlateAppearances = savedEntries.reduce(
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

          <div className="mt-4 grid grid-cols-2 gap-3 sm:mt-5 sm:gap-4">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 sm:px-4 sm:py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Games Played
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {gamesPlayed}
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

              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
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
          onSelect={setSelectedEntry}
        />

        {selectedEntry && (
          <GamePerformanceDetail
            battingEntry={selectedEntry}
            pitchingEntry={selectedPitchingEntry}
            onClose={() => setSelectedEntry(null)}
          />
        )}
      </div>
    </main>
  )
}

function formatInnings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

function GamePerformanceDetail({
  battingEntry,
  pitchingEntry,
  onClose,
}: {
  battingEntry: SavedBattingGameEntry
  pitchingEntry: SavedPitchingGameEntry | null
  onClose: () => void
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Game Performance</h2>
          <p className="mt-1 text-sm text-gray-500">
            {battingEntry.gameMeta.date} vs {battingEntry.gameMeta.opponent}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-600"
        >
          Close
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Batting</p>
          <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-gray-600 sm:text-sm">
            <span className="rounded-full bg-gray-100 px-2 py-0.5">AB {battingEntry.statLine.AB}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">H {battingEntry.statLine.H}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">2B {battingEntry.statLine.doubles}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">3B {battingEntry.statLine.triples}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">HR {battingEntry.statLine.HR}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">RBI {battingEntry.statLine.RBI}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">BB {battingEntry.statLine.BB}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">HBP {battingEntry.statLine.HBP ?? 0}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">SF {battingEntry.statLine.SF ?? 0}</span>
            <span className="rounded-full bg-gray-100 px-2 py-0.5">SO {battingEntry.statLine.SO}</span>
          </div>
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Pitching</p>
          {pitchingEntry ? (
            <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-gray-600 sm:text-sm">
              <span className="rounded-full bg-gray-100 px-2 py-0.5">IP {formatInnings(pitchingEntry.statLine.inningsPitchedOuts)}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">H {pitchingEntry.statLine.hitsAllowed}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">R {pitchingEntry.statLine.runsAllowed}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">ER {pitchingEntry.statLine.earnedRuns}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">BB {pitchingEntry.statLine.walks}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">HBP {pitchingEntry.statLine.hitBatters}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">SO {pitchingEntry.statLine.strikeouts}</span>
              <span className="rounded-full bg-gray-100 px-2 py-0.5">HR {pitchingEntry.statLine.homeRunsAllowed}</span>
            </div>
          ) : (
            <p className="mt-3 text-sm text-gray-500">No pitching record for this game.</p>
          )}
        </div>
      </div>
    </section>
  )
}
