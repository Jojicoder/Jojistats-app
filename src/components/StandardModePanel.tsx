import type { Player, Position, BattingEntryData, PitchingEntryData, DraftGameMeta, SavedBattingGameEntry, SavedPitchingGameEntry, PendingBattingEntry, PendingPitchingEntry } from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import PitchingEntryPanel from "./PitchingEntryPanel"
import SavedEntriesList from "./SavedEntriesList"
import GameMetaFields from "./GameMetaFields"
import PendingEntriesPanel from "./PendingEntriesPanel"
import SavedPitchingPanel from "./SavedPitchingPanel"
import { gamePositionOptions } from "./RecordGamePage.utils"

// ---- Prop groups ----

type RosterProps = {
  showRosterPanel: boolean
  activePlayer: Player
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
}

type PlayerCardProps = {
  teamName: string
  seasonYear: number
  gamePositions: Position[]
  onAddGamePosition: () => void
  onUpdateGamePosition: (index: number, pos: Position) => void
  onRemoveGamePosition: (index: number) => void
}

type EntryFormProps = {
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
  editingPendingPlayerId?: string | null
  onCancelEditPendingEntry?: () => void
}

type PendingProps = {
  pendingEntries: PendingBattingEntry[]
  pendingPitchingEntries: PendingPitchingEntry[]
  editingPendingPlayerId?: string | null
  onStartEditPendingEntry?: (entry: PendingBattingEntry) => void
  onRemovePendingEntry?: (playerId: string) => void
  onRemovePendingPitchingEntry?: (playerId: string) => void
  isSaving: boolean
  onSave: () => void
  saveError?: string
  saveSuccess?: string
  onClearSaveError?: () => void
  onNewGame?: () => void
}

type SavedProps = {
  savedEntries: SavedBattingGameEntry[]
  savedPitchingEntries: SavedPitchingGameEntry[]
  editingSavedEntryId: string | null
  editingSavedPitchingEntryId?: string | null
  onStartEditSavedEntry: (entry: SavedBattingGameEntry) => void
  onDeleteSavedEntry: (entry: SavedBattingGameEntry) => void
  onStartEditSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void
  onDeleteSavedPitchingEntry?: (entry: SavedPitchingGameEntry) => void | Promise<void>
}

export type StandardModePanelProps =
  RosterProps &
  PlayerCardProps &
  EntryFormProps &
  PendingProps &
  SavedProps & {
    gameMeta: DraftGameMeta
    onGameMetaChange: (meta: DraftGameMeta) => void
  }

export default function StandardModePanel({
  // roster
  showRosterPanel, activePlayer, allPlayers, onSelectPlayer,
  // meta
  gameMeta, onGameMetaChange, teamName, seasonYear,
  // positions
  gamePositions, onAddGamePosition, onUpdateGamePosition, onRemoveGamePosition,
  // entry form
  recordMode, onSetRecordMode, canRecordPitching,
  currentEntry, onEntryChange, onPrimaryAction, primaryActionDisabled,
  isEditingSavedEntry, isEditingSavedPitchingEntry, onCancelEditSavedEntry,
  pitchingEntry, onPitchingEntryChange, onPitchingPrimaryAction, isPitchingSaveDisabled,
  onCancelEditSavedPitchingEntry, editingPendingPlayerId, onCancelEditPendingEntry,
  // pending
  pendingEntries, pendingPitchingEntries,
  onStartEditPendingEntry, onRemovePendingEntry, onRemovePendingPitchingEntry,
  isSaving, onSave, saveError, saveSuccess, onClearSaveError, onNewGame,
  // saved
  savedEntries, savedPitchingEntries, editingSavedEntryId, editingSavedPitchingEntryId,
  onStartEditSavedEntry, onDeleteSavedEntry,
  onStartEditSavedPitchingEntry, onDeleteSavedPitchingEntry,
}: StandardModePanelProps) {
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
        <div className="h-fit rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:self-start">
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
                    {player.positions.join(", ")}
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
                    onChange={(event) => {
                      const nextPosition = event.target.value as Position
                      onUpdateGamePosition(index, nextPosition)
                    }}
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

        {/* Batting / Pitching entry form */}
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
              saveSuccessMessage={saveSuccess}
              saveErrorMessage={isEditingSavedEntry || Boolean(editingPendingPlayerId) ? saveError : undefined}
              showCancelEdit={isEditingSavedEntry || Boolean(editingPendingPlayerId)}
              onCancelEdit={isEditingSavedEntry ? onCancelEditSavedEntry : onCancelEditPendingEntry}
            />
          ) : (
            <div>
              {isEditingSavedEntry && (
                <div className="mb-4 flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
                  <p className="text-xs font-semibold text-amber-700">Editing batting entry</p>
                  <button
                    type="button"
                    onClick={onCancelEditSavedEntry}
                    className="rounded-lg bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200"
                  >
                    Cancel Edit
                  </button>
                </div>
              )}
              <PitchingEntryPanel
                entry={pitchingEntry}
                onEntryChange={onPitchingEntryChange}
                onPrimaryAction={onPitchingPrimaryAction}
                primaryActionLabel={
                  isEditingSavedEntry
                    ? "Save Players & Scores"
                    : isEditingSavedPitchingEntry
                      ? "Update Pitching"
                      : "Add Pitching Entry"
                }
                primaryActionDisabled={isPitchingSaveDisabled}
                saveSuccessMessage={saveSuccess}
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
      </div>

      {/* RIGHT */}
      <div className="space-y-4 sm:space-y-6">
        <PendingEntriesPanel
          allPlayers={allPlayers}
          onSelectPlayer={onSelectPlayer}
          gameMeta={gameMeta}
          pendingEntries={pendingEntries}
          pendingPitchingEntries={pendingPitchingEntries}
          editingPendingPlayerId={editingPendingPlayerId}
          onStartEditPendingEntry={onStartEditPendingEntry}
          onRemovePendingEntry={onRemovePendingEntry}
          onRemovePendingPitchingEntry={onRemovePendingPitchingEntry}
          isEditingSavedEntry={isEditingSavedEntry}
          isSaving={isSaving}
          onSave={onSave}
          saveError={saveError}
          onClearSaveError={onClearSaveError}
          onNewGame={onNewGame}
        />

        {(recordMode === "batting" || isEditingSavedEntry) && (
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
          <SavedPitchingPanel
            savedPitchingEntries={savedPitchingEntries}
            battingEntries={savedEntries}
            editingSavedPitchingEntryId={editingSavedPitchingEntryId}
            onStartEdit={onStartEditSavedPitchingEntry}
            onCancelEdit={onCancelEditSavedPitchingEntry}
            onDelete={onDeleteSavedPitchingEntry}
          />
        )}
      </div>
    </div>
  )
}
