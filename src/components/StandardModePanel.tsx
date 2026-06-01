import type { Player, Position, BattingEntryData, PitchingEntryData, DraftGameMeta, SavedBattingGameEntry, SavedPitchingGameEntry, PendingBattingEntry } from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import PitchingEntryPanel from "./PitchingEntryPanel"
import SavedEntriesList from "./SavedEntriesList"
import GameMetaFields from "./GameMetaFields"
import { gamePositionOptions, formatLiveInnings } from "./RecordGamePage.utils"

type Props = {
  showRosterPanel: boolean
  activePlayer: Player
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
  gameMeta: DraftGameMeta
  onGameMetaChange: (meta: DraftGameMeta) => void
  teamName: string
  seasonYear: number
  gamePositions: Position[]
  onAddGamePosition: () => void
  onUpdateGamePosition: (index: number, pos: Position) => void
  onRemoveGamePosition: (index: number) => void
  recordMode: "batting" | "pitching"
  onSetRecordMode: (mode: "batting" | "pitching") => void
  canRecordPitching: boolean
  currentEntry: BattingEntryData
  onEntryChange: (entry: BattingEntryData) => void
  onPrimaryAction: () => void
  primaryActionDisabled: boolean
  isEditingSavedEntry: boolean
  isEditingSavedPitchingEntry: boolean
  onCancelEditSavedEntry: () => void
  pitchingEntry: PitchingEntryData
  onPitchingEntryChange: (entry: PitchingEntryData) => void
  onPitchingPrimaryAction: () => void
  isPitchingSaveDisabled: boolean
  onCancelEditSavedPitchingEntry?: () => void
  pendingEntries: PendingBattingEntry[]
  editingPendingPlayerId?: string | null
  onStartEditPendingEntry?: (entry: PendingBattingEntry) => void
  onRemovePendingEntry?: (playerId: string) => void
  onCancelEditPendingEntry?: () => void
  isSaving: boolean
  onSave: () => void
  savedEntries: SavedBattingGameEntry[]
  savedPitchingEntries: SavedPitchingGameEntry[]
  editingSavedEntryId: string | null
  onStartEditSavedEntry: (entry: SavedBattingGameEntry) => void
  onDeleteSavedEntry: (entry: SavedBattingGameEntry) => void
  onStartEditSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void
  onDeleteSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void | Promise<void>
  saveError?: string
  onClearSaveError?: () => void
  onNewGame?: () => void
}

