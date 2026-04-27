import type { PitchingEntryData } from "../types"

type Props = {
  entry: PitchingEntryData
  onEntryChange: (nextEntry: PitchingEntryData) => void
}

export default function PitchingStatFields({ entry, onEntryChange }: Props) {
  const updateNumber = (key: keyof PitchingEntryData, value: string) => {
    onEntryChange({
      ...entry,
      [key]: Number(value) || 0,
    })
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <Field label="Outs" value={entry.inningsPitchedOuts} onChange={(v) => updateNumber("inningsPitchedOuts", v)} />
      <Field label="H" value={entry.hitsAllowed} onChange={(v) => updateNumber("hitsAllowed", v)} />
      <Field label="R" value={entry.runsAllowed} onChange={(v) => updateNumber("runsAllowed", v)} />
      <Field label="ER" value={entry.earnedRuns} onChange={(v) => updateNumber("earnedRuns", v)} />
      <Field label="BB" value={entry.walks} onChange={(v) => updateNumber("walks", v)} />
      <Field label="SO" value={entry.strikeouts} onChange={(v) => updateNumber("strikeouts", v)} />
      <Field label="HR" value={entry.homeRunsAllowed} onChange={(v) => updateNumber("homeRunsAllowed", v)} />
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-sm font-medium text-gray-700">
      {label}
      <input
        type="number"
        min={0}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
      />
    </label>
  )
}