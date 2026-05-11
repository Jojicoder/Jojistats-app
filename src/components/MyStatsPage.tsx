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

function getStatCardStyle(label: string, value: string, gamesPlayed: number) {
  if (gamesPlayed === 0) return { bg: "bg-[#f7f8f3]", label: "text-gray-400", value: "text-green-950" }

  const levels: Record<string, { thresholds: number[]; styles: string[] }> = {
    AVG:  { thresholds: [0.33, 0.3, 0.25, 0.22], styles: ["emerald", "green", "neutral", "rose", "red"] },
    OBP:  { thresholds: [0.4,  0.37, 0.31, 0.28], styles: ["emerald", "green", "neutral", "rose", "red"] },
    OPS:  { thresholds: [0.9,  0.8,  0.65, 0.55], styles: ["emerald", "green", "neutral", "rose", "red"] },
    "BB/K": { thresholds: [1.0, 0.7, 0.4, 0.2],  styles: ["emerald", "green", "neutral", "rose", "red"] },
    HR:   { thresholds: [4, 2],                   styles: ["emerald", "green", "neutral"] },
    RBI:  { thresholds: [10, 7],                  styles: ["emerald", "green", "neutral"] },
  }

  const map: Record<string, { bg: string; label: string; value: string }> = {
    emerald: { bg: "bg-emerald-50",  label: "text-emerald-700", value: "text-emerald-900" },
    green:   { bg: "bg-green-50",    label: "text-green-700",   value: "text-green-900"   },
    neutral: { bg: "bg-[#f7f8f3]",   label: "text-gray-400",    value: "text-green-950"   },
    rose:    { bg: "bg-rose-50",      label: "text-rose-600",    value: "text-rose-900"    },
    red:     { bg: "bg-red-50",       label: "text-red-600",     value: "text-red-900"     },
  }

  const cfg = levels[label]
  if (!cfg) return map.neutral

  if (label === "BB/K" && (value === "--" || Number.isNaN(Number(value)))) return map.neutral

  const num = Number(value)
  const idx = cfg.thresholds.findIndex((t) => num >= t)
  const styleName = idx === -1 ? cfg.styles[cfg.styles.length - 1] : cfg.styles[idx]
  return map[styleName] ?? map.neutral
}

function formatRate(value: number) { return value.toFixed(3).replace("0.", ".") }
function formatRatio(value: number) { return value.toFixed(2) }

function buildBattingStats(entry: SavedBattingGameEntry): DisplayStat[] {
  const { statLine } = entry
  const singles = Math.max(statLine.H - statLine.doubles - statLine.triples - statLine.HR, 0)
  const totalBases = singles + statLine.doubles * 2 + statLine.triples * 3 + statLine.HR * 4
  const hbp = statLine.HBP ?? 0
  const sf = statLine.SF ?? 0
  const obpDenominator = statLine.AB + statLine.BB + hbp + sf
  const avg = statLine.AB > 0 ? statLine.H / statLine.AB : 0
  const obp = obpDenominator > 0 ? (statLine.H + statLine.BB + hbp) / obpDenominator : 0
  const slg = statLine.AB > 0 ? totalBases / statLine.AB : 0
  const bbPerK = statLine.SO > 0 ? formatRatio(statLine.BB / statLine.SO) : "--"
  return [
    { label: "AVG",  value: formatRate(avg) },
    { label: "OBP",  value: formatRate(obp) },
    { label: "OPS",  value: formatRate(obp + slg) },
    { label: "BB/K", value: bbPerK },
    { label: "HR",   value: String(statLine.HR) },
    { label: "RBI",  value: String(statLine.RBI) },
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
      <div className="max-w-6xl space-y-5">

        {/* ── Player Header ── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Stats</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
            {activePlayer.jerseyNumber != null
              ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
              : activePlayer.name}
          </h1>
          <p className="mt-0.5 text-sm text-gray-400">{activePlayer.position}</p>

          {selectedEntry && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-green-900">
                Showing {selectedEntry.gameMeta.date} vs {selectedEntry.gameMeta.opponent}
              </p>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games Played</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{displayedGamesPlayed}</p>
            </div>
            <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Plate Apps</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{totalPlateAppearances}</p>
              <p className="mt-0.5 text-xs text-gray-400">AB + BB + HBP + SF</p>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {displayedStats.map((stat) => {
            const style = getStatCardStyle(stat.label, stat.value, displayedGamesPlayed)
            return (
              <div key={stat.label} className={`rounded-2xl p-4 shadow-sm ${style.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${style.label}`}>
                  {stat.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{statDescriptions[stat.label]}</p>
                <p className={`mt-3 text-3xl font-extrabold tracking-tight ${style.value}`}>
                  {stat.value}
                </p>
              </div>
            )
          })}
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
