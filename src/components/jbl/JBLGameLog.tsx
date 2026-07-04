import { useState } from "react"
import type { BattingRawGame, PitchingRawGame } from "./stats"

const PREVIEW_LIMIT = 10

type Props =
  | { mode: "hitting"; log: BattingRawGame[] }
  | { mode: "pitching"; log: PitchingRawGame[] }

export default function JBLGameLog({ mode, log }: Props) {
  const [expanded, setExpanded] = useState(false)

  if (log.length === 0) return null

  const sorted = [...log].reverse()
  const visible = expanded ? sorted : sorted.slice(0, PREVIEW_LIMIT)

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
            onClick={() => setExpanded((v) => !v)}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            {expanded ? "Show Less" : "Show All"}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((entry) => {
          const label = entry.isHome ? `vs ${entry.opp}` : `@ ${entry.opp}`
          const chips: [string, number | string][] = mode === "hitting"
            ? (() => {
                const b = entry as BattingRawGame
                return [
                  ["AB", b.ab], ["H", b.h], ["HR", b.hr], ["R", b.r],
                  ["RBI", b.rbi], ["BB", b.bb], ["SO", b.so],
                ]
              })()
            : (() => {
                const p = entry as PitchingRawGame
                return [
                  ["IP", p.ip.toFixed(1)], ["H", p.h], ["R", p.r], ["ER", p.er],
                  ["BB", p.bb], ["SO", p.so], ["HR", p.hr],
                ]
              })()

          return (
            <div key={entry.gameId} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">{label}</p>
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
