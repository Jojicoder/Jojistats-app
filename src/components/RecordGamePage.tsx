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
  teamName: string
  seasonYear: number
}

export default function RecordGamePage({
  activePlayer,
  currentEntry,
  gameMeta,
  savedEntries,
  onGameMetaChange,
  onEntryChange,
  onSave,
  teamName,
  seasonYear,
}: RecordGamePageProps) {
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("")

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
    <main className="w-full">
      <div className="max-w-6xl">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">Record Game</p>
          <h1 className="mt-3 text-2xl font-bold">
            {activePlayer.jerseyNumber != null
              ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
              : activePlayer.name}
          </h1>
          <p className="mt-3 text-gray-600">
            {teamName} · Season {seasonYear} · {activePlayer.position}
          </p>
        </div>

        <div className="mt-6">
          <ScoreEntryPanel
            entry={currentEntry}
            gameMeta={gameMeta}
            onGameMetaChange={onGameMetaChange}
            onEntryChange={onEntryChange}
            onSave={handleSaveWithMessage}
            saveSuccessMessage={saveSuccessMessage}
          />
        </div>

        <div className="mt-6">
          <SavedEntriesList
            savedEntries={savedEntries.slice(-3).reverse()}
            title="Recent Entries"
            emptyMessage="No games recorded yet. Save your first game to see it here."
          />
        </div>
      </div>
    </main>
  )
}
