import { useMemo, useState } from "react"
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

function formatInnings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

export default function MyPitchingStatsPage({
  activePlayer,
  entries,
  battingEntries = [],
}: Props) {
  const [selectedEntry, setSelectedEntry] = useState<SavedPitchingGameEntry | null>(null)
  const selectedBattingEntry = useMemo(() => {
    if (!selectedEntry) return null
    return (
      battingEntries.find((entry) => entry.gameId === selectedEntry.gameId) ??
      battingEntries.find(
        (entry) =>
          entry.gameMeta.date === selectedEntry.gameMeta.date &&
          entry.gameMeta.matchNumber === selectedEntry.gameMeta.matchNumber &&
          entry.gameMeta.opponent === selectedEntry.gameMeta.opponent
      ) ??
      null
    )
  }, [battingEntries, selectedEntry])
  const statLines = entries.map((e) => e.statLine)
  const stats = usePitchingStats(statLines)

  /* 🔥 登板数 */
  const gamesPlayed = entries.length

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
          <Stat label="ERA" value={stats.era} />
          <Stat label="WHIP" value={stats.whip} />
          <Stat label="H" value={String(stats.h)} />
          <Stat label="R" value={String(stats.r)} />
          <Stat label="ER" value={String(stats.er)} />
          <Stat label="BB" value={String(stats.bb)} />
          <Stat label="HBP" value={String(stats.hbp)} />
          <Stat label="SO" value={String(stats.so)} />
          <Stat label="HR" value={String(stats.hr)} />
        </section>

        <PitchingTrendChart entries={entries} />

        <RecentPitchingGames entries={entries} onSelect={setSelectedEntry} />

        {selectedEntry && (
          <PitchingGamePerformanceDetail
            pitchingEntry={selectedEntry}
            battingEntry={selectedBattingEntry}
            onClose={() => setSelectedEntry(null)}
          />
        )}

      </div>
    </main>
  )
}

/* -------------------- カード -------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
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

function PitchingGamePerformanceDetail({
  pitchingEntry,
  battingEntry,
  onClose,
}: {
  pitchingEntry: SavedPitchingGameEntry
  battingEntry: SavedBattingGameEntry | null
  onClose: () => void
}) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Game Performance</h2>
          <p className="mt-1 text-sm text-gray-500">
            {pitchingEntry.gameMeta.date} vs {pitchingEntry.gameMeta.opponent}
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
          <p className="text-sm font-semibold text-gray-900">Pitching</p>
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
        </div>

        <div className="rounded-xl border border-gray-100 p-3">
          <p className="text-sm font-semibold text-gray-900">Batting</p>
          {battingEntry ? (
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
          ) : (
            <p className="mt-3 text-sm text-gray-500">No batting record for this game.</p>
          )}
        </div>
      </div>
    </section>
  )
}