export default function StandardModePanel({
  showRosterPanel,
  activePlayer,
  allPlayers,
  onSelectPlayer,
  gameMeta,
  onGameMetaChange,
  teamName,
  seasonYear,
  gamePositions,
  onAddGamePosition,
  onUpdateGamePosition,
  onRemoveGamePosition,
  recordMode,
  onSetRecordMode,
  canRecordPitching,
  currentEntry,
  onEntryChange,
  onPrimaryAction,
  primaryActionDisabled,
  isEditingSavedEntry,
  isEditingSavedPitchingEntry,
  onCancelEditSavedEntry,
  pitchingEntry,
  onPitchingEntryChange,
  onPitchingPrimaryAction,
  isPitchingSaveDisabled,
  onCancelEditSavedPitchingEntry,
  pendingEntries,
  editingPendingPlayerId = null,
  onStartEditPendingEntry,
  onRemovePendingEntry,
  onCancelEditPendingEntry,
  isSaving,
  onSave,
  savedEntries,
  savedPitchingEntries,
  editingSavedEntryId,
  onStartEditSavedEntry,
  onDeleteSavedEntry,
  onStartEditSavedPitchingEntry,
  onDeleteSavedPitchingEntry,
  saveError,
  onClearSaveError,
  onNewGame,
}: Props) {
  return (
    <div
      className={`grid grid-cols-1 gap-4 sm:gap-6 ${
        showRosterPanel
          ? "xl:grid-cols-[280px_1fr_360px]"
          : "xl:grid-cols-[1fr_360px]"
      }`}
    >
      {/* ROSTER PANEL */}
      {showRosterPanel && (
        <div className="h-fit overflow-visible rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:sticky xl:top-6 xl:max-h-[calc(100vh-8rem)] xl:self-start xl:overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
            Roster
          </p>
          <div className="mt-3 space-y-1">
            {allPlayers.map((player) => {
              const isActive = player.id === activePlayer.id
              return (
                <button
                  key={player.id}
                  type="button"
                  onClick={() => onSelectPlayer(player)}
                  className={`flex w-full min-w-0 items-center rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                    isActive ? "bg-green-900 text-white" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {player.jerseyNumber != null ? (
                    <span className={`mr-1.5 shrink-0 text-xs ${isActive ? "text-green-200" : "text-gray-400"}`}>
                      #{player.jerseyNumber}
                    </span>
                  ) : null}
                  <span className="min-w-0 flex-1 truncate">{player.name}</span>
                  <span className={`ml-1.5 shrink-0 text-xs ${isActive ? "text-green-200" : "text-gray-400"}`}>
                    {player.position}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* CENTER */}
      <div className="space-y-4 sm:space-y-6">
        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <GameMetaFields
            gameMeta={gameMeta}
            onGameMetaChange={onGameMetaChange}
            showScore
            teamName={teamName}
          />
        </div>

        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-white">
              {activePlayer.jerseyNumber != null ? `#${activePlayer.jerseyNumber}` : activePlayer.name[0]}
            </div>
            <div>
              <h2 className="text-xl font-bold leading-tight">{activePlayer.name}</h2>
              <p className="text-xs text-gray-400">{teamName} · {seasonYear}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Positions</p>
              <button
                type="button"
                onClick={onAddGamePosition}
                className="text-xs font-semibold text-green-900 hover:underline"
              >
                + Add
              </button>
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              {gamePositions.map((position, index) => (
                <div key={`${position}-${index}`} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-[#f7f8f3] pl-2 pr-1 py-1">
                  <select
                    value={position}
                    onChange={(event) => onUpdateGamePosition(index, event.target.value as Position)}
                    className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
                  >
                    {gamePositionOptions.map((option) => (
                      <option key={`${option}-${index}`} value={option}>{option}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onRemoveGamePosition(index)}
                    disabled={gamePositions.length === 1}
                    className="ml-0.5 text-gray-300 hover:text-red-400 disabled:opacity-20"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Score / Pitching panel */}
        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="mb-4 flex border-b border-gray-200">
            <button
              type="button"
              onClick={() => onSetRecordMode("batting")}
              className={`px-4 py-2 text-sm font-semibold ${
                recordMode === "batting"
                  ? "border-b-2 border-green-900 text-green-900"
                  : "text-gray-500 hover:text-gray-800"
              }`}
            >
              Batting
            </button>
            {canRecordPitching && (
              <button
                type="button"
                onClick={() => onSetRecordMode("pitching")}
                className={`px-4 py-2 text-sm font-semibold ${
                  recordMode === "pitching"
                    ? "border-b-2 border-green-900 text-green-900"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Pitching
              </button>
            )}
          </div>

          {recordMode === "batting" ? (
            <ScoreEntryPanel
              entry={currentEntry}
              onEntryChange={onEntryChange}
              onPrimaryAction={onPrimaryAction}
              primaryActionLabel={
                isEditingSavedEntry
                  ? "Update Saved Entry"
                  : editingPendingPlayerId
                    ? "Update Queued Entry"
                    : "Add Player Entry"
              }
              primaryActionDisabled={primaryActionDisabled}
              calculatedAvg={
                currentEntry.AB > 0
                  ? (currentEntry.H / currentEntry.AB).toFixed(3).replace("0.", ".")
                  : ".000"
              }
              showCancelEdit={isEditingSavedEntry || Boolean(editingPendingPlayerId)}
              onCancelEdit={isEditingSavedEntry ? onCancelEditSavedEntry : onCancelEditPendingEntry}
            />
          ) : (
            <div>
              <PitchingEntryPanel
                entry={pitchingEntry}
                onEntryChange={onPitchingEntryChange}
                onPrimaryAction={onPitchingPrimaryAction}
                primaryActionLabel={isEditingSavedPitchingEntry ? "Update Pitching" : "Save Pitching"}
                primaryActionDisabled={isPitchingSaveDisabled}
              />
              {isEditingSavedPitchingEntry && onCancelEditSavedPitchingEntry && (
                <button
                  type="button"
                  onClick={onCancelEditSavedPitchingEntry}
                  className="mt-3 w-full rounded-xl border border-gray-200 bg-white py-3 font-medium text-gray-700"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          )}
        </div>
      </div>{/* end CENTER */}

      {/* RIGHT */}
      <div className="space-y-4 sm:space-y-6">
        {recordMode === "batting" && (
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
                className="w-full rounded-lg border border-green-900 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50"
              >
                + Record New Game
              </button>
            )}
            <button
              onClick={onSave}
              disabled={isSaving || pendingEntries.length === 0 || isEditingSavedEntry}
              className="w-full rounded-lg bg-green-900 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSaving ? "Saving..." : isEditingSavedEntry ? "Finish editing entry first" : pendingEntries.length > 0 ? `Save Game (${pendingEntries.length})` : "Save Game"}
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
        )}

        {recordMode === "batting" && (
          <SavedEntriesList
            savedEntries={savedEntries}
            pitchingEntries={savedPitchingEntries}
            onEdit={onStartEditSavedEntry}
            onCancelEdit={onCancelEditSavedEntry}
            onDelete={onDeleteSavedEntry}
            editingSavedEntryId={editingSavedEntryId}
          />
        )}

        {recordMode === "pitching" && (
          <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <p className="text-sm font-semibold text-gray-900">Saved Pitching</p>
            {savedPitchingEntries.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No pitching records yet.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {savedPitchingEntries.map((entry) => (
                  <div key={entry.id} className="rounded-xl border border-gray-100 px-3 py-2.5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold">{entry.gameMeta.opponent}</p>
                        <p className="text-xs text-gray-400">{entry.gameMeta.date}</p>
                      </div>
                      <div className="text-right text-xs text-gray-600">
                        <p>{formatLiveInnings(entry.statLine.inningsPitchedOuts)} IP</p>
                        <p>{entry.statLine.earnedRuns} ER</p>
                      </div>
                    </div>
                    <div className="mt-2 flex gap-2">
                      {onStartEditSavedPitchingEntry && (
                        <button
                          type="button"
                          onClick={() => onStartEditSavedPitchingEntry(entry)}
                          className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700"
                        >
                          Edit
                        </button>
                      )}
                      {onDeleteSavedPitchingEntry && (
                        <button
                          type="button"
                          onClick={() => onDeleteSavedPitchingEntry(entry)}
                          className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
