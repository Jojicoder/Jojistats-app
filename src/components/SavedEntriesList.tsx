import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title?: string
  emptyMessage?: string
  onEdit?: (savedEntry: SavedBattingGameEntry) => void
  onDelete?: (savedEntry: SavedBattingGameEntry) => void
  editingSavedEntryId?: string | null
}

function formatGamePositions(gamePositions: string[]) {
  if (gamePositions.length === 0) return "-"
  return gamePositions.join(" / ")
}

export default function SavedEntriesList({
  savedEntries,
  title = "Recent Entries",
  emptyMessage = "No saved entries yet.",
  onEdit,
  onDelete,
  editingSavedEntryId = null,
}: SavedEntriesListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const hasMoreThanPreview = savedEntries.length > 3

  const visibleEntries = useMemo(() => {
    if (isExpanded) return savedEntries
    return savedEntries.slice(0, 3)
  }, [savedEntries, isExpanded])

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="mt-1 text-sm text-gray-500">
            Saved batting results for this player
          </p>
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

      {savedEntries.length === 0 ? (
        <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500 sm:mt-6">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-4 space-y-3 sm:mt-6">
          {visibleEntries.map((entry) => {
            const isEditing = editingSavedEntryId === entry.id

            return (
              <div
                key={entry.id}
                className={`rounded-xl border px-3 py-3 transition sm:px-4 sm:py-4 ${
                  isEditing
                    ? "border-green-900 bg-green-50"
                    : "border-gray-200 bg-white"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-900">
                      {entry.gameMeta.date} vs {entry.gameMeta.opponent}
                    </p>

                    <p className="mt-1 text-xs text-gray-500">
                      Match #{entry.gameMeta.matchNumber} · Season{" "}
                      {entry.gameMeta.seasonYear}
                    </p>

                    <p className="mt-2 text-sm text-gray-600">
                      Position: {formatGamePositions(entry.gamePositions)}
                    </p>

                    <div className="mt-3 space-y-1 text-xs text-gray-600 sm:text-sm">
                      <p>
                        AB {entry.statLine.AB} · H {entry.statLine.H} · 2B{" "}
                        {entry.statLine.doubles} · 3B {entry.statLine.triples} ·
                        HR {entry.statLine.HR}
                      </p>
                      <p>
                        RBI {entry.statLine.RBI} · BB {entry.statLine.BB} · SO{" "}
                        {entry.statLine.SO}
                      </p>
                      {entry.statLine.note?.trim() && (
                        <p className="text-sm text-gray-500">
                          Note: {entry.statLine.note}
                        </p>
                      )}
                    </div>
                  </div>

                  {(onEdit || onDelete) && (
                    <div className="flex shrink-0 items-center gap-2">
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
