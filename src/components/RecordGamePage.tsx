import { useEffect, useState } from "react"
import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  SavedBattingGameEntry,
} from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import SavedEntriesList from "./SavedEntriesList"
import GameMetaFields from "./GameMetaFields"

type RecordGamePageProps = {
  activePlayer: Player
  currentEntry: BattingEntryData
  gameMeta: DraftGameMeta
  savedEntries: SavedBattingGameEntry[]
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSaveGame: (gameMeta: DraftGameMeta, entries: PendingBattingEntry[]) => void
  teamName: string
  seasonYear: number
  isEditingSavedEntry: boolean
  editingSavedEntryId: string | null
  onStartEditSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  onUpdateSavedEntry: (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => void
  onCancelEditSavedEntry: () => void
}

export default function RecordGamePage({
  activePlayer,
  currentEntry,
  gameMeta,
  savedEntries,
  onGameMetaChange,
  onEntryChange,
  onSaveGame,
  teamName,
  seasonYear,
  isEditingSavedEntry,
  editingSavedEntryId,
  onStartEditSavedEntry,
  onUpdateSavedEntry,
  onCancelEditSavedEntry,
}: RecordGamePageProps) {
  const [statusMessage, setStatusMessage] = useState("")
  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])

  useEffect(() => {
    setStatusMessage("")
  }, [
    activePlayer.id,
    gameMeta.date,
    gameMeta.opponent,
    gameMeta.matchNumber,
    gameMeta.seasonYear,
  ])

  const isMetaComplete =
    gameMeta.date.trim() !== "" &&
    gameMeta.opponent.trim() !== ""

  const hasInvalidCurrentStats =
    currentEntry.H > currentEntry.AB || currentEntry.HR > currentEntry.H

  const isPlayerAlreadyAdded = pendingEntries.some(
    (entry) => entry.playerId === activePlayer.id
  )

  const canAddPlayerEntry =
    !isEditingSavedEntry &&
    isMetaComplete &&
    !hasInvalidCurrentStats &&
    !isPlayerAlreadyAdded

  const canUpdateSavedEntry =
    isEditingSavedEntry &&
    isMetaComplete &&
    !hasInvalidCurrentStats

  const currentAvg =
    currentEntry.AB > 0
      ? (currentEntry.H / currentEntry.AB).toFixed(3).replace("0.", ".")
      : ".000"

  const resetCurrentEntry = () => {
    onEntryChange({
      AB: 0,
      H: 0,
      HR: 0,
      RBI: 0,
      BB: 0,
      SO: 0,
    })
  }

  const handleAddPlayerEntry = () => {
    if (!canAddPlayerEntry) return

    const nextEntry: PendingBattingEntry = {
      ...currentEntry,
      playerId: activePlayer.id,
      playerName:
        activePlayer.jerseyNumber != null
          ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
          : activePlayer.name,
    }

    setPendingEntries((prev) => [...prev, nextEntry])
    resetCurrentEntry()
    setStatusMessage("Player entry added to this game.")
  }

  const handleRemovePendingEntry = (playerId: string) => {
    setPendingEntries((prev) =>
      prev.filter((entry) => entry.playerId !== playerId)
    )
    setStatusMessage("Player entry removed.")
  }

  const handleSaveGame = () => {
    if (!isMetaComplete || pendingEntries.length === 0 || isEditingSavedEntry) {
      return
    }

    onSaveGame(gameMeta, pendingEntries)
    setPendingEntries([])
    resetCurrentEntry()
    setStatusMessage("Game saved successfully.")
  }

  const handleUpdateSavedEntryClick = () => {
    if (!canUpdateSavedEntry) return

    onUpdateSavedEntry(gameMeta, currentEntry)
    setStatusMessage("Saved entry updated successfully.")
  }

  const handleCancelEditClick = () => {
    onCancelEditSavedEntry()
    setStatusMessage("Edit cancelled.")
  }

  return (
    <main className="w-full">
      <div className="max-w-7xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-green-900">Game Info</p>

              <div className="mt-4">
                <GameMetaFields
                  gameMeta={gameMeta}
                  onGameMetaChange={onGameMetaChange}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-green-900">Active Player</p>
              <h1 className="mt-3 text-2xl font-bold">
                {activePlayer.jerseyNumber != null
                  ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
                  : activePlayer.name}
              </h1>
              <p className="mt-3 text-gray-600">
                {teamName} · Season {seasonYear} · {activePlayer.position}
              </p>
            </div>

            {isMetaComplete ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
                {isEditingSavedEntry && (
                  <div className="mb-4 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
                    Editing saved entry for this player.
                  </div>
                )}

                <ScoreEntryPanel
                  entry={currentEntry}
                  onEntryChange={onEntryChange}
                  onPrimaryAction={
                    isEditingSavedEntry
                      ? handleUpdateSavedEntryClick
                      : handleAddPlayerEntry
                  }
                  primaryActionLabel={
                    isEditingSavedEntry
                      ? "Update Saved Entry"
                      : "Add Player Entry"
                  }
                  primaryActionDisabled={
                    isEditingSavedEntry ? !canUpdateSavedEntry : !canAddPlayerEntry
                  }
                  calculatedAvg={currentAvg}
                  saveSuccessMessage={statusMessage}
                  showCancelEdit={isEditingSavedEntry}
                  onCancelEdit={handleCancelEditClick}
                />

                {!isEditingSavedEntry && isPlayerAlreadyAdded && (
                  <p className="mt-3 text-sm text-amber-700">
                    This player has already been added to the current game.
                  </p>
                )}

                {hasInvalidCurrentStats && (
                  <p className="mt-3 text-sm text-red-600">
                    Invalid stats: Hits cannot exceed At-Bats, and Home Runs
                    cannot exceed Hits.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-yellow-50 p-6 text-sm text-yellow-800">
                Please enter Game Date and Opponent first.
              </div>
            )}
          </div>

          <div className="self-start space-y-6 xl:sticky xl:top-5">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Current Game Entries
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Review the players added to this game before saving.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveGame}
                  disabled={
                    !isMetaComplete ||
                    pendingEntries.length === 0 ||
                    isEditingSavedEntry
                  }
                  className="rounded-xl bg-green-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-80"
                >
                  Save Game
                </button>
              </div>

              {isEditingSavedEntry && (
                <p className="mt-3 text-sm text-amber-700">
                  Finish editing or cancel edit before saving the current game.
                </p>
              )}

              {pendingEntries.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">
                  No player entries have been added to this game yet.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {pendingEntries.map((entry) => (
                    <div
                      key={entry.playerId}
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">{entry.playerName}</p>
                        <p className="mt-1 text-gray-500">
                          AB {entry.AB} · H {entry.H} · HR {entry.HR} · RBI{" "}
                          {entry.RBI} · BB {entry.BB} · SO {entry.SO}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemovePendingEntry(entry.playerId)}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <SavedEntriesList
              savedEntries={savedEntries.slice(-3).reverse()}
              title="Recent Entries"
              emptyMessage="No games recorded yet. Save your first game to see it here."
              onEdit={onStartEditSavedEntry}
              editingSavedEntryId={editingSavedEntryId}
            />
          </div>
        </div>
      </div>
    </main>
  )
}