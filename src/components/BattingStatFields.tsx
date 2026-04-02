import type { BattingEntryData } from "../types"

type BattingStatFieldsProps = {
  entry: BattingEntryData
  onEntryChange: (nextEntry: BattingEntryData) => void
}

export default function BattingStatFields({
  entry,
  onEntryChange,
}: BattingStatFieldsProps) {
  const handleIncrement = (field: keyof BattingEntryData) => {
    if (field === "H" && entry.H >= entry.AB) return
    if (field === "HR" && entry.HR >= entry.H) return

    onEntryChange({
      ...entry,
      [field]: entry[field] + 1,
    })
  }

  const handleDecrement = (field: keyof BattingEntryData) => {
    const nextValue = Math.max(0, entry[field] - 1)

    const nextEntry: BattingEntryData = {
      ...entry,
      [field]: nextValue,
    }

    if (field === "AB" && nextEntry.H > nextEntry.AB) {
      nextEntry.H = nextEntry.AB
    }

    if (field === "H") {
      nextEntry.HR = Math.min(nextEntry.HR, nextEntry.H)
    }

    if (field === "AB" && nextEntry.HR > nextEntry.H) {
      nextEntry.HR = nextEntry.H
    }

    onEntryChange(nextEntry)
  }

  const scoreFields: { label: keyof BattingEntryData }[] = [
    { label: "AB" },
    { label: "H" },
    { label: "HR" },
    { label: "RBI" },
    { label: "BB" },
    { label: "SO" },
  ]

  return (
    <div className="flex flex-col gap-4">
      {scoreFields.map((field) => (
        <div
          key={field.label}
          className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3"
        >
          <span className="text-sm font-medium text-gray-600">
            {field.label}
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={() => handleDecrement(field.label)}
              className="w-8 h-8 rounded-full bg-white shadow-sm text-gray-700"
            >
              -
            </button>

            <span className="w-6 text-center font-semibold">
              {entry[field.label]}
            </span>

            <button
              onClick={() => handleIncrement(field.label)}
              className="w-8 h-8 rounded-full bg-green-900 text-white shadow-sm"
            >
              +
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}