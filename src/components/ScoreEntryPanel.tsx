import type { BattingEntryData } from "../types"
import BattingStatFields from "./BattingStatFields"

type ScoreEntryPanelProps = {
  entry: BattingEntryData
  onEntryChange: (nextEntry: BattingEntryData) => void
  onPrimaryAction: () => void
  primaryActionLabel: string
  primaryActionDisabled: boolean
  calculatedAvg: string
  saveSuccessMessage?: string
  showCancelEdit?: boolean
  onCancelEdit?: () => void
}

export default function ScoreEntryPanel({
  entry,
  onEntryChange,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled,
  calculatedAvg,
  saveSuccessMessage,
  showCancelEdit = false,
  onCancelEdit,
}: ScoreEntryPanelProps) {
  return (
    <section>
      <p className="text-sm font-medium text-green-900">Batting Entry</p>

      <div className="mt-4">
        <BattingStatFields entry={entry} onEntryChange={onEntryChange} />
      </div>

      <div className="mt-6 flex items-center justify-between rounded-xl bg-gray-50 px-4 py-3">
        <span className="text-sm font-medium text-gray-600">Calculated AVG</span>
        <span className="text-lg font-bold text-green-900">{calculatedAvg}</span>
      </div>

      {saveSuccessMessage && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {saveSuccessMessage}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          disabled={primaryActionDisabled}
          onClick={onPrimaryAction}
          className="flex-1 rounded-xl bg-green-900 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400 disabled:opacity-80"
        >
          {primaryActionLabel}
        </button>

        {showCancelEdit && onCancelEdit && (
          <button
            type="button"
            onClick={onCancelEdit}
            className="rounded-xl border border-gray-300 px-4 py-3 font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        )}
      </div>
    </section>
  )
}
