import type { BattingEntryData } from "../types"

type BattingStatFieldsProps = {
  entry: BattingEntryData
  onEntryChange: (nextEntry: BattingEntryData) => void
}

export default function BattingStatFields({
  entry,
  onEntryChange,
}: BattingStatFieldsProps) {
  const hitDetailTotal = entry.doubles + entry.triples + entry.HR

  const handleIncrement = (field: keyof BattingEntryData) => {
    if (field === "H" && entry.H >= entry.AB) return

    if (
      (field === "doubles" || field === "triples" || field === "HR") &&
      hitDetailTotal >= entry.H
    ) {
      return
    }

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

    const nextHitDetailTotal =
      nextEntry.doubles + nextEntry.triples + nextEntry.HR

    if (nextHitDetailTotal > nextEntry.H) {
      let overflow = nextHitDetailTotal - nextEntry.H

      if (nextEntry.HR > 0) {
        const reduceBy = Math.min(nextEntry.HR, overflow)
        nextEntry.HR -= reduceBy
        overflow -= reduceBy
      }

      if (overflow > 0 && nextEntry.triples > 0) {
        const reduceBy = Math.min(nextEntry.triples, overflow)
        nextEntry.triples -= reduceBy
        overflow -= reduceBy
      }

      if (overflow > 0 && nextEntry.doubles > 0) {
        const reduceBy = Math.min(nextEntry.doubles, overflow)
        nextEntry.doubles -= reduceBy
      }
    }

    onEntryChange(nextEntry)
  }

  const mainFields: { label: keyof BattingEntryData }[] = [
    { label: "AB" },
    { label: "H" },
    { label: "RBI" },
    { label: "BB" },
    { label: "SO" },
  ]

  const hitDetailFields: { label: keyof BattingEntryData; display: string }[] = [
    { label: "doubles", display: "2B" },
    { label: "triples", display: "3B" },
    { label: "HR", display: "HR" },
  ]

  return (
    <div className="flex flex-col gap-4">
      {mainFields.map((field) => (
        <div key={field.label}>
          {field.label === "H" ? (
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <div className="flex items-center justify-between rounded-lg bg-white px-4 py-3">
                <span className="text-sm font-medium text-gray-600">H</span>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleDecrement("H")}
                    className="h-8 w-8 rounded-full bg-gray-100 text-gray-700 shadow-sm"
                  >
                    -
                  </button>

                  <span className="w-6 text-center font-semibold">
                    {entry.H}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleIncrement("H")}
                    className="h-8 w-8 rounded-full bg-green-900 text-white shadow-sm"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-4 rounded-lg bg-white px-4 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">
                      Hit Details
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      2B + 3B + HR cannot exceed H
                    </p>
                  </div>

                  <p className="text-xs font-medium text-gray-500">
                    Used {hitDetailTotal} / {entry.H}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  {hitDetailFields.map((detailField) => (
                    <div
                      key={detailField.label}
                      className="rounded-lg bg-gray-50 px-3 py-3"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <span className="text-sm font-medium text-gray-600">
                          {detailField.display}
                        </span>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleDecrement(detailField.label)}
                            className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm"
                          >
                            -
                          </button>

                          <span className="w-6 text-center font-semibold">
                            {entry[detailField.label]}
                          </span>

                          <button
                            type="button"
                            onClick={() => handleIncrement(detailField.label)}
                            className="h-8 w-8 rounded-full bg-green-900 text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
                            disabled={hitDetailTotal >= entry.H}
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
              <span className="text-sm font-medium text-gray-600">
                {field.label}
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDecrement(field.label)}
                  className="h-8 w-8 rounded-full bg-white text-gray-700 shadow-sm"
                >
                  -
                </button>

                <span className="w-6 text-center font-semibold">
                  {entry[field.label]}
                </span>

                <button
                  type="button"
                  onClick={() => handleIncrement(field.label)}
                  className="h-8 w-8 rounded-full bg-green-900 text-white shadow-sm"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}