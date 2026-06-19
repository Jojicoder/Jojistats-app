import { useMemo, useState } from "react"
import type { MLBPlay } from "./types"
import { formatInning } from "./MLBGameDetailsUtils"

export function PlayByPlay({
  plays,
  selectedInning,
  selectedHalf,
  selectedAtBatIndex,
  onClearInning,
  onSelectAtBat,
}: {
  plays: MLBPlay[]
  selectedInning: number | null
  selectedHalf: "top" | "bottom" | null
  selectedAtBatIndex: number | null
  onClearInning: () => void
  onSelectAtBat: (inning: number, half: "top" | "bottom", atBatIndex: number) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const groups = useMemo(() => {
    const map = new Map<number, MLBPlay[]>()
    plays.filter((play) => play.result?.description).forEach((play) => {
      const inning = play.about?.inning ?? 0
      map.set(inning, [...(map.get(inning) ?? []), play])
    })
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [plays])
  const selectedGroup = selectedInning === null || selectedHalf === null
    ? null
    : (() => {
        const group = groups.find(([inning]) => inning === selectedInning)
        if (!group) return undefined
        return [
          group[0],
          group[1].filter((play) => play.about?.halfInning === selectedHalf),
        ] as [number, MLBPlay[]]
      })()
  const visibleGroups = selectedInning !== null
    ? selectedGroup ? [selectedGroup] : []
    : showAll ? groups : groups.slice(0, 3)

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Play-by-Play</p>
          <h2 className="mt-0.5 text-lg font-extrabold text-gray-900">
            {selectedInning && selectedHalf
              ? `${selectedHalf === "top" ? "Top" : "Bottom"} ${selectedInning}`
              : "Inning Summary"}
          </h2>
        </div>
        {selectedInning !== null ? (
          <button
            type="button"
            onClick={onClearInning}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
          >
            All innings
          </button>
        ) : groups.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
          >
            {showAll ? "Show recent" : "Show all"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-5">
        {visibleGroups.map(([inning, inningPlays]) => (
          <section key={inning}>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Inning {inning}</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <ol className="space-y-2">
              {[...inningPlays].reverse().map((play, index) => {
                const scoring = Boolean(play.result?.rbi) || (play.result?.eventType ?? "").includes("home_run")
                const half = play.about?.halfInning as "top" | "bottom" | undefined
                const canSelect = play.result?.event != null && half != null && play.atBatIndex != null
                const isSelected = play.atBatIndex != null && play.atBatIndex === selectedAtBatIndex
                return (
                  <li
                    key={`${play.atBatIndex ?? index}-${play.result?.description}`}
                    className={`rounded-xl border transition ${
                      scoring
                        ? isSelected
                          ? "border-amber-400 bg-amber-100"
                          : "border-amber-200 bg-amber-50"
                        : isSelected
                        ? "border-green-300 bg-green-50"
                        : "border-gray-100 bg-gray-50"
                    } ${canSelect ? "cursor-pointer hover:shadow-sm" : ""}`}
                    onClick={
                      canSelect
                        ? () => onSelectAtBat(inning, half!, play.atBatIndex!)
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <p className="text-sm text-gray-700">{play.result?.description}</p>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm ring-1 ${
                        isSelected ? "bg-green-600 text-white ring-green-500" : "bg-white text-gray-400 ring-gray-100"
                      }`}>
                        {formatInning(play)}
                      </span>
                    </div>
                    {(play.result?.awayScore !== undefined || play.result?.homeScore !== undefined) && (
                      <p className={`px-3 pb-2.5 text-xs font-bold ${scoring ? "text-amber-700" : "text-gray-400"}`}>
                        {scoring && "★ "}Score {play.result?.awayScore ?? 0}–{play.result?.homeScore ?? 0}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
        {visibleGroups.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">
            No play-by-play available for the selected half-inning.
          </p>
        )}
      </div>
    </div>
  )
}
