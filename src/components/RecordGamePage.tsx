import { useMemo, useState } from "react"
import type {
  Player,
  Position,
  BattingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  PendingBattingEntry,
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
  onDeleteSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  editingGamePositions?: Position[]
}

const gamePositionOptions: Position[] = [
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "UTIL",
]

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
  onDeleteSavedEntry,
  editingGamePositions,
}: RecordGamePageProps) {
  const currentStatusKey = [
    activePlayer.id,
    gameMeta.date,
    gameMeta.opponent,
    gameMeta.matchNumber,
    gameMeta.seasonYear,
  ].join("|")
  const [statusMessageState, setStatusMessageState] = useState({
    key: currentStatusKey,
    message: "",
  })
  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>(
    []
  )
  const gamePositionsKey = isEditingSavedEntry
    ? `edit:${editingSavedEntryId ?? "new"}`
    : `player:${activePlayer.id}:${activePlayer.position}`
  const defaultGamePositions = useMemo(
    () =>
      isEditingSavedEntry && editingGamePositions?.length
        ? editingGamePositions
        : [activePlayer.position],
    [activePlayer.position, editingGamePositions, isEditingSavedEntry]
  )
  const [gamePositionsState, setGamePositionsState] = useState<{
    key: string
    positions: Position[]
  }>({
    key: gamePositionsKey,
    positions: defaultGamePositions,
  })

  const statusMessage =
    statusMessageState.key === currentStatusKey ? statusMessageState.message : ""
  const gamePositions =
    gamePositionsState.key === gamePositionsKey
      ? gamePositionsState.positions
      : defaultGamePositions

  const setStatusMessage = (message: string) => {
    setStatusMessageState({
      key: currentStatusKey,
      message,
    })
  }

  const addGamePosition = () => {
    setGamePositionsState({
      key: gamePositionsKey,
      positions: [...gamePositions, activePlayer.position],
    })
  }

  const updateGamePosition = (index: number, nextPosition: Position) => {
    setGamePositionsState({
      key: gamePositionsKey,
      positions: gamePositions.map((position, currentIndex) =>
        currentIndex === index ? nextPosition : position
      ),
    })
  }

  const removeGamePosition = (index: number) => {
    setGamePositionsState({
      key: gamePositionsKey,
      positions:
        gamePositions.length === 1
          ? gamePositions
          : gamePositions.filter((_, currentIndex) => currentIndex !== index),
    })
  }

  const formattedGamePositions = gamePositions.join(" / ")

  const isMetaComplete =
    gameMeta.date.trim() !== "" && gameMeta.opponent.trim() !== ""

  const hasInvalidCurrentStats =
    currentEntry.H > currentEntry.AB ||
    currentEntry.doubles + currentEntry.triples + currentEntry.HR >
      currentEntry.H

  const isPlayerAlreadyAdded = pendingEntries.some(
    (entry) => entry.playerId === activePlayer.id
  )

  const canAddPlayerEntry =
    isMetaComplete && !hasInvalidCurrentStats && !isPlayerAlreadyAdded

  const currentAvg =
    currentEntry.AB > 0
      ? (currentEntry.H / currentEntry.AB).toFixed(3).replace("0.", ".")
      : ".000"

  const resetCurrentEntry = () => {
    onEntryChange({
      AB: 0,
      H: 0,
      doubles: 0,
      triples: 0,
      HR: 0,
      RBI: 0,
      BB: 0,
      SO: 0,
      note: "",
    })
    setGamePositionsState({
      key: gamePositionsKey,
      positions: [activePlayer.position],
    })
  }

  const handleAddPlayerEntry = () => {
    if (!canAddPlayerEntry) return

    const nextEntry: PendingBattingEntry = {
      ...currentEntry,
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      gamePositions,
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
    if (!isMetaComplete || pendingEntries.length === 0) return

    onSaveGame(gameMeta, pendingEntries)
    setPendingEntries([])
    resetCurrentEntry()
    setStatusMessage("Game saved successfully.")
  }

  const handlePrimaryAction = () => {
    if (isEditingSavedEntry) {
      onUpdateSavedEntry(gameMeta, currentEntry)
      setStatusMessage("Saved entry updated.")
      return
    }

    handleAddPlayerEntry()
  }

  const primaryActionLabel = isEditingSavedEntry
    ? "Update Saved Entry"
    : "Add Player Entry"

  const primaryActionDisabled = isEditingSavedEntry
    ? !isMetaComplete || hasInvalidCurrentStats
    : !canAddPlayerEntry

  return (
    <main className="w-full">
      <div className="max-w-7xl">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <p className="text-sm font-medium text-green-900">Game Info</p>

              <div className="mt-4">
                <GameMetaFields
                  gameMeta={gameMeta}
                  onGameMetaChange={onGameMetaChange}
                />
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <p className="text-sm font-medium text-green-900">Active Player</p>

              <h1 className="mt-3 text-2xl font-bold">
                {activePlayer.jerseyNumber != null
                  ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
                  : activePlayer.name}
              </h1>

              <p className="mt-3 text-sm text-gray-600 sm:text-base">
                {teamName} · Season {seasonYear} · {formattedGamePositions}
              </p>

              <div className="mt-4 max-w-md">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-500">
                    Game Positions
                  </label>
                  <button
                    type="button"
                    onClick={addGamePosition}
                    className="text-xs font-medium text-green-900 hover:underline"
                  >
                    + Add Position
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  {gamePositions.map((position, index) => (
                    <div
                      key={`${position}-${index}`}
                      className="flex items-center gap-2"
                    >
                      <select
                        value={position}
                        onChange={(e) =>
                          updateGamePosition(index, e.target.value as Position)
                        }
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                      >
                        {gamePositionOptions.map((option) => (
                          <option key={`${option}-${index}`} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => removeGamePosition(index)}
                        disabled={gamePositions.length === 1}
                        className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {isMetaComplete ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <ScoreEntryPanel
                  entry={currentEntry}
                  onEntryChange={onEntryChange}
                  onPrimaryAction={handlePrimaryAction}
                  primaryActionLabel={primaryActionLabel}
                  primaryActionDisabled={primaryActionDisabled}
                  calculatedAvg={currentAvg}
                  saveSuccessMessage={statusMessage}
                  showCancelEdit={isEditingSavedEntry}
                  onCancelEdit={onCancelEditSavedEntry}
                />

                {isPlayerAlreadyAdded && !isEditingSavedEntry && (
                  <p className="mt-3 text-sm text-amber-700">
                    This player has already been added to the current game.
                  </p>
                )}

                {hasInvalidCurrentStats && (
                  <p className="mt-3 text-sm text-red-600">
                    Invalid stats: Hits cannot exceed At-Bats, and 2B + 3B + HR
                    cannot exceed Hits.
                  </p>
                )}
              </div>
            ) : (
              <div className="rounded-2xl bg-yellow-50 p-4 text-sm text-yellow-800 sm:p-6">
                Please enter Game Date and Opponent first.
              </div>
            )}
          </div>

          <div className="self-start space-y-6 xl:sticky xl:top-5">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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
                  disabled={!isMetaComplete || pendingEntries.length === 0}
                  className="rounded-xl bg-green-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-80"
                >
                  Save Game
                </button>
              </div>

              {pendingEntries.length > 0 && (
                <div className="mt-6 space-y-3">
                  {pendingEntries.map((entry) => (
                    <div
                      key={entry.playerId}
                      className="flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">
                          {entry.playerName} · {entry.gamePositions.join(" / ")}
                        </p>
                        <div className="mt-1 space-y-1 text-sm text-gray-500">
                          <p>
                            AB {entry.AB} · H {entry.H} · 2B {entry.doubles} ·
                            3B {entry.triples} · HR {entry.HR}
                          </p>
                          <p>
                            RBI {entry.RBI} · BB {entry.BB} · SO {entry.SO}
                          </p>
                        </div>
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
              savedEntries={savedEntries.slice().reverse()}
              title="Recent Entries"
              emptyMessage="No games recorded yet. Save your first game to see it here."
              onEdit={onStartEditSavedEntry}
              onDelete={onDeleteSavedEntry}
              editingSavedEntryId={editingSavedEntryId}
            />
          </div>
        </div>
      </div>
    </main>
  )
}
