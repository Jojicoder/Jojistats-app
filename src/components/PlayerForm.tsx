import { useState } from "react"
import type { Player, PitchingRole, Position } from "../types"

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
  const [selectedPositions, setSelectedPositions] = useState<Position[]>(
    initialPlayer?.positions ?? ["UTIL"]
  )
  const [jerseyNumber, setJerseyNumber] = useState(
    initialPlayer?.jerseyNumber != null ? String(initialPlayer.jerseyNumber) : ""
  )
  const [pitchingRole, setPitchingRole] = useState<PitchingRole | "">(
    initialPlayer?.pitchingRole ?? ""
  )

  const togglePosition = (pos: Position) => {
    setSelectedPositions((prev) =>
      prev.includes(pos)
        ? prev.length > 1 ? prev.filter((p) => p !== pos) : prev
        : [...prev, pos]
    )
  }

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
            positions: ["UTIL" as const],
            jerseyNumber: null,
            seasonYear,
            isArchived: false,
          }

    onSave({
      ...basePlayer,
      teamId,
      seasonYear: initialPlayer?.seasonYear ?? seasonYear,
      name: name.trim(),
      positions: selectedPositions,
      jerseyNumber: jerseyNumber.trim() === "" ? null : Number(jerseyNumber),
      isArchived: initialPlayer?.isArchived ?? false,
      pitchingRole: selectedPositions.includes("P") && pitchingRole !== "" ? pitchingRole : null,
    })

    if (mode === "add") {
      setName("")
      setSelectedPositions(["UTIL"])
      setJerseyNumber("")
      setPitchingRole("")
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
          <div className="flex flex-wrap gap-1.5">
            {positionOptions.map((pos) => (
              <button
                key={pos}
                type="button"
                onClick={() => togglePosition(pos)}
                className={`rounded-md px-2.5 py-1 text-xs font-semibold transition ${
                  selectedPositions.includes(pos)
                    ? "bg-green-900 text-white"
                    : "border border-gray-200 text-gray-600 hover:border-green-900 hover:text-green-900"
                }`}
              >
                {pos}
              </button>
            ))}
          </div>
        </div>

        {selectedPositions.includes("P") && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium text-gray-500">Pitching Role</label>
            <select
              value={pitchingRole}
              onChange={(e) => setPitchingRole(e.target.value as PitchingRole | "")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">— Not set —</option>
              <option value="starter">Starter</option>
              <option value="reliever">Reliever</option>
              <option value="closer">Closer</option>
            </select>
          </div>
        )}
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
