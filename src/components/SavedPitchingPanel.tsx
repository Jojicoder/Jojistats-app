import type { SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"
import { formatLiveInnings } from "./gameLiveUtils"

type Props = {
  savedPitchingEntries: SavedPitchingGameEntry[]
  battingEntries?: SavedBattingGameEntry[]
  editingSavedPitchingEntryId?: string | null
  onStartEdit?: (entry: SavedPitchingGameEntry) => void
  onCancelEdit?: () => void
  onDelete?: (entry: SavedPitchingGameEntry) => void | Promise<void>
}

export default function SavedPitchingPanel({
  savedPitchingEntries,
  battingEntries = [],
  editingSavedPitchingEntryId = null,
  onStartEdit,
  onCancelEdit,
  onDelete,
}: Props) {
  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-base font-bold text-gray-900">Saved Pitching</h2>
        <p className="mt-0.5 text-xs text-gray-400">Saved pitching results for this player</p>
      </div>

      {savedPitchingEntries.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          No pitching records yet.
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {savedPitchingEntries.map((entry) => {
            const isEditing = editingSavedPitchingEntryId === entry.id
            const battingEntry = battingEntries.find(
              (item) => item.gameId === entry.gameId && item.playerId === entry.playerId
            )
            const positions = battingEntry?.gamePositions.length ? battingEntry.gamePositions.join(" / ") : "P"

            return (
            <div
              key={entry.id}
              className={`rounded-xl px-4 py-3 transition ${
                isEditing ? "border border-green-200 bg-green-50" : "bg-[#f7f8f3]"
              }`}
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900">vs {entry.gameMeta.opponent}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.gameMeta.date} · #{entry.gameMeta.matchNumber}
                    {entry.gameMeta.location?.trim() ? ` · ${entry.gameMeta.location}` : ""}
                  </p>
                  <p className="mt-1.5 text-xs text-gray-500">Position: {positions}</p>

                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {[
                      ["IP", formatLiveInnings(entry.statLine.inningsPitchedOuts)],
                      ["H", entry.statLine.hitsAllowed],
                      ["R", entry.statLine.runsAllowed],
                      ["ER", entry.statLine.earnedRuns],
                      ["BB", entry.statLine.walks],
                      ["SO", entry.statLine.strikeouts],
                      ["HR", entry.statLine.homeRunsAllowed],
                    ].map(([label, value]) => (
                      <span key={String(label)} className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                        <span className="font-bold text-gray-400">{label}</span> {value}
                      </span>
                    ))}
                    {entry.statLine.hitBatters > 0 && (
                      <span className="rounded-md border border-gray-200 bg-white px-2 py-0.5 text-xs text-gray-600">
                        <span className="font-bold text-gray-400">HBP</span> {entry.statLine.hitBatters}
                      </span>
                    )}
                    {entry.statLine.note.trim() && (
                      <p className="basis-full text-xs text-gray-400">Note: {entry.statLine.note}</p>
                    )}
                  </div>
                </div>

                {(onStartEdit || onDelete) && (
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 sm:items-center">
                    {onStartEdit && (
                      <button
                        type="button"
                        onClick={() => {
                          if (isEditing) {
                            onCancelEdit?.()
                            return
                          }
                          onStartEdit(entry)
                        }}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
                          isEditing
                            ? "bg-red-50 text-red-600 hover:bg-red-100"
                            : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        {isEditing ? "Cancel" : "Edit"}
                      </button>
                    )}
                    {onDelete && (
                      <button
                        type="button"
                        onClick={() => onDelete(entry)}
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
