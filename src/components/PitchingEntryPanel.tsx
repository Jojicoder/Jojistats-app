import type { PitchingEntryData } from "../types"
import PitchingStatFields from "./PitchingStatFields"

type Props = {
  entry: PitchingEntryData
  onEntryChange: (nextEntry: PitchingEntryData) => void
  onPrimaryAction: () => void
  primaryActionLabel: string
  primaryActionDisabled: boolean
  saveSuccessMessage?: string
}

export default function PitchingEntryPanel({
  entry,
  onEntryChange,
  onPrimaryAction,
  primaryActionLabel,
  primaryActionDisabled,
  saveSuccessMessage,
}: Props) {
  return (
    <section>
      <p className="text-sm font-medium text-green-900">Pitching Entry</p>

      <div className="mt-4">
        <PitchingStatFields entry={entry} onEntryChange={onEntryChange} />
      </div>

      {saveSuccessMessage && (
        <p className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          {saveSuccessMessage}
        </p>
      )}

      <button
        type="button"
        disabled={primaryActionDisabled}
        onClick={onPrimaryAction}
        className="mt-6 w-full rounded-xl bg-green-900 py-3 font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-400"
      >
        {primaryActionLabel}
      </button>
    </section>
  )
}