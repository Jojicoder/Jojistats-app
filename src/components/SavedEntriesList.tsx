import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title: string
  emptyMessage: string
  onEdit?: (entry: SavedBattingGameEntry) => void
  onDelete?: (entry: SavedBattingGameEntry) => void
  editingSavedEntryId?: string | null
}

export default function SavedEntriesList({
  savedEntries,
  title,
  emptyMessage,
  onEdit,
  onDelete,
  editingSavedEntryId = null,
}: SavedEntriesListProps) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <p className="text-sm font-medium text-green-900">{title}</p>

      {savedEntries.length === 0 ? (
        <p className="mt-4 text-sm text-gray-500">{emptyMessage}</p>
      ) : (
        <div className="mt-4 space-y-3">
          {savedEntries.map((entry) => (
            <div
              key={entry.id}
              className={`rounded-xl border px-4 py-3 ${
                editingSavedEntryId === entry.id
                  ? "border-blue-300 bg-blue-50"
                  : "border-gray-200 bg-white"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-800">
                    {entry.gameMeta.date} vs {entry.gameMeta.opponent}
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    Season {entry.gameMeta.seasonYear} · Game #
                    {entry.gameMeta.matchNumber}
                  </p>

                              <div className="mt-2 text-sm text-gray-600 space-y-1">
                  <p>Position {entry.gamePosition}</p>
                  <p>
                    AB {entry.statLine.AB} · H {entry.statLine.H} · HR {entry.statLine.HR}
                  </p>
                  <p>
                    RBI {entry.statLine.RBI} · BB {entry.statLine.BB} · SO {entry.statLine.SO}
                  </p>
                </div>
                </div>

                <div className="flex items-center gap-2">
                  {onEdit && (
                    <button
                      type="button"
                      onClick={() => onEdit(entry)}
                      className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      {editingSavedEntryId === entry.id ? "Editing" : "Edit"}
                    </button>
                  )}

                  {onDelete && editingSavedEntryId === entry.id && (
                    <button
                      type="button"
                      onClick={() => onDelete(entry)}
                      className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}