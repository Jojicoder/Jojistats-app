import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title?: string
  emptyMessage?: string
  onEdit?: (savedEntry: SavedBattingGameEntry) => void
  onDelete?: (savedEntry: SavedBattingGameEntry) => void
  onSelect?: (savedEntry: SavedBattingGameEntry) => void
  editingSavedEntryId?: string | null
  showHeader?: boolean
  showDescription?: boolean
  showStats?: boolean
}

function formatGamePositions(gamePositions: string[]) {
  if (gamePositions.length === 0) return "—"
  return gamePositions.join(" / ")
}

function formatScore(entry: SavedBattingGameEntry) {
  const { teamScore, opponentScore } = entry.gameMeta
  if (teamScore == null || opponentScore == null) return null
  return `${teamScore}–${opponentScore}`
}

function formatResult(entry: SavedBattingGameEntry) {
  const { result, teamScore, opponentScore } = entry.gameMeta
  if (result === "W" || result === "L" || result === "T") return result
  if (teamScore == null || opponentScore == null) return null
  if (teamScore > opponentScore) return "W"
  if (teamScore < opponentScore) return "L"
  return "T"
}

export default function SavedEntriesList({
  savedEntries,
  title = "Recent Entries",
  emptyMessage = "No saved entries yet.",
  onEdit,
  onDelete,
  onSelect,
  editingSavedEntryId = null,
  showHeader = true,
  showDescription = true,
  showStats = true,
}: SavedEntriesListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMoreThanPreview = savedEntries.length > 3
  const sortedEntries = useMemo(
    () =>
      savedEntries.slice().sort((a, b) => {
        const dateCompare = b.gameMeta.date.localeCompare(a.gameMeta.date)
        if (dateCompare !== 0) return dateCompare
        return b.gameMeta.matchNumber - a.gameMeta.matchNumber
      }),
    [savedEntries]
  )

  const visibleEntries = useMemo(
    () => (isExpanded ? sortedEntries : sortedEntries.slice(0, 3)),
    [sortedEntries, isExpanded]
  )

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      {showHeader && (
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-gray-900">{title}</h2>
            {showDescription && (
              <p className="mt-0.5 text-xs text-gray-400">Saved batting results for this player</p>
            )}
          </div>
          {hasMoreThanPreview && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
            >
              {isExpanded ? "Show Less" : "Show All"}
            </button>
          )}
        </div>
      )}

      {savedEntries.length === 0 ? (
        <div className={`${showHeader ? "mt-4" : ""} rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400`}>
          {emptyMessage}
        </div>
      ) : (
        <div className={`${showHeader ? "mt-4" : ""} space-y-2`}>
          {visibleEntries.map((entry) => {
            const isEditing = editingSavedEntryId === entry.id
            const score = formatScore(entry)
            const result = formatResult(entry)

            return (
              <div
                key={entry.id}
                role={onSelect ? "button" : undefined}
                tabIndex={onSelect ? 0 : undefined}
                onClick={() => onSelect?.(entry)}
                onKeyDown={(e) => {
                  if (!onSelect) return
                  if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(entry) }
                }}
                className={`rounded-xl px-4 py-3 transition ${
                  isEditing
                    ? "border border-green-200 bg-green-50"
                    : `bg-[#f7f8f3] ${onSelect ? "cursor-pointer hover:bg-[#eef0e9]" : ""}`
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    {/* Date + opponent */}
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

                    <p className="mt-1.5 text-xs text-gray-500">
                      Position: {formatGamePositions(entry.gamePositions)}
                    </p>

                    {showStats && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {[
                          ["AB", entry.statLine.AB],
                          ["H",  entry.statLine.H],
                          ["2B", entry.statLine.doubles],
                          ["3B", entry.statLine.triples],
                          ["HR", entry.statLine.HR],
                          ["RBI",entry.statLine.RBI],
                          ["BB", entry.statLine.BB],
                          ["SO", entry.statLine.SO],
                        ].map(([label, val]) => (
                          <span key={String(label)} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                            <span className="font-bold text-gray-400">{label}</span> {val}
                          </span>
                        ))}
                        {(entry.statLine.HBP ?? 0) > 0 && (
                          <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                            <span className="font-bold text-gray-400">HBP</span> {entry.statLine.HBP}
                          </span>
                        )}
                        {entry.statLine.note?.trim() && (
                          <p className="basis-full text-xs text-gray-400">Note: {entry.statLine.note}</p>
                        )}
                        {entry.gameMeta.memo?.trim() && (
                          <p className="basis-full text-xs text-gray-400">Memo: {entry.gameMeta.memo}</p>
                        )}
                      </div>
                    )}
                  </div>

                  {(onEdit || onDelete) && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onEdit(entry) }}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                            isEditing
                              ? "bg-green-900 text-white"
                              : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          {isEditing ? "Editing" : "Edit"}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onDelete(entry) }}
                          className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
