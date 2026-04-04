import type { SavedBattingGameEntry } from "../types"

type SavedEntriesListProps = {
  savedEntries: SavedBattingGameEntry[]
  title?: string
  emptyMessage?: string
}

export default function SavedEntriesList({
  savedEntries,
  title = "Saved Entries",
  emptyMessage = "No saved entries yet.",
}: SavedEntriesListProps) {
  return (
    <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
      <h2 className="text-lg font-semibold mb-4">{title}</h2>

      {savedEntries.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 text-center">
          {emptyMessage}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {savedEntries.map((savedEntry, index) => (
            <div
              key={index}
              className="bg-gray-50 rounded-lg px-4 py-3 text-sm text-gray-700"
            >
              <div className="font-medium text-gray-800">
                G{index + 1} - {savedEntry.gameMeta.date} vs{" "}
                {savedEntry.gameMeta.opponent || "Unknown Opponent"}
              </div>

              <div className="mt-1 text-gray-500">
                Season {savedEntry.gameMeta.seasonYear} · Match #
                {savedEntry.gameMeta.matchNumber}
              </div>

              <div className="mt-2 text-gray-600">
                AB: {savedEntry.statLine.AB}, H: {savedEntry.statLine.H}, HR:{" "}
                {savedEntry.statLine.HR}, RBI: {savedEntry.statLine.RBI}, BB:{" "}
                {savedEntry.statLine.BB}, SO: {savedEntry.statLine.SO}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}