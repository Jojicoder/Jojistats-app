import { useState } from "react"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"
import { usePitchingStats } from "../hooks/usePitchingStats"
import PitchingTrendChart from "./PitchingTrendChart"

type Props = {
  activePlayer: Player
  entries: SavedPitchingGameEntry[]
  battingEntries?: SavedBattingGameEntry[]
}

const statDescriptions: Record<string, string> = {
  IP:   "Innings Pitched",
  ERA:  "Earned Run Average",
  WHIP: "Walks + Hits per Inning",
  H:    "Hits Allowed",
  R:    "Runs Allowed",
  ER:   "Earned Runs",
  BB:   "Walks",
  HBP:  "Hit Batters",
  SO:   "Strikeouts",
  HR:   "Home Runs Allowed",
}

type StatCardStyle = { bg: string; label: string; value: string }

function getPitchingStatCardStyle(label: string, value: string, gamesPlayed: number): StatCardStyle {
  const map: Record<string, StatCardStyle> = {
    emerald: { bg: "bg-emerald-50",  label: "text-emerald-700", value: "text-emerald-900" },
    green:   { bg: "bg-green-50",    label: "text-green-700",   value: "text-green-900"   },
    neutral: { bg: "bg-[#f7f8f3]",   label: "text-gray-400",    value: "text-green-950"   },
    rose:    { bg: "bg-rose-50",      label: "text-rose-600",    value: "text-rose-900"    },
    red:     { bg: "bg-red-50",       label: "text-red-600",     value: "text-red-900"     },
  }

  if (gamesPlayed === 0) return map.neutral

  const n = Number(value)

  if (label === "ERA") {
    if (Number.isNaN(n)) return map.neutral
    if (n <= 1.50) return map.emerald
    if (n <= 2.50) return map.green
    if (n <= 4.50) return map.neutral
    if (n <= 6.00) return map.rose
    return map.red
  }

  if (label === "WHIP") {
    if (Number.isNaN(n)) return map.neutral
    if (n <= 0.80) return map.emerald
    if (n <= 1.10) return map.green
    if (n <= 1.50) return map.neutral
    if (n <= 2.00) return map.rose
    return map.red
  }

  if (label === "SO") {
    if (n >= 30) return map.emerald
    if (n >= 15) return map.green
    return map.neutral
  }

  return map.neutral
}

function formatResult(entry: SavedPitchingGameEntry) {
  const { result, teamScore, opponentScore } = entry.gameMeta
  if (result === "W" || result === "L" || result === "T") return result
  if (teamScore == null || opponentScore == null) return null
  if (teamScore > opponentScore) return "W"
  if (teamScore < opponentScore) return "L"
  return "T"
}

function formatScore(entry: SavedPitchingGameEntry) {
  const { teamScore, opponentScore } = entry.gameMeta
  if (teamScore == null || opponentScore == null) return null
  return `${teamScore}–${opponentScore}`
}

function formatIP(outs: number) {
  const whole = Math.floor(outs / 3)
  const rem = outs % 3
  return rem === 0 ? `${whole}.0` : `${whole}.${rem}`
}

export default function MyPitchingStatsPage({ activePlayer, entries }: Props) {
  const [selectedEntry, setSelectedEntry] = useState<SavedPitchingGameEntry | null>(null)
  const displayedEntries = selectedEntry ? [selectedEntry] : entries
  const statLines = displayedEntries.map((e) => e.statLine)
  const stats = usePitchingStats(statLines)
  const gamesPlayed = displayedEntries.length

  return (
    <main className="w-full">
      <div className="max-w-6xl space-y-5">

        {/* Player Header */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Pitching Stats</p>
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
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{gamesPlayed}</p>
            </div>
            <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Innings Pitched</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{stats.ip}</p>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <section className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {(
            [
              { label: "ERA",  value: stats.era },
              { label: "WHIP", value: stats.whip },
              { label: "H",    value: String(stats.h) },
              { label: "R",    value: String(stats.r) },
              { label: "ER",   value: String(stats.er) },
              { label: "BB",   value: String(stats.bb) },
              { label: "HBP",  value: String(stats.hbp) },
              { label: "SO",   value: String(stats.so) },
              { label: "HR",   value: String(stats.hr) },
            ] as const
          ).map(({ label, value }) => {
            const s = getPitchingStatCardStyle(label, value, gamesPlayed)
            return (
              <div key={label} className={`rounded-2xl p-4 shadow-sm ${s.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${s.label}`}>{label}</p>
                <p className="mt-0.5 text-xs text-gray-400">{statDescriptions[label]}</p>
                <p className={`mt-3 text-3xl font-extrabold tracking-tight ${s.value}`}>{value}</p>
              </div>
            )
          })}
        </section>

        <PitchingTrendChart entries={displayedEntries} />

        <RecentPitchingGames entries={entries} onSelect={setSelectedEntry} selectedId={selectedEntry?.id ?? null} />

      </div>
    </main>
  )
}

function RecentPitchingGames({
  entries,
  onSelect,
  selectedId,
}: {
  entries: SavedPitchingGameEntry[]
  onSelect?: (entry: SavedPitchingGameEntry) => void
  selectedId: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sorted = [...entries].sort((a, b) => {
    const d = b.gameMeta.date.localeCompare(a.gameMeta.date)
    return d !== 0 ? d : b.gameMeta.matchNumber - a.gameMeta.matchNumber
  })

  const visible = isExpanded ? sorted : sorted.slice(0, 5)
  const hasMore = sorted.length > 5

  if (!entries.length) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">All Saved Games</h2>
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          No pitching records yet.
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">All Saved Games</h2>
          <p className="mt-0.5 text-xs text-gray-400">Saved pitching results for this player</p>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded((p) => !p)}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            {isExpanded ? "Show Less" : "Show All"}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((entry) => {
          const isSelected = selectedId === entry.id
          const result = formatResult(entry)
          const score = formatScore(entry)
          const ip = formatIP(entry.statLine.inningsPitchedOuts)

          return (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(entry) }
              }}
              className={`cursor-pointer rounded-xl px-4 py-3 transition ${
                isSelected
                  ? "border border-green-200 bg-green-50"
                  : "bg-[#f7f8f3] hover:bg-[#eef0e9]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      vs {entry.gameMeta.opponent}
                    </p>
                    {result && (
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                        result === "W" ? "bg-green-100 text-green-800" :
                        result === "L" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {result}
                      </span>
                    )}
                    {score && (
                      <span className="font-mono text-xs font-semibold text-gray-500">{score}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.gameMeta.date} · #{entry.gameMeta.matchNumber}
                    {entry.gameMeta.location?.trim() ? ` · ${entry.gameMeta.location}` : ""}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-green-950">{ip} <span className="text-xs font-normal text-gray-400">IP</span></p>
                  <p className="text-xs text-gray-500">
                    {entry.statLine.earnedRuns} ER · {entry.statLine.strikeouts} K · {entry.statLine.walks} BB
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
