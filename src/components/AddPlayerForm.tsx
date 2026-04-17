import { useState } from "react"
import type { Player, Position } from "../types"

type AddPlayerFormProps = {
  teamId: string
  seasonYear: number
  onAddPlayer: (player: Player) => void
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

export default function AddPlayerForm({
  teamId,
  seasonYear,
  onAddPlayer,
}: AddPlayerFormProps) {
  const [name, setName] = useState("")
  const [position, setPosition] = useState<Position>("UTIL")
  const [jerseyNumber, setJerseyNumber] = useState("")

  const isDisabled = name.trim() === ""

  const handleSubmit = () => {
    if (isDisabled) return

    onAddPlayer({
      id: createPlayerId(),
      teamId,
      name: name.trim(),
      position,
      jerseyNumber: jerseyNumber.trim() === "" ? null : Number(jerseyNumber),
      seasonYear,
      isArchived: false,
    })

    setName("")
    setPosition("UTIL")
    setJerseyNumber("")
  }

  return (
    <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-gray-700">
        Add New Player
      </h3>

      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">
            Player Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Kenny"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">
            Jersey Number
          </label>
          <input
            type="number"
            min={0}
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            placeholder="e.g. 7"
            className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-xs font-medium text-gray-500">
            Position
          </label>
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

      <button
        type="button"
        onClick={handleSubmit}
        disabled={isDisabled}
        className="mt-4 w-full rounded-lg bg-green-900 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:bg-gray-300"
      >
        Save Player
      </button>
    </div>
  )
}