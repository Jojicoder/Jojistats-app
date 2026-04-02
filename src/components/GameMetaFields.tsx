import type { DraftGameMeta } from "../types"

// Props for the game metadata input section.
// This component is responsible only for editing game-level fields,
// such as date, opponent, season year, and match number.
type GameMetaFieldsProps = {
  gameMeta: DraftGameMeta
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
}

// Renders the inputs for game metadata.
// It does not store state internally; it receives the current values
// and update handler from the parent component.
export default function GameMetaFields({
  gameMeta,
  onGameMetaChange,
}: GameMetaFieldsProps) {
  return (
    <>
      {/* Game-level metadata fields shown above the batting stat inputs */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Date input for the current game being recorded */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Game Date</label>
          <input
            type="date"
            value={gameMeta.date}
            onChange={(e) =>
              onGameMetaChange({ ...gameMeta, date: e.target.value })
            }
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        {/* Opponent name input for the current game */}
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Opponent</label>
          <input
            type="text"
            value={gameMeta.opponent}
            onChange={(e) =>
              onGameMetaChange({ ...gameMeta, opponent: e.target.value })
            }
            placeholder="e.g. Tigers"
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>
      </div>

      {/* Secondary game metadata fields for season structure */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Season Year</label>
          <input
            type="number"
            value={gameMeta.seasonYear}
            onChange={(e) =>
              onGameMetaChange({
                ...gameMeta,
                seasonYear: Number(e.target.value),
              })
            }
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Match Number</label>
          <input
            type="number"
            min={1}
            value={gameMeta.matchNumber}
            onChange={(e) =>
              onGameMetaChange({
                ...gameMeta,
                matchNumber: Math.max(1, Number(e.target.value)),
              })
            }
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>
      </div>
    </>
  )
}