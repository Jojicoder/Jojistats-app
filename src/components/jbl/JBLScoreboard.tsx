import { Link } from "react-router-dom"
import { jblTeamSlug } from "../../api/jbl"
import { teamBadge } from "./teamTheme"
import type { GameEvent } from "./types"

function countHitsAndErrors(events: GameEvent[]) {
  let awayHits = 0
  let homeHits = 0
  let awayErrors = 0
  let homeErrors = 0
  for (const ev of events) {
    if (ev.type !== "play") continue
    const r = ev.result.toLowerCase()
    const isHit =
      r.includes("home run") || r.includes("triple") || r.includes("double") ||
      r.includes("single") || r.includes("beats out")
    if (isHit) {
      if (ev.isTop) awayHits++
      else homeHits++
    }
    if (r.includes("error")) {
      // Errors are charged to whichever team is on defense — the team not
      // currently batting.
      if (ev.isTop) homeErrors++
      else awayErrors++
    }
  }
  return { awayHits, homeHits, awayErrors, homeErrors }
}

export default function JBLScoreboard({
  away,
  home,
  awayColor,
  homeColor,
  lineScore,
  finalScore,
  events,
  isGameOver,
  selectedInning,
  selectedIsTop,
  onSelectHalfInning,
}: {
  away: string
  home: string
  awayColor: string
  homeColor: string
  lineScore: { away: (number | null)[]; home: (number | null)[] }
  finalScore: { away: number; home: number }
  events: GameEvent[]
  // Whether it's safe to call a winner — a "current score" fed in while
  // the real result is still hidden (unrevealed live game) can have either
  // side ahead, and that's not the same thing as the game being over.
  isGameOver: boolean
  selectedInning: number | null
  selectedIsTop: boolean | null
  onSelectHalfInning: (inning: number, isTop: boolean) => void
}) {
  const inningCount = Math.max(lineScore.away.length, lineScore.home.length, 9)
  const inningNumbers = Array.from({ length: inningCount }, (_, i) => i + 1)
  const { awayHits, homeHits, awayErrors, homeErrors } = countHitsAndErrors(events)
  const awayWon = isGameOver && finalScore.away > finalScore.home
  const homeWon = isGameOver && finalScore.home > finalScore.away
  const isFinal = awayWon || homeWon

  function hasEventsForHalf(inning: number, isTop: boolean) {
    return events.some(ev => "inning" in ev && ev.inning === inning && ev.isTop === isTop)
  }

  const rows = [
    { side: "away" as const, name: away, color: awayColor, runs: lineScore.away, total: finalScore.away, hits: awayHits, errors: awayErrors, isTop: true, won: awayWon },
    { side: "home" as const, name: home, color: homeColor, runs: lineScore.home, total: finalScore.home, hits: homeHits, errors: homeErrors, isTop: false, won: homeWon },
  ]

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-50 ring-1 ring-gray-100">
      <table className="w-full min-w-[420px] text-center text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400">
            <th className="px-3 py-2.5 text-left">Team</th>
            {inningNumbers.map(inning => (
              <th key={inning} className="px-1 py-2.5 font-bold">{inning}</th>
            ))}
            <th className="border-l border-gray-200 px-3 py-2.5 font-extrabold text-gray-600">R</th>
            <th className="px-3 py-2.5 font-bold">H</th>
            <th className="px-3 py-2.5 font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={row.side} className={`font-bold text-gray-800 ${rowIndex === 0 ? "" : "border-t border-gray-200"}`}>
              <td className="px-3 py-3 text-left">
                <Link
                  to={`/jbl/teams/${jblTeamSlug(row.name)}`}
                  className="flex items-center gap-2 rounded-lg transition hover:opacity-75"
                >
                  {teamBadge(row.name)}
                  <span className="max-w-28 truncate text-sm font-bold" style={{ color: row.color }}>{row.name}</span>
                  {isFinal && row.won && (
                    <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">W</span>
                  )}
                </Link>
              </td>
              {inningNumbers.map(inning => {
                const runsThisInning = row.runs[inning - 1]
                const isSelected = selectedInning === inning && selectedIsTop === row.isTop
                const hasData = hasEventsForHalf(inning, row.isTop)
                return (
                  <td key={inning} className="px-0.5 py-1.5">
                    <button
                      type="button"
                      onClick={() => onSelectHalfInning(inning, row.isTop)}
                      disabled={!hasData}
                      aria-label={`Jump to ${row.isTop ? "top" : "bottom"} of inning ${inning}`}
                      className={`h-8 min-w-7 rounded-lg px-1.5 text-sm font-bold transition ${
                        isSelected
                          ? "bg-green-600 text-white shadow-sm"
                          : hasData
                          ? "text-gray-700 hover:bg-white hover:shadow-sm"
                          : "cursor-not-allowed text-gray-300"
                      }`}
                    >
                      {runsThisInning ?? (hasData ? "0" : "–")}
                    </button>
                  </td>
                )
              })}
              <td className="border-l border-gray-200 px-3 py-3 text-lg font-extrabold text-gray-900">{row.total}</td>
              <td className="px-3 py-3 text-gray-600">{row.hits}</td>
              <td className="px-3 py-3 text-gray-400">{row.errors}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
