import { useEffect, useState } from "react"
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
}: RecordGamePageProps) {
  const [statusMessage, setStatusMessage] = useState("")
  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>(
    []
  )
  const [gamePosition, setGamePosition] = useState<Position>(
    activePlayer.position
  )

  useEffect(() => {
    setStatusMessage("")
  }, [
    activePlayer,
    gameMeta.date,
    gameMeta.opponent,
    gameMeta.matchNumber,
    gameMeta.seasonYear,
  ])

  useEffect(() => {
    setGamePosition(activePlayer.position)
  }, [activePlayer.id, activePlayer.position])

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
    })
    setGamePosition(activePlayer.position)
  }

  const handleAddPlayerEntry = () => {
    if (!canAddPlayerEntry) return

    const nextEntry: PendingBattingEntry = {
      ...currentEntry,
      playerId: activePlayer.id,
      playerName: activePlayer.name,
      gamePosition,
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
                {teamName} · Season {seasonYear} · {gamePosition}
              </p>

              <div className="mt-4 max-w-xs">
                <label className="text-xs font-medium text-gray-500">
                  Game Position
                </label>
                <select
                  value={gamePosition}
                  onChange={(e) => setGamePosition(e.target.value as Position)}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  {gamePositionOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {isMetaComplete ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm">
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
                      className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3"
                    >
                      <div className="text-sm text-gray-700">
                        <p className="font-medium">
                          {entry.playerName} · {entry.gamePosition}
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
              savedEntries={savedEntries.slice(-3).reverse()}
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