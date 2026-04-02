import { useEffect, useState } from "react"
import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
} from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import SavedEntriesList from "./SavedEntriesList"

type RecordGamePageProps = {
  activePlayer: Player
  currentEntry: BattingEntryData
  gameMeta: DraftGameMeta
  savedEntries: SavedBattingGameEntry[]
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSave: () => void
}

// Record Game page focuses on entering and saving one game's batting data.
// The layout is intentionally simple so the user can move quickly
// from input to save without extra analysis noise.
export default function RecordGamePage({
  activePlayer,
  currentEntry,
  gameMeta,
  savedEntries,
  onGameMetaChange,
  onEntryChange,
  onSave,
}: RecordGamePageProps) {
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("")

  // Clears the success message whenever the form changes again.
  useEffect(() => {
    setSaveSuccessMessage("")
  }, [
    activePlayer,
    currentEntry,
    gameMeta.date,
    gameMeta.opponent,
    gameMeta.matchNumber,
    gameMeta.seasonYear,
  ])

  const handleSaveWithMessage = () => {
    onSave()
    setSaveSuccessMessage("Game saved successfully.")
  }

  return (
    <main className="flex-1 p-6 bg-gray-50">
      {/* Page header */}
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">Record Game</p>
        <h1 className="text-2xl font-bold mt-2">
          Enter today’s batting line
        </h1>
        <p className="text-gray-600 mt-2">
          Recording for {activePlayer.name} ({activePlayer.position})
        </p>

        {/* Quick game context summary */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Date: {gameMeta.date || "Not selected"}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Opponent: {gameMeta.opponent || "Not entered"}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Season: {gameMeta.seasonYear}
          </div>
          <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
            Match #{gameMeta.matchNumber}
          </div>
        </div>
      </div>

      {/* Main batting entry form */}
      <ScoreEntryPanel
        activePlayer={activePlayer}
        entry={currentEntry}
        gameMeta={gameMeta}
        onGameMetaChange={onGameMetaChange}
        onEntryChange={onEntryChange}
        onSave={handleSaveWithMessage}
        saveSuccessMessage={saveSuccessMessage}
      />

      {/* Recent saved entries for quick confirmation */}
      <SavedEntriesList
        savedEntries={savedEntries.slice(-3).reverse()}
        title="Recent Entries"
        emptyMessage="No games recorded yet. Save your first game to see it here."
      />
    </main>
  )
}