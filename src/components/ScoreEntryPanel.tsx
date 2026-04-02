import type { BattingEntryData, Player, DraftGameMeta } from "../types"
import GameMetaFields from "./GameMetaFields"
import BattingStatFields from "./BattingStatFields"

type ScoreEntryPanelProps = {
  activePlayer: Player
  entry: BattingEntryData
  gameMeta: DraftGameMeta
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSave: () => void
  saveSuccessMessage?: string
}

// Main batting record form for the selected player.
// This component coordinates game metadata, stat inputs,
// live AVG preview, validation, and the save action.
export default function ScoreEntryPanel({
  activePlayer,
  entry,
  gameMeta,
  onGameMetaChange,
  onEntryChange,
  onSave,
  saveSuccessMessage,
}: ScoreEntryPanelProps) {
  // Calculates batting average from the current draft entry.
  const avg =
    entry.AB > 0
      ? (entry.H / entry.AB).toFixed(3).replace("0.", ".")
      : ".000"

  // Basic stat validation rules for MVP scope.
  const hasInvalidStats = entry.H > entry.AB || entry.HR > entry.H

  // Game metadata validation.
  const hasMissingOpponent = gameMeta.opponent.trim() === ""
  const hasMissingDate = gameMeta.date.trim() === ""

  const isSaveDisabled =
    hasInvalidStats || hasMissingOpponent || hasMissingDate

  return (
    <section className="bg-white rounded-xl p-6 shadow-sm mt-6">
      {/* Section header for the batting record form */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Enter Your Score</h2>
        <span className="text-sm text-gray-500">
          Manual Entry - {activePlayer.name}
        </span>
      </div>

      {/* Game-level fields such as date and opponent */}
      <GameMetaFields
        gameMeta={gameMeta}
        onGameMetaChange={onGameMetaChange}
      />

      {/* Batting stat controls for the current draft entry */}
      <BattingStatFields
        entry={entry}
        onEntryChange={onEntryChange}
      />

      {/* Live batting average preview based on the current draft */}
      <div className="mt-6 bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
        <span className="text-sm font-medium text-gray-600">
          Calculated AVG
        </span>
        <span className="text-lg font-bold text-green-900">{avg}</span>
      </div>

      {/* Validation messages */}
      {hasMissingDate && (
        <p className="mt-3 text-sm text-red-600">
          Please select a game date before saving.
        </p>
      )}

      {hasMissingOpponent && (
        <p className="mt-3 text-sm text-red-600">
          Please enter an opponent before saving.
        </p>
      )}

      {hasInvalidStats && (
        <p className="mt-3 text-sm text-red-600">
          Invalid stats: Hits cannot exceed At-Bats, and Home Runs cannot exceed
          Hits.
        </p>
      )}

      {/* Save success message */}
      {saveSuccessMessage && (
        <p className="mt-3 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          {saveSuccessMessage}
        </p>
      )}

      {/* Save button */}
      <button
        disabled={isSaveDisabled}
        onClick={onSave}
        className="mt-6 w-full bg-green-900 text-white py-3 rounded-xl font-medium disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-80"
      >
        Save Game
      </button>
    </section>
  )
}