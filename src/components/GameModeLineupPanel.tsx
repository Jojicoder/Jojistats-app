import type { Player, PitchingEntryData } from "../types"
import type { LivePlay } from "./RecordGamePage.types"
import { formatLiveInnings, getPlayerLabel } from "./RecordGamePage.utils"

type Props = {
  allPlayers: Player[]
  lineupIds: string[]
  currentBatterIndex: number
  onCurrentBatterIndexChange: (n: number) => void
  onLineupChange: (index: number, playerId: string) => void
  onAddLineupSpot: () => void
  onRemoveLineupSpot: (index: number) => void
  onLineupDrop: (toIndex: number) => void
  dragLineupIndex: number | null
  dragOverLineupIndex: number | null
  onDragLineupIndexChange: (n: number | null) => void
  onDragOverLineupIndexChange: (n: number | null) => void
  pinhitters: Record<number, string>
  onPinhittersChange: (ph: Record<number, string>) => void
  replacedLineupIds: Record<number, string>
  pendingRemoveIndex: number | null
  onPendingRemoveIndexChange: (n: number | null) => void
  livePitcherId: string
  onLivePitcherIdChange: (id: string) => void
  currentLivePitchingEntry: PitchingEntryData
  livePlays: LivePlay[]
}

export default function GameModeLineupPanel({
  allPlayers,
  lineupIds,
  currentBatterIndex,
  onCurrentBatterIndexChange,
  onLineupChange,
  onAddLineupSpot,
  onRemoveLineupSpot,
  onLineupDrop,
  dragLineupIndex,
  dragOverLineupIndex,
  onDragLineupIndexChange,
  onDragOverLineupIndexChange,
  pinhitters,
  onPinhittersChange,
  replacedLineupIds,
  pendingRemoveIndex,
  onPendingRemoveIndexChange,
  livePitcherId,
  onLivePitcherIdChange,
  currentLivePitchingEntry,
  livePlays,
}: Props) {
  return (
    <section className="order-3 rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:sticky xl:top-6 xl:order-none xl:self-start">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-gray-900">Lineup</h2>
        <button
          type="button"
          onClick={onAddLineupSpot}
          disabled={allPlayers.length === 0}
          className="rounded-lg border border-green-900 px-3 py-2 text-xs font-semibold text-green-900 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
        >
          Add
        </button>
      </div>

      <div className="mt-4 space-y-1.5">
        {lineupIds.map((playerId, index) => {
          const isCurrent = index === currentBatterIndex
          const replacedPlayer = replacedLineupIds[index]
            ? allPlayers.find((player) => player.id === replacedLineupIds[index])
            : null
          const canDrag = livePlays.length === 0
          const isDragging = dragLineupIndex === index
          const isDragOver = dragOverLineupIndex === index

          return (
            <div
              key={`${playerId}-${index}`}
              draggable={canDrag}
              onDragStart={canDrag ? () => onDragLineupIndexChange(index) : undefined}
              onDragOver={canDrag ? (event) => { event.preventDefault(); onDragOverLineupIndexChange(index) } : undefined}
              onDrop={canDrag ? () => onLineupDrop(index) : undefined}
              onDragEnd={() => { onDragLineupIndexChange(null); onDragOverLineupIndexChange(null) }}
            >
              <div
                className={`flex items-center gap-1.5 rounded-xl border p-2 transition-opacity ${
                  isDragging ? "opacity-40"
                  : isDragOver ? "border-green-400 bg-green-50"
                  : isCurrent ? "border-green-900 bg-green-50"
                  : "border-gray-100 bg-white"
                }`}
              >
                {canDrag && (
                  <span className="shrink-0 cursor-grab select-none text-gray-300 active:cursor-grabbing">⠿</span>
                )}
                <button
                  type="button"
                  onClick={() => onCurrentBatterIndexChange(index)}
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCurrent ? "bg-green-900 text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {index + 1}
                </button>
                <select
                  value={playerId}
                  onChange={(event) => onLineupChange(index, event.target.value)}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                >
                  {allPlayers.map((player) => (
                    <option key={player.id} value={player.id}>
                      {getPlayerLabel(player)} {player.positions.join(", ")}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onPinhittersChange({
                    ...pinhitters,
                    [index]: allPlayers.find((player) => !lineupIds.includes(player.id))?.id ?? allPlayers[0].id,
                  })}
                  className="shrink-0 rounded px-1.5 py-1 text-[10px] font-bold text-amber-500 hover:bg-amber-50"
                >
                  PH
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (pendingRemoveIndex === index) {
                      onRemoveLineupSpot(index)
                      onPendingRemoveIndexChange(null)
                    } else {
                      onPendingRemoveIndexChange(index)
                    }
                  }}
                  onBlur={() => onPendingRemoveIndexChange(null)}
                  disabled={lineupIds.length <= 1}
                  className={`shrink-0 text-sm font-bold transition-colors disabled:opacity-20 ${
                    pendingRemoveIndex === index ? "text-red-500" : "text-gray-300 hover:text-red-400"
                  }`}
                >
                  x
                </button>
              </div>
              {replacedPlayer && (
                <p className="ml-9 mt-1 text-[10px] font-medium text-gray-400">
                  PH for {getPlayerLabel(replacedPlayer)} {replacedPlayer.positions.join(", ")}
                </p>
              )}
              {pinhitters[index] !== undefined && (
                <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-1.5">
                  <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">PH</span>
                  <select
                    value={pinhitters[index]}
                    onChange={(event) => onPinhittersChange({ ...pinhitters, [index]: event.target.value })}
                    className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                  >
                    {allPlayers.map((player) => (
                      <option key={player.id} value={player.id}>
                        {getPlayerLabel(player)} {player.positions.join(", ")}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      const next = { ...pinhitters }
                      delete next[index]
                      onPinhittersChange(next)
                    }}
                    className="shrink-0 text-xs text-amber-400 hover:text-red-500"
                  >
                    x
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <h2 className="text-base font-bold text-gray-900">Pitcher</h2>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allPlayers
            .slice()
            .sort((a, b) => {
              if (a.positions.includes("P") && b!.positions.includes("P")) return -1
              if (a!.positions.includes("P") && b.positions.includes("P")) return 1
              return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
            })
            .map((player) => (
              <button
                key={player.id}
                type="button"
                onClick={() => onLivePitcherIdChange(player.id)}
                className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                  player.id === livePitcherId
                    ? "bg-green-900 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {getPlayerLabel(player)}
              </button>
            ))}
        </div>
        <div className="mt-3 rounded-xl bg-[#f7f8f3] p-3 text-sm text-gray-600">
          IP {formatLiveInnings(currentLivePitchingEntry.inningsPitchedOuts)} · SO{" "}
          {currentLivePitchingEntry.strikeouts} · BB {currentLivePitchingEntry.walks} · HBP{" "}
          {currentLivePitchingEntry.hitBatters}
        </div>
      </div>
    </section>
  )
}
