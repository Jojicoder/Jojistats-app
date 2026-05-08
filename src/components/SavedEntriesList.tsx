import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title?: string
  emptyMessage?: string
  onEdit?: (savedEntry: SavedBattingGameEntry) => void
  onDelete?: (savedEntry: SavedBattingGameEntry) => void
  editingSavedEntryId?: string | null
  showHeader?: boolean
  showDescription?: boolean
  showStats?: boolean
}

function formatGamePositions(gamePositions: string[]) {
  if (gamePositions.length === 0) return "-"
  return gamePositions.join(" / ")
}

function formatScore(entry: SavedBattingGameEntry) {
  const { teamScore, opponentScore } = entry.gameMeta
  if (teamScore == null || opponentScore == null) return null
  return `${teamScore}-${opponentScore}`
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

  const visibleEntries = useMemo(() => {
    if (isExpanded) return sortedEntries
    return sortedEntries.slice(0, 3)
  }, [sortedEntries, isExpanded])

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      {showHeader && (
        <div className="flex items-start justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            {showDescription && (
              <p className="mt-1 text-sm text-gray-500">
                Saved batting results for this player
              </p>
            )}
          </div>

          {hasMoreThanPreview && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 sm:py-2"
            >
              {isExpanded ? "Show Less" : "Expand"}
            </button>
          )}
        </div>
      )}

      {savedEntries.length === 0 ? (
        <div className={`${showHeader ? "mt-4 sm:mt-6" : ""} rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500`}>
          {emptyMessage}
        </div>
      ) : (
        <div className={`${showHeader ? "mt-4 sm:mt-6" : ""} space-y-3`}>
          {visibleEntries.map((entry) => {
            const isEditing = editingSavedEntryId === entry.id
            const score = formatScore(entry)
            const result = formatResult(entry)

            return (
              <div
                key={entry.id}
                className={`rounded-xl border px-3 py-3 transition sm:px-4 sm:py-4 ${
                  isEditing
                    ? "border-green-900 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-3 sm:gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {entry.gameMeta.date} vs {entry.gameMeta.opponent}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Match #{entry.gameMeta.matchNumber} · Season{" "}
                      {entry.gameMeta.seasonYear}
                      {entry.gameMeta.location?.trim()
                        ? ` · ${entry.gameMeta.location}`
                        : ""}
                    </p>

                    {(score || result) && (
                      <div className="mt-2 flex flex-wrap gap-1.5 text-xs font-semibold">
                        {score && (
                          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                            Score {score}
                          </span>
                        )}
                        {result && (
                          <span
                            className={`rounded-full px-2 py-0.5 ${
                              result === "W"
                                ? "bg-green-100 text-green-800"
                                : result === "L"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                            }`}
                          >
                            {result}
                          </span>
                        )}
                      </div>
                    )}

                    <p className="mt-2 text-sm text-gray-600">
                      Position: {formatGamePositions(entry.gamePositions)}
                    </p>

                    {showStats && (
                    <div className="mt-3 flex flex-wrap gap-1.5 text-xs text-gray-600 sm:text-sm">
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">AB {entry.statLine.AB}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">H {entry.statLine.H}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">2B {entry.statLine.doubles}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">3B {entry.statLine.triples}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">HR {entry.statLine.HR}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">RBI {entry.statLine.RBI}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">BB {entry.statLine.BB}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">HBP {entry.statLine.HBP}</span>
                      <span className="rounded-full bg-gray-100 px-2 py-0.5">SO {entry.statLine.SO}</span>
                      {entry.statLine.note?.trim() && (
                        <p className="basis-full text-sm text-gray-500">
                          Note: {entry.statLine.note}
                        </p>
                      )}
                      {entry.gameMeta.memo?.trim() && (
                        <p className="basis-full text-sm text-gray-500">
                          Memo: {entry.gameMeta.memo}
                        </p>
                      )}
                    </div>
                    )}
                  </div>

                  {(onEdit || onDelete) && (
                    <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                      {onEdit && (
                        <button
                          type="button"
                          onClick={() => onEdit(entry)}
                          className={`rounded-lg px-3 py-2 text-sm font-medium ${
                            isEditing
                              ? "bg-green-900 text-white"
                              : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {isEditing ? "Editing" : "Edit"}
                        </button>
                      )}

                      {onDelete && (
                        <button
                          type="button"
                          onClick={() => onDelete(entry)}
                          className="rounded-lg bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700"
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
