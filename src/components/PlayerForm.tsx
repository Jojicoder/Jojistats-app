import { useState } from "react"
import type { Player, Position } from "../types"

type PlayerFormProps = {
  teamId: string
  seasonYear: number
  mode: "add" | "edit"
  initialPlayer?: Player | null
  onSave: (player: Player) => void
  onCancel?: () => void
}


const createPlayerId = () => {
  return `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

const positionOptions: Position[] = [
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "UTIL",
]

export default function PlayerForm({
  teamId,
  seasonYear,
  mode,
  initialPlayer = null,
  onSave,
  onCancel,
}: PlayerFormProps) {
  const [name, setName] = useState(initialPlayer?.name ?? "")
  const [position, setPosition] = useState<Position>(
    initialPlayer?.position ?? "UTIL"
  )
  const [jerseyNumber, setJerseyNumber] = useState(
    initialPlayer?.jerseyNumber != null ? String(initialPlayer.jerseyNumber) : ""
  )

  const isDisabled = name.trim() === ""

  const handleSubmit = () => {
    if (isDisabled) return

    const basePlayer: Player =
      mode === "edit" && initialPlayer
        ? initialPlayer
        : {
            id: createPlayerId(),
            teamId,
            name: "",
            position: "UTIL",
            jerseyNumber: null,
            seasonYear,
            isArchived: false,
          }

    onSave({
      ...basePlayer,
      teamId,
      seasonYear: initialPlayer?.seasonYear ?? seasonYear,
      name: name.trim(),
      position,
      jerseyNumber: jerseyNumber.trim() === "" ? null : Number(jerseyNumber),
      isArchived: initialPlayer?.isArchived ?? false,
    })

    if (mode === "add") {
      setName("")
      setPosition("UTIL")
      setJerseyNumber("")
    }
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        {mode === "add" ? "Add New Player" : "Edit Player"}
      </h3>

      <div className="flex flex-col gap-2.5">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Player Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kenny"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Jersey Number</label>
          <input
            type="number"
            min={0}
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            placeholder="e.g. 7"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-gray-500">Position</label>
          <select
            value={position}
            onChange={(e) => setPosition(e.target.value as Position)}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
          >
            {positionOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isDisabled}
          className="flex-1 rounded-lg bg-green-900 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
        >
          {mode === "add" ? "Save Player" : "Update Player"}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm text-gray-700"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  )
}
