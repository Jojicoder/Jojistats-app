import { useEffect, useMemo, useState } from "react"
import type {
  Player,
  Position,
  BattingEntryData,
  PitchingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  PendingBattingEntry,
} from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import PitchingEntryPanel from "./PitchingEntryPanel"
import SavedEntriesList from "./SavedEntriesList"
import GameMetaFields from "./GameMetaFields"

type RecordGamePageProps = {
  activePlayer: Player
  currentEntry: BattingEntryData
  gameMeta: DraftGameMeta
  savedEntries: SavedBattingGameEntry[]
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSaveGame: (
    gameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => Promise<void>
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
  recordMode: "batting" | "pitching"
  setRecordMode: (mode: "batting" | "pitching") => void
  pitchingEntry: PitchingEntryData
  onPitchingEntryChange: (nextEntry: PitchingEntryData) => void
  onSavePitchingGame: () => void
  isPitchingSaveDisabled: boolean
}

const gamePositionOptions: Position[] = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","DH","UTIL",
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
  recordMode,
  setRecordMode,
  pitchingEntry,
  onPitchingEntryChange,
  onSavePitchingGame,
  isPitchingSaveDisabled,
}: RecordGamePageProps) {

  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)

  /* ---------------- POSITION ---------------- */

  const defaultGamePositions = useMemo(
    () =>
      isEditingSavedEntry && editingGamePositions?.length
        ? editingGamePositions
        : [activePlayer.position],
    [activePlayer.position, editingGamePositions, isEditingSavedEntry]
  )

  const [gamePositions, setGamePositions] = useState<Position[]>(defaultGamePositions)
  const canRecordPitching = gamePositions.includes("P")

  useEffect(() => {
    if (!canRecordPitching && recordMode === "pitching") {
      setRecordMode("batting")
    }
  }, [canRecordPitching, recordMode, setRecordMode])

  /* ---------------- VALIDATION ---------------- */

  const isMetaComplete =
    gameMeta.date.trim() !== "" && gameMeta.opponent.trim() !== ""

  const hasInvalidStats =
    currentEntry.H > currentEntry.AB ||
    currentEntry.doubles + currentEntry.triples + currentEntry.HR > currentEntry.H

  const isPlayerAlreadyAdded = pendingEntries.some(
    (entry) => entry.playerId === activePlayer.id
  )

  const canAdd =
    isMetaComplete && !hasInvalidStats && !isPlayerAlreadyAdded
  const primaryActionDisabled = isEditingSavedEntry
    ? !isMetaComplete || hasInvalidStats
    : !canAdd

  /* ---------------- HANDLERS ---------------- */

  const updateGamePosition = (index: number, nextPosition: Position) => {
    setGamePositions((prev) =>
      prev.map((position, currentIndex) =>
        currentIndex === index ? nextPosition : position
      )
    )
  }

  const addGamePosition = () => {
    setGamePositions((prev) => [...prev, activePlayer.position])
  }

  const removeGamePosition = (index: number) => {
    setGamePositions((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, currentIndex) => currentIndex !== index)
    )
  }

  const handleSetRecordMode = (nextMode: "batting" | "pitching") => {
    if (nextMode === "pitching" && !canRecordPitching) return
    setRecordMode(nextMode)
  }

  const handleAdd = () => {
    if (!canAdd) return

    setPendingEntries((prev) => [
      ...prev,
      {
        ...currentEntry,
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        gamePositions,
      },
    ])

    onEntryChange({
      AB: 0,H: 0,doubles: 0,triples: 0,HR: 0,RBI: 0,BB: 0,SO: 0,note: "",
    })
  }

  const handlePrimaryAction = () => {
    if (isEditingSavedEntry) {
      onUpdateSavedEntry(gameMeta, currentEntry)
      return
    }

    handleAdd()
  }

  const handleSave = async () => {
    if (!isMetaComplete || pendingEntries.length === 0) return

    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, pendingEntries)
      setPendingEntries([])
    } finally {
      setIsSaving(false)
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <main className="w-full">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">

        {/* LEFT */}
        <div className="space-y-6">

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <GameMetaFields
              gameMeta={gameMeta}
              onGameMetaChange={onGameMetaChange}
            />
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <h2 className="text-xl font-bold">
              {activePlayer.name}
            </h2>
            <p className="text-sm text-gray-600">
              {teamName} · {seasonYear} · {gamePositions.join(" / ")}
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
                      onChange={(event) =>
                        updateGamePosition(index, event.target.value as Position)
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

          {/* 🔥 Score Panel */}
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <div className="mb-4 flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => handleSetRecordMode("batting")}
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
                  onClick={() => handleSetRecordMode("pitching")}
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
                onPrimaryAction={handlePrimaryAction}
                primaryActionLabel={
                  isEditingSavedEntry ? "Update Saved Entry" : "Add Player Entry"
                }
                primaryActionDisabled={primaryActionDisabled}
                calculatedAvg={
                  currentEntry.AB > 0
                    ? (currentEntry.H / currentEntry.AB).toFixed(3).replace("0.", ".")
                    : ".000"
                }
                showCancelEdit={isEditingSavedEntry}
                onCancelEdit={onCancelEditSavedEntry}
              />
            ) : (
              <PitchingEntryPanel
                entry={pitchingEntry}
                onEntryChange={onPitchingEntryChange}
                onPrimaryAction={onSavePitchingGame}
                primaryActionLabel="Save Pitching"
                primaryActionDisabled={isPitchingSaveDisabled}
              />
            )}
          </div>

        </div>

        {/* RIGHT */}
        <div className="space-y-6">

          {recordMode === "batting" && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <button
                onClick={handleSave}
                disabled={isSaving || pendingEntries.length === 0}
                className="w-full rounded-lg bg-green-900 py-2 text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {isSaving ? "Saving..." : "Save Game"}
              </button>
            </div>
          )}

          {recordMode === "batting" && pendingEntries.length > 0 && (
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <p className="text-sm font-medium text-green-900">
                Current Game Entries
              </p>
              <div className="mt-3 space-y-2">
                {pendingEntries.map((entry) => (
                  <div
                    key={entry.playerId}
                    className="rounded-lg border border-gray-100 px-3 py-2 text-sm"
                  >
                    <p className="font-medium">{entry.playerName}</p>
                    <p className="text-gray-500">
                      AB {entry.AB} · H {entry.H} · HR {entry.HR} · RBI{" "}
                      {entry.RBI}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recordMode === "batting" && (
            <SavedEntriesList
              savedEntries={savedEntries}
              onEdit={onStartEditSavedEntry}
              onDelete={onDeleteSavedEntry}
              editingSavedEntryId={editingSavedEntryId}
            />
          )}

        </div>
      </div>
    </main>
  )
}
