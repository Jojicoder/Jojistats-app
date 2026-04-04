import type { BattingEntryData, DraftGameMeta } from "../types"
import GameMetaFields from "./GameMetaFields"
import BattingStatFields from "./BattingStatFields"

type ScoreEntryPanelProps = {
  entry: BattingEntryData
  gameMeta: DraftGameMeta
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSave: () => void
  saveSuccessMessage?: string
}

export default function ScoreEntryPanel({
  entry,
  gameMeta,
  onGameMetaChange,
  onEntryChange,
  onSave,
  saveSuccessMessage,
}: ScoreEntryPanelProps) {
  const avg =
    entry.AB > 0
      ? (entry.H / entry.AB).toFixed(3).replace("0.", ".")
      : ".000"

  const hasInvalidStats = entry.H > entry.AB || entry.HR > entry.H
  const hasMissingOpponent = gameMeta.opponent.trim() === ""
  const hasMissingDate = gameMeta.date.trim() === ""

  const isSaveDisabled =
    hasInvalidStats || hasMissingOpponent || hasMissingDate

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <GameMetaFields
        gameMeta={gameMeta}
        onGameMetaChange={onGameMetaChange}
      />

      <BattingStatFields
        entry={entry}
        onEntryChange={onEntryChange}
      />

      <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-600">Calculated AVG</span>
        <span className="text-lg font-bold text-green-900">{avg}</span>
      </div>

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
          Invalid stats: Hits cannot exceed At-Bats, and Home Runs cannot exceed Hits.
        </p>
      )}

      {saveSuccessMessage && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {saveSuccessMessage}
        </p>
      )}

      <button
        disabled={isSaveDisabled}
        onClick={onSave}
        className="mt-6 w-full rounded-xl bg-green-900 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-80"
      >
        Save Game
      </button>
    </section>
  )
}
