import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title: string
  emptyMessage: string
  onEdit?: (savedEntry: SavedBattingGameEntry) => void
  onDelete?: (savedEntry: SavedBattingGameEntry) => void
  editingSavedEntryId?: string | null
}

export default function SavedEntriesList({
  savedEntries,
  title,
  emptyMessage,
  onEdit,
  onDelete,
  editingSavedEntryId,
}: SavedEntriesListProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const visibleEntries = useMemo(() => {
    if (isExpanded) return savedEntries
    return savedEntries.slice(0, 3)
  }, [isExpanded, savedEntries])

  const shouldShowToggle = savedEntries.length > 3

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-green-900">{title}</p>
          <p className="mt-1 text-sm text-gray-500">
            Saved batting results for this player
          </p>
        </div>

        {shouldShowToggle && (
          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            {isExpanded ? "Show Less" : "View All"}
          </button>
        )}
      </div>

      {savedEntries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          {emptyMessage}
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {visibleEntries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border px-4 py-4 ${
                editingSavedEntryId === entry.id
                  ? "border-green-300 bg-green-50"
                  : "border-gray-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900">
                    {entry.gameMeta.date} vs {entry.gameMeta.opponent}
                  </p>

                  <p className="mt-1 text-sm text-gray-500">
                    Match {entry.gameMeta.matchNumber} ·{" "}
                    {entry.gamePositions.join(" / ")}
                  </p>

                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p>
                      AB {entry.statLine.AB} · H {entry.statLine.H} · 2B{" "}
                      {entry.statLine.doubles} · 3B {entry.statLine.triples} ·
                      HR {entry.statLine.HR}
                    </p>
                    <p>
                      RBI {entry.statLine.RBI} · BB {entry.statLine.BB} · SO{" "}
                      {entry.statLine.SO}
                    </p>
                  </div>

                  {entry.statLine.note?.trim() && (
                    <div className="mt-3 rounded-lg bg-gray-50 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Note
                      </p>
                      <p className="mt-1 text-sm text-gray-700">
                        {entry.statLine.note}
                      </p>
                    </div>
                  )}
                </div>

                {(onEdit || onDelete) && (
                  <div className="flex shrink-0 items-center gap-2">
                    {onEdit && (
                      <button
                        type="button"
                        onClick={() => onEdit(entry)}
                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                    )}

                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(entry)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}