import type { Player, PendingBattingEntry, PendingPitchingEntry, DraftGameMeta, SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"
import { formatLiveInnings } from "./gameLiveUtils"

type Props = {
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
  gameMeta: DraftGameMeta
  pendingEntries: PendingBattingEntry[]
  pendingPitchingEntries: PendingPitchingEntry[]
  editingPendingPlayerId?: string | null
  onStartEditPendingEntry?: (entry: PendingBattingEntry) => void
  onRemovePendingEntry?: (playerId: string) => void
  onRemovePendingPitchingEntry?: (playerId: string) => void
  isEditingSavedEntry: boolean
  isSaving: boolean
  onSave: () => void
  saveError?: string
  onClearSaveError?: () => void
  onNewGame?: () => void
  savedEntries?: SavedBattingGameEntry[]
  savedPitchingEntries?: SavedPitchingGameEntry[]
  onStartEditSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void
  onDeleteSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void | Promise<void>
}

export default function PendingEntriesPanel({
  allPlayers,
  onSelectPlayer,
  gameMeta,
  pendingEntries,
  pendingPitchingEntries,
  editingPendingPlayerId = null,
  onStartEditPendingEntry,
  onRemovePendingEntry,
  onRemovePendingPitchingEntry,
  isEditingSavedEntry,
  isSaving,
  onSave,
  saveError,
  onClearSaveError,
  onNewGame,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      {pendingEntries.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Queued — {pendingEntries.length} {pendingEntries.length === 1 ? "player" : "players"}
          </p>
          {pendingEntries.map((entry) => (
            <div
              key={entry.playerId}
              className={`rounded-xl border px-3 py-2.5 ${
                editingPendingPlayerId === entry.playerId
                  ? "border-green-900 bg-green-50"
                  : "border-gray-100"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{entry.playerName}</p>
                  <p className="mt-0.5 text-xs text-gray-400">{entry.gamePositions.join(" / ")}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  {onStartEditPendingEntry && (
                    <button
                      type="button"
                      onClick={() => {
                        const player = allPlayers.find((item) => item.id === entry.playerId)
                        if (player) onSelectPlayer(player)
                        onStartEditPendingEntry(entry)
                      }}
                      className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      {editingPendingPlayerId === entry.playerId ? "Editing" : "Edit"}
                    </button>
                  )}
                  {onRemovePendingEntry && (
                    <button
                      type="button"
                      onClick={() => onRemovePendingEntry(entry.playerId)}
                      className="rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                    >
                      Undo
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {entry.AB > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">AB {entry.AB}</span>}
                {entry.H > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">H {entry.H}</span>}
                {entry.HR > 0 && <span className="rounded-full bg-green-900 px-2 py-0.5 text-xs text-white">HR {entry.HR}</span>}
                {entry.RBI > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">RBI {entry.RBI}</span>}
                {entry.BB > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">BB {entry.BB}</span>}
                {(entry.HBP ?? 0) > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">HBP {entry.HBP}</span>}
                {(entry.SF ?? 0) > 0 && <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs text-violet-700">SF {entry.SF}</span>}
                {entry.SO > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">K {entry.SO}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingPitchingEntries.length > 0 && (
        <div className="mb-3 space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Pitching Queue — {pendingPitchingEntries.length}
          </p>
          {pendingPitchingEntries.map((entry) => (
            <div key={entry.playerId} className="rounded-xl border border-gray-100 px-3 py-2.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{entry.playerName}</p>
                  <p className="mt-0.5 text-xs text-gray-400">
                    IP {formatLiveInnings(entry.inningsPitchedOuts)}
                    {" · "}ER {entry.earnedRuns} · SO {entry.strikeouts}
                  </p>
                </div>
                {onRemovePendingPitchingEntry && (
                  <button
                    type="button"
                    onClick={() => onRemovePendingPitchingEntry(entry.playerId)}
                    className="shrink-0 rounded-lg bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"
                  >
                    Undo
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingEntries.length > 0 && gameMeta.teamScore != null && (() => {
        const totalRbi = pendingEntries.reduce((sum, e) => sum + e.RBI, 0)
        const errorRuns = gameMeta.errorRuns ?? 0
        const expected = totalRbi + errorRuns
        const ok = gameMeta.teamScore === expected
        return (
          <div className={`mb-3 rounded-xl px-3 py-2.5 text-xs ${ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
            <span className="font-bold">Score check: </span>
            RBI {totalRbi}{errorRuns > 0 ? ` + Error ${errorRuns}` : ""} = {expected}
            {" "}
            {ok ? "✓ matches team score" : `≠ team score (${gameMeta.teamScore})`}
          </div>
        )
      })()}

      {onNewGame && (
        <button
          type="button"
          onClick={onNewGame}
          disabled={isSaving}
          className="w-full rounded-lg border border-green-900 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50"
        >
          {isSaving ? "Saving..." : "+ Record New Game"}
        </button>
      )}

      <button
        onClick={onSave}
        disabled={
          isSaving ||
          (pendingEntries.length === 0 && pendingPitchingEntries.length === 0) ||
          isEditingSavedEntry
        }
        className="w-full rounded-lg bg-green-900 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        {isSaving
          ? "Saving..."
          : isEditingSavedEntry
            ? "Finish editing entry first"
            : pendingEntries.length + pendingPitchingEntries.length > 0
              ? `Save Game (${pendingEntries.length + pendingPitchingEntries.length})`
              : "Save Game"}
      </button>

      {saveError && (
        <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <span className="flex-1">{saveError}</span>
          {onClearSaveError && (
            <button type="button" onClick={onClearSaveError} className="shrink-0 font-bold leading-none">✕</button>
          )}
        </div>
      )}
    </div>
  )
}
