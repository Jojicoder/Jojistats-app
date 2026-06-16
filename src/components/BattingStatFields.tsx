import { useState } from "react"
import type { BattingEntryData } from "../types"

type BattingStatFieldsProps = {
  entry: BattingEntryData
  onEntryChange: (nextEntry: BattingEntryData) => void
}

const fieldDescriptions: Record<string, string> = {
  AB:  "At Bats",
  RBI: "Runs Batted In",
  BB:  "Walks",
  HBP: "Hit By Pitch",
  SF:  "Sacrifice Flies",
  SO:  "Strikeouts",
  "1B": "Singles",
  "2B": "Doubles",
  "3B": "Triples",
  HR:  "Home Runs",
}

export default function BattingStatFields({
  entry,
  onEntryChange,
}: BattingStatFieldsProps) {
  const [singles, setSingles] = useState(
    Math.max(0, entry.H - entry.doubles - entry.triples - entry.HR)
  )

  const totalHits = singles + entry.doubles + entry.triples + entry.HR

  const updateHit = (
    field: "singles" | "doubles" | "triples" | "HR",
    delta: 1 | -1
  ) => {
    let nextSingles = singles
    let nextDoubles = entry.doubles
    let nextTriples = entry.triples
    let nextHR = entry.HR

    if (field === "singles")  nextSingles  = Math.max(0, singles + delta)
    if (field === "doubles")  nextDoubles  = Math.max(0, entry.doubles + delta)
    if (field === "triples")  nextTriples  = Math.max(0, entry.triples + delta)
    if (field === "HR")       nextHR       = Math.max(0, entry.HR + delta)

    const nextTotal = nextSingles + nextDoubles + nextTriples + nextHR
    if (delta === 1 && nextTotal > entry.AB) return

    setSingles(nextSingles)
    onEntryChange({
      ...entry,
      H: nextTotal,
      doubles: nextDoubles,
      triples: nextTriples,
      HR: nextHR,
    })
  }

  const handleIncrement = (field: keyof BattingEntryData) => {
    if (field === "note") return
    if (field === "AB") {
      onEntryChange({ ...entry, AB: entry.AB + 1 })
      return
    }
    onEntryChange({ ...entry, [field]: (entry[field] as number) + 1 })
  }

  const handleDecrement = (field: keyof BattingEntryData) => {
    if (field === "note") return
    const nextValue = Math.max(0, (entry[field] as number) - 1)
    const nextEntry: BattingEntryData = { ...entry, [field]: nextValue }

    if (field === "AB") {
      // If AB drops below total hits, reduce singles first
      const newTotal = singles + entry.doubles + entry.triples + entry.HR
      if (newTotal > nextValue) {
        const overflow = newTotal - nextValue
        const nextSingles = Math.max(0, singles - overflow)
        setSingles(nextSingles)
        nextEntry.H = nextSingles + entry.doubles + entry.triples + entry.HR
      }
    }

    onEntryChange(nextEntry)
  }

  const hitFields: { key: "singles" | "doubles" | "triples" | "HR"; display: string }[] = [
    { key: "singles",  display: "1B" },
    { key: "doubles",  display: "2B" },
    { key: "triples",  display: "3B" },
    { key: "HR",       display: "HR" },
  ]

  const hitValues: Record<string, number> = {
    singles,
    doubles: entry.doubles,
    triples: entry.triples,
    HR: entry.HR,
  }

  const otherFields: (keyof BattingEntryData)[] = ["RBI", "BB", "HBP", "SF", "SO"]

  return (
    <div className="flex flex-col gap-4">
      {/* AB */}
      <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-4 sm:px-4 sm:py-3">
        <div>
          <p className="text-sm font-semibold text-gray-700">AB</p>
          <p className="text-xs text-gray-400">{fieldDescriptions.AB}</p>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={() => handleDecrement("AB")} className="h-11 w-11 rounded-full bg-white text-gray-700 shadow-sm">-</button>
          <span className="w-8 text-center text-lg font-semibold">{entry.AB}</span>
          <button type="button" onClick={() => handleIncrement("AB")} className="h-11 w-11 rounded-full bg-green-900 text-white shadow-sm">+</button>
        </div>
      </div>

      {/* Hit type inputs — 1B/2B/3B/HR auto-calculate H */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">Hits</p>
            <p className="mt-0.5 text-xs text-gray-500">H = 1B + 2B + 3B + HR (auto)</p>
          </div>
          <p className="text-xs font-semibold text-gray-500">
            H <span className="text-green-900">{totalHits}</span> / AB {entry.AB}
          </p>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {hitFields.map(({ key, display }) => (
            <div key={key} className="rounded-lg bg-white px-3 py-3">
              <div className="flex flex-col items-center gap-2">
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-700">{display}</p>
                  <p className="text-[11px] text-gray-400">{fieldDescriptions[display]}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateHit(key, -1)}
                    className="h-10 w-10 rounded-full bg-gray-100 text-gray-700 shadow-sm"
                  >
                    -
                  </button>
                  <span className="w-8 text-center font-semibold">{hitValues[key]}</span>
                  <button
                    type="button"
                    onClick={() => updateHit(key, 1)}
                    disabled={totalHits >= entry.AB}
                    className="h-10 w-10 rounded-full bg-green-900 text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Other stat fields */}
      {otherFields.map((field) => (
        <div key={field} className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 px-3 py-4 sm:px-4 sm:py-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">{field}</p>
            <p className="text-xs text-gray-400">{fieldDescriptions[field]}</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => handleDecrement(field)} className="h-11 w-11 rounded-full bg-white text-gray-700 shadow-sm">-</button>
            <span className="w-8 text-center text-lg font-semibold">{entry[field]}</span>
            <button type="button" onClick={() => handleIncrement(field)} className="h-11 w-11 rounded-full bg-green-900 text-white shadow-sm">+</button>
          </div>
        </div>
      ))}

      {/* Note */}
      <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
        <label className="text-sm font-medium text-gray-700">Note</label>
        <p className="mt-1 text-xs text-gray-500">Optional note for this game entry</p>
        <textarea
          value={entry.note}
          onChange={(e) => onEntryChange({ ...entry, note: e.target.value })}
          placeholder="Example: Sac bunt, pinch hit, hard contact, defensive replacement"
          className="mt-3 min-h-24 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-green-700"
        />
      </div>
    </div>
  )
}
