import type { DraftGameMeta } from "../types"

// Props for the game metadata input section.
// This component edits game-level fields such as date, opponent,
// season year, and match number.
type GameMetaFieldsProps = {
  gameMeta: DraftGameMeta
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  showLocation?: boolean
  showMemo?: boolean
  showScore?: boolean
  teamName?: string
}

// Available season year options shown in the picker.
// This keeps the UI simple while still allowing manual override.
const seasonOptions = [2024, 2025, 2026, 2027, 2028]

// Renders the inputs for game metadata.
// Date is the primary source of truth for the year,
// and seasonYear is auto-synced when the date changes.
export default function GameMetaFields({
  gameMeta,
  onGameMetaChange,
  showLocation = false,
  showMemo = false,
  showScore = false,
  teamName = "Team",
}: GameMetaFieldsProps) {
  const handleDateChange = (nextDate: string) => {
    const derivedYear =
      nextDate.trim() !== "" ? Number(nextDate.slice(0, 4)) : gameMeta.seasonYear

    onGameMetaChange({
      ...gameMeta,
      date: nextDate,
      seasonYear: derivedYear,
    })
  }

  const handleScoreChange = (
    scoreKey: "teamScore" | "opponentScore",
    value: string
  ) => {
    const nextValue = value === "" ? null : Math.max(0, Number(value))
    const nextMeta = {
      ...gameMeta,
      [scoreKey]: Number.isFinite(nextValue) ? nextValue : null,
    }
    const teamScore = scoreKey === "teamScore" ? nextValue : nextMeta.teamScore
    const opponentScore =
      scoreKey === "opponentScore" ? nextValue : nextMeta.opponentScore

    onGameMetaChange({
      ...nextMeta,
      result:
        teamScore == null || opponentScore == null
          ? gameMeta.result ?? ""
          : teamScore > opponentScore
            ? "W"
            : teamScore < opponentScore
              ? "L"
              : "T",
    })
  }

  return (
    <>
      {/* Primary game metadata fields */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Game Date</label>
          <input
            type="date"
            value={gameMeta.date}
            onChange={(e) => handleDateChange(e.target.value)}
            className="rounded-lg border border-gray-200 px-3 py-2"
          />
        </div>

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

      {/* Secondary metadata fields */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:mb-6 sm:grid-cols-2 sm:gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-gray-600">Season Year</label>
          <select
            value={gameMeta.seasonYear}
            onChange={(e) =>
              onGameMetaChange({
                ...gameMeta,
                seasonYear: Number(e.target.value),
              })
            }
            className="rounded-lg border border-gray-200 bg-white px-3 py-2"
          >
            {seasonOptions.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400">
            Auto-filled from Game Date. You can override it if needed.
          </p>
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

      {(showLocation || showMemo) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          {showLocation && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">Location</label>
              <input
                type="text"
                value={gameMeta.location ?? ""}
                onChange={(e) =>
                  onGameMetaChange({ ...gameMeta, location: e.target.value })
                }
                placeholder="e.g. Home field"
                className="rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          )}

          {showMemo && (
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium text-gray-600">Memo</label>
              <textarea
                value={gameMeta.memo ?? ""}
                onChange={(e) =>
                  onGameMetaChange({ ...gameMeta, memo: e.target.value })
                }
                rows={3}
                placeholder="Game memo..."
                className="resize-none rounded-lg border border-gray-200 px-3 py-2"
              />
            </div>
          )}
        </div>
      )}

      {showScore && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600">
              {teamName} Score
            </label>
            <input
              type="number"
              min={0}
              value={gameMeta.teamScore ?? ""}
              onChange={(e) => handleScoreChange("teamScore", e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600">Opponent Score</label>
            <input
              type="number"
              min={0}
              value={gameMeta.opponentScore ?? ""}
              onChange={(e) => handleScoreChange("opponentScore", e.target.value)}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600">Result</label>
            <select
              value={gameMeta.result ?? ""}
              onChange={(e) =>
                onGameMetaChange({
                  ...gameMeta,
                  result: e.target.value as DraftGameMeta["result"],
                })
              }
              className="rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              <option value="">Not set</option>
              <option value="W">Win</option>
              <option value="L">Loss</option>
              <option value="T">Tie</option>
            </select>
          </div>
        </div>
      )}
    </>
  )
}
