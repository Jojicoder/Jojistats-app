import { useState } from "react"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"
import { usePitchingStats } from "../hooks/usePitchingStats"
import PitchingTrendChart from "./PitchingTrendChart"

type Props = {
  activePlayer: Player
  entries: SavedPitchingGameEntry[]
  battingEntries?: SavedBattingGameEntry[]
}

/* 説明 */
const statDescriptions: Record<string, string> = {
  IP: "Innings Pitched",
  ERA: "Earned Run Average",
  WHIP: "Walks + Hits per Inning",
  H: "Hits Allowed",
  R: "Runs Allowed",
  ER: "Earned Runs",
  BB: "Walks",
  HBP: "Hit Batters",
  SO: "Strikeouts",
  HR: "Home Runs Allowed",
}

export default function MyPitchingStatsPage({
  activePlayer,
  entries,
}: Props) {
  const [selectedEntry, setSelectedEntry] = useState<SavedPitchingGameEntry | null>(null)
  const displayedEntries = selectedEntry ? [selectedEntry] : entries
  const statLines = displayedEntries.map((e) => e.statLine)
  const stats = usePitchingStats(statLines)

  /* 🔥 登板数 */
  const gamesPlayed = displayedEntries.length

  return (
    <main className="w-full">
      <div className="max-w-6xl space-y-4 sm:space-y-6">

        {/* 🔥 上のカード（MyStatsと同じ構造） */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <p className="text-sm font-medium text-green-900">
            Pitching Stats
          </p>

          <h1 className="mt-2 text-xl font-bold text-gray-900 sm:mt-3 sm:text-2xl">
            {activePlayer.name}
          </h1>
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

          {/* 🔥 KPI上段 */}
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
                Innings
              </p>
              <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
                {stats.ip}
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 KPIカード */}
        <section className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-3">
          <Stat label="ERA" value={stats.era} gamesPlayed={gamesPlayed} />
          <Stat label="WHIP" value={stats.whip} gamesPlayed={gamesPlayed} />
          <Stat label="H" value={String(stats.h)} gamesPlayed={gamesPlayed} />
          <Stat label="R" value={String(stats.r)} gamesPlayed={gamesPlayed} />
          <Stat label="ER" value={String(stats.er)} gamesPlayed={gamesPlayed} />
          <Stat label="BB" value={String(stats.bb)} gamesPlayed={gamesPlayed} />
          <Stat label="HBP" value={String(stats.hbp)} gamesPlayed={gamesPlayed} />
          <Stat label="SO" value={String(stats.so)} gamesPlayed={gamesPlayed} />
          <Stat label="HR" value={String(stats.hr)} gamesPlayed={gamesPlayed} />
        </section>

        <PitchingTrendChart entries={displayedEntries} />

        <RecentPitchingGames entries={entries} onSelect={setSelectedEntry} />

      </div>
    </main>
  )
}

/* -------------------- カラーロジック -------------------- */

function getPitchingStatCardClass(label: string, value: string, gamesPlayed: number) {
  const base = "rounded-xl border p-3 shadow-sm sm:p-4"
  const strongGood = `${base} border-emerald-300 bg-emerald-100`
  const good = `${base} border-green-200 bg-green-50`
  const neutral = `${base} border-gray-200 bg-white`
  const weak = `${base} border-rose-200 bg-rose-50`
  const bad = `${base} border-red-200 bg-red-50`

  if (gamesPlayed === 0) return neutral

  const n = Number(value)

  if (label === "ERA") {
    if (Number.isNaN(n)) return neutral
    if (n <= 1.50) return strongGood
    if (n <= 2.50) return good
    if (n <= 4.50) return neutral
    if (n <= 6.00) return weak
    return bad
  }

  if (label === "WHIP") {
    if (Number.isNaN(n)) return neutral
    if (n <= 0.80) return strongGood
    if (n <= 1.10) return good
    if (n <= 1.50) return neutral
    if (n <= 2.00) return weak
    return bad
  }

  if (label === "SO") {
    if (n >= 30) return strongGood
    if (n >= 15) return good
    return neutral
  }

  return neutral
}

/* -------------------- カード -------------------- */

function Stat({ label, value, gamesPlayed }: { label: string; value: string; gamesPlayed: number }) {
  return (
    <div className={getPitchingStatCardClass(label, value, gamesPlayed)}>
      <div>
        <p className="text-xs font-semibold text-gray-700">
          {label}
        </p>
        <p className="text-[11px] text-gray-400">
          {statDescriptions[label]}
        </p>
      </div>

      <p className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">
        {value}
      </p>
    </div>
  )
}

/* -------------------- 最近の試合 -------------------- */

function RecentPitchingGames({
  entries,
  onSelect,
}: {
  entries: SavedPitchingGameEntry[]
  onSelect?: (entry: SavedPitchingGameEntry) => void
}) {
  if (!entries.length) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
        <p className="text-gray-500">No pitching records yet.</p>
      </div>
    )
  }

  const sorted = [...entries].reverse().slice(0, 5)

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Recent Games
      </h2>

      <div className="mt-4 space-y-3">
        {sorted.map((entry) => (
          <button
            type="button"
            key={entry.id}
            onClick={() => onSelect?.(entry)}
            className="flex w-full items-start justify-between gap-3 rounded-lg border border-gray-100 px-3 py-3 text-left transition hover:border-green-200 hover:bg-green-50/40 sm:px-4"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {entry.gameMeta.opponent}
              </p>
              <p className="text-xs text-gray-400">
                {entry.gameMeta.date}
              </p>
            </div>

            <div className="shrink-0 text-right text-sm text-gray-700">
              {entry.statLine.inningsPitchedOuts / 3} IP /{" "}
              {entry.statLine.earnedRuns} ER
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
