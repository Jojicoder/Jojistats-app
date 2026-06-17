import type { PitchingEntryData } from "../types"

type Props = {
  entry: PitchingEntryData
  onEntryChange: (nextEntry: PitchingEntryData) => void
}

export default function PitchingStatFields({ entry, onEntryChange }: Props) {
  const updateNumber = (key: Exclude<keyof PitchingEntryData, "note">, value: number) => {
    onEntryChange({ ...entry, [key]: value })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Field label="Outs" value={entry.inningsPitchedOuts} onChange={(v) => updateNumber("inningsPitchedOuts", v)} />
        <Field label="H" value={entry.hitsAllowed} onChange={(v) => updateNumber("hitsAllowed", v)} />
        <Field label="R" value={entry.runsAllowed} onChange={(v) => updateNumber("runsAllowed", v)} />
        <Field label="ER" value={entry.earnedRuns} onChange={(v) => updateNumber("earnedRuns", v)} />
        <Field label="BB" value={entry.walks} onChange={(v) => updateNumber("walks", v)} />
        <Field label="HBP" value={entry.hitBatters} onChange={(v) => updateNumber("hitBatters", v)} />
        <Field label="SO" value={entry.strikeouts} onChange={(v) => updateNumber("strikeouts", v)} />
        <Field label="HR" value={entry.homeRunsAllowed} onChange={(v) => updateNumber("homeRunsAllowed", v)} />
      </div>

      <label className="block text-sm font-medium text-gray-700">
        Note
        <textarea
          value={entry.note}
          onChange={(e) => onEntryChange({ ...entry, note: e.target.value })}
          placeholder="Optional note for this pitching entry"
          rows={3}
          className="mt-1 w-full resize-none rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none"
        />
      </label>
    </div>
  )
}

function normalizeDigits(value: string) {
  return value.replace(/[０-９]/g, (char) => String.fromCharCode(char.charCodeAt(0) - 0xfee0))
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: number) => void
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="text"
        inputMode="numeric"
        value={value === 0 ? "" : String(value)}
        placeholder="0"
        onChange={(e) => {
          const raw = normalizeDigits(e.target.value).replace(/[^0-9]/g, "")
          onChange(raw === "" ? 0 : Number(raw))
        }}
        onFocus={(e) => e.target.select()}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-3 text-sm font-semibold outline-none sm:py-2"
      />
    </label>
  )
}
