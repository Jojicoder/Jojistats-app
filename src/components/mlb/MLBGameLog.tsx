import { useState } from "react"
import type { GameLogSplit } from "./types"

// ── MLB Game Log ──────────────────────────────────────────────────────

const PREVIEW_LIMIT = 10

export default function MLBGameLog({ log, mode }: { log: GameLogSplit[]; mode: "hitting" | "pitching" }) {
  const [expanded, setExpanded] = useState(false)

  const sorted = [...log].reverse()
  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_LIMIT)

  if (log.length === 0) return null

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">All Games</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {mode === "hitting" ? "Batting results" : "Pitching results"} — {log.length} games
          </p>
        </div>
        {log.length > PREVIEW_LIMIT && (
          <button
            type="button"
            onClick={() => setExpanded((p) => !p)}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            {expanded ? "Show Less" : "Show All"}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((entry, i) => {
          const opp = entry.opponent?.name ?? "Unknown"
          const label = entry.isHome ? `vs ${opp}` : `@ ${opp}`
          const s = entry.stat

          const hittingChips: [string, number | string][] = [
            ["AB",  s.atBats     ?? 0],
            ["H",   s.hits       ?? 0],
            ["2B",  s.doubles    ?? 0],
            ["3B",  s.triples    ?? 0],
            ["HR",  s.homeRuns   ?? 0],
            ["RBI", s.rbi        ?? 0],
            ["BB",  s.baseOnBalls ?? 0],
            ["SO",  s.strikeOuts ?? 0],
          ]

          const pitchingChips: [string, number | string][] = [
            ["IP",  s.inningsPitched ?? "0.0"],
            ["H",   s.hits           ?? 0],
            ["R",   s.runs           ?? 0],
            ["ER",  s.earnedRuns     ?? 0],
            ["BB",  s.baseOnBalls    ?? 0],
            ["SO",  s.strikeOuts     ?? 0],
            ["HR",  s.homeRuns       ?? 0],
          ]

          const chips = mode === "hitting" ? hittingChips : pitchingChips

          return (
            <div key={i} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-gray-900">{label}</p>
              </div>
              <p className="mt-0.5 text-xs text-gray-400">{entry.date}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {chips.map(([lbl, val]) => (
                  <span
                    key={lbl}
                    className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600"
                  >
                    <span className="font-bold text-gray-400">{lbl}</span> {val}
                  </span>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

