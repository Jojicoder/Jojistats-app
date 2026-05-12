import type { DraftGameMeta } from "../types"
import type { GameHalf, LiveGameTab } from "./RecordGamePage.types"
import GameMetaFields from "./GameMetaFields"

type Props = {
  gameMeta: DraftGameMeta
  onGameMetaChange: (meta: DraftGameMeta) => void
  liveGameTab: LiveGameTab
  onSetLiveGameTab: (tab: LiveGameTab) => void
  isLiveBattingBlocked: boolean
  isLivePitchingBlocked: boolean
  currentFrameLocksRecordMode: LiveGameTab | null
  liveInning: number
  liveHalf: GameHalf
  liveOuts: number
  onLiveInningChange: (n: number) => void
  onLiveHalfChange: (half: GameHalf) => void
  onLiveOutsChange: (n: number) => void
  awayScore: number
  homeScore: number
  onAwayScoreChange: (n: number) => void
  onHomeScoreChange: (n: number) => void
}

export default function GameModeStatusPanel({
  gameMeta,
  onGameMetaChange,
  liveGameTab,
  onSetLiveGameTab,
  isLiveBattingBlocked,
  isLivePitchingBlocked,
  currentFrameLocksRecordMode,
  liveInning,
  liveHalf,
  liveOuts,
  onLiveInningChange,
  onLiveHalfChange,
  onLiveOutsChange,
  awayScore,
  homeScore,
  onAwayScoreChange,
  onHomeScoreChange,
}: Props) {
  return (
    <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <GameMetaFields gameMeta={gameMeta} onGameMetaChange={onGameMetaChange} />
      <div className="mt-4 inline-flex w-full rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 sm:w-auto">
        <button
          type="button"
          onClick={() => onSetLiveGameTab("batting")}
          disabled={isLiveBattingBlocked}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
            liveGameTab === "batting" ? "bg-green-900 text-white shadow-sm"
            : isLiveBattingBlocked ? "cursor-not-allowed text-gray-300"
            : "text-gray-600 hover:text-green-900"
          }`}
        >
          Batting
        </button>
        <button
          type="button"
          onClick={() => onSetLiveGameTab("pitching")}
          disabled={isLivePitchingBlocked}
          className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
            liveGameTab === "pitching" ? "bg-green-900 text-white shadow-sm"
            : isLivePitchingBlocked ? "cursor-not-allowed text-gray-300"
            : "text-gray-600 hover:text-green-900"
          }`}
        >
          Pitching
        </button>
      </div>
      {currentFrameLocksRecordMode && (
        <p className="mt-2 text-xs font-medium text-gray-500">
          {liveHalf} {liveInning} is locked to{" "}
          {currentFrameLocksRecordMode === "batting" ? "Batting" : "Pitching"}.
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
        <div className="rounded-xl bg-[#f7f8f3] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Inning</p>
          <div className="mt-2 flex items-center justify-between">
            <button type="button" onClick={() => onLiveInningChange(Math.max(liveInning - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold shadow-sm">-</button>
            <span className="text-2xl font-bold">{liveInning}</span>
            <button type="button" onClick={() => onLiveInningChange(liveInning + 1)} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold shadow-sm">+</button>
          </div>
        </div>
        <div className="rounded-xl bg-[#f7f8f3] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Half</p>
          <button type="button" onClick={() => onLiveHalfChange(liveHalf === "Top" ? "Bottom" : "Top")} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold shadow-sm">
            <span>{liveHalf === "Top" ? "▲" : "▼"}</span>
            <span>{liveHalf}</span>
          </button>
        </div>
        <div className="rounded-xl bg-[#f7f8f3] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Outs</p>
          <div className="mt-3 flex items-center justify-around">
            {[1, 2, 3].map((out) => (
              <button
                key={out}
                type="button"
                onClick={() => onLiveOutsChange(out === liveOuts ? out - 1 : out)}
                className={`h-6 w-6 rounded-full border-2 transition-colors ${liveOuts >= out ? "border-amber-500 bg-amber-400" : "border-gray-300 bg-white"}`}
                aria-label={`${out} out`}
              />
            ))}
          </div>
        </div>
        <div className="rounded-xl bg-[#f7f8f3] p-3">
          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Score</p>
          <div className="mt-1 flex items-center justify-around">
            <ScoreControl label="Away" value={awayScore} onChange={onAwayScoreChange} />
            <span className="text-lg font-bold text-gray-300">-</span>
            <ScoreControl label="Home" value={homeScore} onChange={onHomeScoreChange} />
          </div>
        </div>
      </div>
    </div>
  )
}

function ScoreControl({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (n: number) => void
}) {
  return (
    <div className="text-center">
      <p className="text-[10px] font-medium text-gray-400">{label}</p>
      <p className="text-2xl font-bold leading-none">{value}</p>
      <div className="mt-1.5 flex gap-1">
        <button type="button" onClick={() => onChange(Math.max(value - 1, 0))} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">-</button>
        <button type="button" onClick={() => onChange(value + 1)} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">+</button>
      </div>
    </div>
  )
}
