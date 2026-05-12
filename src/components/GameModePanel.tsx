import type { Player, PitchingEntryData, DraftGameMeta } from "../types"
import type {
  BaseName, BasesState, GameHalf, LiveGameTab, LiveInningSummary,
  LivePitchPlay, LivePitchResult, LivePlay, LivePlayResult,
  RunnerOutAction, RunnerRbiAction, RunnerRunAction,
} from "./RecordGamePage.types"
import GameMetaFields from "./GameMetaFields"
import BaseDiamond from "./BaseDiamond"
import {
  getPlayerLabel, formatLiveInnings, battingResultClass, battingResultBadge,
  pitchingResultClass, pitchingResultBadge, estimateRunsForPitching,
  liveResultLabels, livePitchResultLabels, emptyBases,
} from "./RecordGamePage.utils"

type Props = {
  // Game meta
  gameMeta: DraftGameMeta
  onGameMetaChange: (meta: DraftGameMeta) => void
  teamName: string
  isMetaComplete: boolean
  lastLocalSaveAt: string
  // Score & inning
  awayScore: number
  homeScore: number
  onAwayScoreChange: (n: number) => void
  onHomeScoreChange: (n: number) => void
  liveInning: number
  liveHalf: GameHalf
  liveOuts: number
  onLiveInningChange: (n: number) => void
  onLiveHalfChange: (h: GameHalf) => void
  onLiveOutsChange: (n: number) => void
  // Bases
  bases: BasesState
  onBasesChange: (b: BasesState) => void
  selectedBase: BaseName | null
  onSelectBase: (base: BaseName | null) => void
  // Lineup
  allPlayers: Player[]
  lineupIds: string[]
  lineupPlayers: Player[]
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
  // Pitching
  livePitcherId: string
  onLivePitcherIdChange: (id: string) => void
  livePitcher: Player
  currentLivePitchingEntry: PitchingEntryData
  currentLivePitchPlays: LivePitchPlay[]
  // Tab
  liveGameTab: LiveGameTab
  onSetLiveGameTab: (tab: LiveGameTab) => void
  isLiveBattingBlocked: boolean
  isLivePitchingBlocked: boolean
  currentFrameLocksRecordMode: LiveGameTab | null
  // Plays & history
  livePlays: LivePlay[]
  livePitchPlays: LivePitchPlay[]
  currentLiveBatter: Player | null
  currentInningPlays: LivePlay[]
  currentInningRuns: number
  currentInningHits: number
  liveInningSummaries: LiveInningSummary[]
  expandedLiveInningKey: string
  onExpandedLiveInningKeyChange: (key: string) => void
  editingLiveEventId: string | null
  onEditingLiveEventIdChange: (id: string | null) => void
  runnerOutHistory: RunnerOutAction[]
  runnerRbiHistory: RunnerRbiAction[]
  runnerRunHistory: RunnerRunAction[]
  // Notes & quick inputs
  quickRbi: number
  onQuickRbiChange: (n: number) => void
  quickNote: string
  onQuickNoteChange: (s: string) => void
  quickPitchNote: string
  onQuickPitchNoteChange: (s: string) => void
  // Actions
  onRecordLivePlay: (result: LivePlayResult) => void
  onRecordLivePitch: (result: LivePitchResult) => void
  onUndoLiveAction: (tab: LiveGameTab) => void
  onRunnerOut: () => void
  onRunnerRbi: () => void
  onRunnerRun: () => void
  onDeleteLivePlay: (id: string) => void
  onDeleteLivePitchPlay: (id: string) => void
  onUpdateLivePlay: (id: string, result: LivePlayResult, rbi: number, note: string) => void
  onUpdateLivePitchPlay: (id: string, result: LivePitchResult, note: string) => void
  onSyncLiveGame: () => Promise<void>
  onResetLiveGame: () => void
  onSyncMainCursorToLivePlay: (play: LivePlay) => void
  onSyncMainCursorToLivePitchPlay: (play: LivePitchPlay) => void
  isSaving: boolean
  pendingSyncConfirm: boolean
  onPendingSyncConfirmChange: (v: boolean) => void
  saveError?: string
  onClearSaveError?: () => void
}

export default function GameModePanel({
  gameMeta, onGameMetaChange, isMetaComplete,
  awayScore, homeScore, onAwayScoreChange, onHomeScoreChange,
  liveInning, liveHalf, liveOuts, onLiveInningChange, onLiveHalfChange, onLiveOutsChange,
  bases, onBasesChange, selectedBase, onSelectBase,
  allPlayers, lineupIds, lineupPlayers, currentBatterIndex, onCurrentBatterIndexChange,
  onLineupChange, onAddLineupSpot, onRemoveLineupSpot, onLineupDrop,
  dragLineupIndex, dragOverLineupIndex, onDragLineupIndexChange, onDragOverLineupIndexChange,
  pinhitters, onPinhittersChange, replacedLineupIds, pendingRemoveIndex, onPendingRemoveIndexChange,
  livePitcherId, onLivePitcherIdChange, livePitcher, currentLivePitchingEntry, currentLivePitchPlays,
  liveGameTab, onSetLiveGameTab, isLiveBattingBlocked, isLivePitchingBlocked, currentFrameLocksRecordMode,
  livePlays, livePitchPlays, currentLiveBatter,
  currentInningPlays, currentInningRuns, currentInningHits,
  liveInningSummaries, expandedLiveInningKey, onExpandedLiveInningKeyChange,
  editingLiveEventId, onEditingLiveEventIdChange,
  runnerOutHistory, runnerRbiHistory, runnerRunHistory,
  quickNote, onQuickNoteChange, quickPitchNote, onQuickPitchNoteChange,
  onRecordLivePlay, onRecordLivePitch, onUndoLiveAction,
  onRunnerOut, onRunnerRbi, onRunnerRun,
  onDeleteLivePlay, onDeleteLivePitchPlay, onUpdateLivePlay, onUpdateLivePitchPlay,
  onSyncLiveGame, onResetLiveGame, onSyncMainCursorToLivePlay, onSyncMainCursorToLivePitchPlay,
  isSaving, pendingSyncConfirm, onPendingSyncConfirmChange,
  saveError, onClearSaveError,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[280px_1fr_360px]">

      {/* LEFT: Lineup & Pitcher */}
      <section className="order-3 rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:sticky xl:top-6 xl:order-none xl:self-start">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-bold text-gray-900">Lineup</h2>
          <button
            type="button"
            onClick={onAddLineupSpot}
            disabled={lineupIds.length >= allPlayers.length}
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
                onDragOver={canDrag ? (e) => { e.preventDefault(); onDragOverLineupIndexChange(index) } : undefined}
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
                    <span className="shrink-0 cursor-grab text-gray-300 active:cursor-grabbing select-none">⠿</span>
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
                        {getPlayerLabel(player)} {player.position}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => onPinhittersChange({ ...pinhitters, [index]: allPlayers.find((p) => !lineupIds.includes(p.id))?.id ?? allPlayers[0].id })}
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
                    ✕
                  </button>
                </div>
                {replacedPlayer && (
                  <p className="ml-9 mt-1 text-[10px] font-medium text-gray-400">
                    PH for {getPlayerLabel(replacedPlayer)} {replacedPlayer.position}
                  </p>
                )}
                {pinhitters[index] !== undefined && (
                  <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-1.5">
                    <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">PH</span>
                    <select
                      value={pinhitters[index]}
                      onChange={(e) => onPinhittersChange({ ...pinhitters, [index]: e.target.value })}
                      className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                    >
                      {allPlayers.map((player) => (
                        <option key={player.id} value={player.id}>
                          {getPlayerLabel(player)} {player.position}
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
                      ✕
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
                if (a.position === "P" && b.position !== "P") return -1
                if (a.position !== "P" && b.position === "P") return 1
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

      {/* CENTER: Live input */}
      <section className="order-1 space-y-4 sm:space-y-6 xl:order-none">
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
                <button type="button" onClick={() => onLiveInningChange(Math.max(liveInning - 1, 1))} className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold shadow-sm">−</button>
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
                <div className="text-center">
                  <p className="text-[10px] font-medium text-gray-400">Away</p>
                  <p className="text-2xl font-bold leading-none">{awayScore}</p>
                  <div className="mt-1.5 flex gap-1">
                    <button type="button" onClick={() => onAwayScoreChange(Math.max(awayScore - 1, 0))} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">−</button>
                    <button type="button" onClick={() => onAwayScoreChange(awayScore + 1)} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">+</button>
                  </div>
                </div>
                <span className="text-lg font-bold text-gray-300">–</span>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-gray-400">Home</p>
                  <p className="text-2xl font-bold leading-none">{homeScore}</p>
                  <div className="mt-1.5 flex gap-1">
                    <button type="button" onClick={() => onHomeScoreChange(Math.max(homeScore - 1, 0))} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">−</button>
                    <button type="button" onClick={() => onHomeScoreChange(homeScore + 1)} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">+</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Batting or Pitching input */}
        {liveGameTab === "batting" ? (
          <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-green-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">At Bat</span>
                  <span className="text-xs text-gray-400">{liveHalf === "Top" ? "▲" : "▼"} {liveInning} · {liveOuts} out{liveOuts !== 1 ? "s" : ""}</span>
                </div>
                {currentLiveBatter ? (
                  <>
                    <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{getPlayerLabel(currentLiveBatter)}</h2>
                    <p className="mt-0.5 text-sm text-gray-500">{currentLiveBatter.position}</p>
                  </>
                ) : (
                  <p className="mt-2 text-sm text-red-700">Add at least one player to the lineup.</p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2 rounded-xl bg-[#f7f8f3] px-3 py-2 md:min-w-[360px]">
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => onUndoLiveAction("batting")} disabled={livePlays.length === 0 && runnerOutHistory.length === 0 && runnerRbiHistory.length === 0 && runnerRunHistory.length === 0} className="min-w-14 rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Undo</button>
                  <button type="button" onClick={onRunnerRun} disabled={!selectedBase || !bases[selectedBase]} className="min-w-14 rounded-lg bg-orange-100 px-2 py-2 text-xs font-semibold text-orange-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-white">Run</button>
                  <button type="button" onClick={onRunnerRbi} disabled={!selectedBase || !bases[selectedBase] || livePlays.length === 0} className="min-w-14 rounded-lg bg-green-900 px-2 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300">RBI</button>
                  <button type="button" onClick={onRunnerOut} disabled={!selectedBase || !bases[selectedBase]} className="min-w-14 rounded-lg bg-gray-900 px-2 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300">Out</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { label: "1B", active: bases.first, onClick: () => onBasesChange({ ...bases, first: !bases.first }) },
                    { label: "2B", active: bases.second, onClick: () => onBasesChange({ ...bases, second: !bases.second }) },
                    { label: "3B", active: bases.third, onClick: () => onBasesChange({ ...bases, third: !bases.third }) },
                    { label: "Clear", active: false, onClick: () => onBasesChange(emptyBases) },
                  ].map((item) => (
                    <button key={item.label} type="button" onClick={item.onClick} className={`min-w-14 rounded-lg px-2 py-2 text-xs font-semibold shadow-sm ${item.active ? "bg-green-900 text-white" : "bg-white text-gray-600"}`}>
                      {item.label}
                    </button>
                  ))}
                </div>
                <BaseDiamond bases={bases} onBasesChange={onBasesChange} selectedBase={selectedBase} onSelectBase={onSelectBase} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-xl bg-[#f7f8f3] px-2 py-3 sm:px-4">
                <p className="font-semibold uppercase text-gray-500">This Inning</p>
                <p className="mt-1 text-lg font-bold">{currentInningPlays.length}</p>
              </div>
              <div className="rounded-xl bg-[#f7f8f3] px-2 py-3 sm:px-4">
                <p className="font-semibold uppercase text-gray-500">Runs</p>
                <p className="mt-1 text-lg font-bold">{currentInningRuns}</p>
              </div>
              <div className="rounded-xl bg-[#f7f8f3] px-2 py-3 sm:px-4">
                <p className="font-semibold uppercase text-gray-500">Hits</p>
                <p className="mt-1 text-lg font-bold">{currentInningHits}</p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {liveResultLabels.map((item) => (
                <button
                  key={item.result}
                  type="button"
                  onClick={() => onRecordLivePlay(item.result)}
                  disabled={!isMetaComplete || !currentLiveBatter || isLiveBattingBlocked}
                  className={`min-h-16 rounded-xl px-2 py-3 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${battingResultClass(item.result)}`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-[#f7f8f3] p-3">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Note</p>
                <input type="text" value={quickNote} onChange={(e) => onQuickNoteChange(e.target.value)} placeholder="e.g. deep fly..." className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" />
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold uppercase tracking-widest text-green-700">Current Pitcher</p>
                <h2 className="mt-2 text-2xl font-bold sm:text-3xl">{getPlayerLabel(livePitcher)}</h2>
                <p className="mt-1 text-sm text-gray-500">{livePitcher.position} · {liveHalf} {liveInning} · {liveOuts} outs</p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2 md:min-w-[230px]">
                <div className="grid grid-cols-2 gap-1.5">
                  <button type="button" onClick={() => onUndoLiveAction("pitching")} disabled={livePitchPlays.length === 0 && runnerOutHistory.length === 0} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40">Undo</button>
                  <button type="button" onClick={() => onRecordLivePitch("R")} disabled={!isMetaComplete || isLivePitchingBlocked} className="rounded-lg bg-orange-100 px-2 py-2 text-xs font-semibold text-orange-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">Run</button>
                  <button type="button" onClick={() => onRecordLivePitch("ER")} disabled={!isMetaComplete || isLivePitchingBlocked} className="rounded-lg bg-red-200 px-2 py-2 text-xs font-semibold text-red-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">ER</button>
                  <button type="button" onClick={onRunnerOut} disabled={!selectedBase || !bases[selectedBase]} className="rounded-lg bg-gray-900 px-2 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300">Out</button>
                </div>
                <BaseDiamond bases={bases} onBasesChange={onBasesChange} selectedBase={selectedBase} onSelectBase={onSelectBase} />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
              {[
                { label: "1B", active: bases.first, onClick: () => onBasesChange({ ...bases, first: !bases.first }) },
                { label: "2B", active: bases.second, onClick: () => onBasesChange({ ...bases, second: !bases.second }) },
                { label: "3B", active: bases.third, onClick: () => onBasesChange({ ...bases, third: !bases.third }) },
              ].map((item) => (
                <button key={item.label} type="button" onClick={item.onClick} className={`rounded-full px-2.5 py-1 font-semibold ${item.active ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}>
                  {item.label}
                </button>
              ))}
              <button type="button" onClick={() => onBasesChange(emptyBases)} className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-500">Clear Bases</button>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-5">
              {[
                { label: "IP", value: formatLiveInnings(currentLivePitchingEntry.inningsPitchedOuts) },
                { label: "SO", value: String(currentLivePitchingEntry.strikeouts) },
                { label: "BB", value: String(currentLivePitchingEntry.walks) },
                { label: "HBP", value: String(currentLivePitchingEntry.hitBatters) },
                { label: "ER", value: String(currentLivePitchingEntry.earnedRuns) },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[#f7f8f3] p-3">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
                  <p className="mt-1 text-2xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {livePitchResultLabels.map((item) => (
                <button
                  key={item.result}
                  type="button"
                  onClick={() => onRecordLivePitch(item.result)}
                  disabled={!isMetaComplete || isLivePitchingBlocked}
                  className={`min-h-16 rounded-xl px-2 py-3 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${pitchingResultClass(item.result)}`}
                >
                  {item.label}
                </button>
              ))}
              <div className="min-h-16 overflow-hidden rounded-xl bg-red-50 text-sm font-bold text-red-900 shadow-sm">
                <div className="grid h-full grid-cols-3 divide-x divide-red-100">
                  {[
                    { result: "H" as LivePitchResult, label: "1B" },
                    { result: "2B" as LivePitchResult, label: "2B" },
                    { result: "3B" as LivePitchResult, label: "3B" },
                  ].map((item) => (
                    <button key={item.result} type="button" onClick={() => onRecordLivePitch(item.result)} disabled={!isMetaComplete || isLivePitchingBlocked} className="px-1 py-3 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={() => onRecordLivePitch("E")} disabled={!isMetaComplete || isLivePitchingBlocked} className="min-h-16 rounded-xl bg-amber-100 px-2 py-3 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400">
                Error
              </button>
            </div>

            <div className="mt-5 rounded-xl bg-[#f7f8f3] p-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Note</p>
              <input type="text" value={quickPitchNote} onChange={(e) => onQuickPitchNoteChange(e.target.value)} placeholder="e.g. missed spot..." className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm" />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
              {[
                { label: "H", value: currentLivePitchingEntry.hitsAllowed },
                { label: "R", value: currentLivePitchingEntry.runsAllowed },
                { label: "HR", value: currentLivePitchingEntry.homeRunsAllowed },
                { label: "Events", value: currentLivePitchPlays.length },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-[#f7f8f3] p-3 text-sm">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
                  <p className="mt-1 text-xl font-bold">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* RIGHT: Game actions & inning log */}
      <aside className="order-2 space-y-4 sm:space-y-6 xl:order-none">
        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Game Actions</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onUndoLiveAction(liveGameTab)}
              disabled={
                liveGameTab === "batting"
                  ? livePlays.length === 0 && runnerOutHistory.length === 0 && runnerRbiHistory.length === 0
                  : livePitchPlays.length === 0 && runnerOutHistory.length === 0
              }
              className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Undo
            </button>
            <button type="button" onClick={onResetLiveGame} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">Clear</button>
            {pendingSyncConfirm ? (
              <>
                <button
                  type="button"
                  onClick={async () => { onPendingSyncConfirmChange(false); await onSyncLiveGame() }}
                  disabled={isSaving}
                  className="col-span-2 rounded-lg bg-green-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {isSaving ? "Syncing..." : "Confirm Save"}
                </button>
                <button type="button" onClick={() => onPendingSyncConfirmChange(false)} className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">Cancel</button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => onPendingSyncConfirmChange(true)}
                disabled={isSaving || !isMetaComplete || (livePlays.length === 0 && livePitchPlays.length === 0)}
                className="col-span-2 rounded-lg bg-green-900 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
              >
                {`Sync Game (${livePlays.length + livePitchPlays.length})`}
              </button>
            )}
          </div>
          {saveError && (
            <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
              <span className="flex-1">{saveError}</span>
              <button type="button" onClick={onClearSaveError} className="shrink-0 font-bold leading-none">✕</button>
            </div>
          )}
          <div className="mt-4 space-y-2 text-xs text-gray-500">
            <p>{isMetaComplete ? "Game info complete" : "Enter date and opponent"}</p>
            <p>{lineupPlayers.length} lineup spots</p>
            <p>{livePlays.length} unsynced batting plays</p>
            <p>{livePitchPlays.length} unsynced pitching events</p>
          </div>
        </div>

        {/* Inning log */}
        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <h2 className="text-base font-bold text-gray-900">All Innings</h2>
          <p className="mt-1 text-sm text-gray-500">
            {awayScore}-{homeScore} · {liveHalf} {liveInning} · {liveOuts} outs
          </p>
          <div className="mt-4 space-y-3">
            {liveInningSummaries.map((summary) => {
              const battingRuns = summary.batting.reduce((t, p) => t + p.runs, 0)
              const battingHits = summary.batting.reduce((t, p) => t + p.statLine.H, 0)
              const pitchingRuns = summary.pitching.reduce((t, p) => t + estimateRunsForPitching(p.basesBefore, p.result), 0)
              const hasEvents = summary.batting.length > 0 || summary.pitching.length > 0
              const summaryKey = `${summary.inning}-${summary.half}`
              const isExpanded = expandedLiveInningKey === summaryKey

              return (
                <div key={summaryKey} className={`rounded-xl border bg-[#f7f8f3] transition ${isExpanded ? "border-green-900" : "border-gray-100"}`}>
                  <button
                    type="button"
                    onClick={() => {
                      onExpandedLiveInningKeyChange(isExpanded ? "" : summaryKey)
                      onLiveInningChange(summary.inning)
                      onLiveHalfChange(summary.half)
                    }}
                    className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                  >
                    <span>
                      <span className="block text-sm font-bold text-gray-900">{summary.half} {summary.inning}</span>
                      <span className="mt-0.5 block text-xs font-semibold text-gray-500">B R{battingRuns} H{battingHits} · P R{pitchingRuns}</span>
                    </span>
                    <span className="text-xs font-semibold text-green-900">{isExpanded ? "Close" : "Open"}</span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100 px-3 pb-3 pt-3">
                      {!hasEvents && <p className="text-sm text-gray-500">No events yet.</p>}

                      {summary.batting.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Batting</p>
                          {summary.batting.map((play) => {
                            const isEditing = editingLiveEventId === play.id
                            return (
                              <div key={play.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${battingResultBadge(play.result)}`}>{play.result}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{play.playerName}</p>
                                    <p className="truncate text-xs text-gray-500">RBI {play.rbi} · Runs {play.runs}{play.note ? ` · ${play.note}` : ""}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button type="button" onClick={() => { if (isEditing) { onEditingLiveEventIdChange(null); return }; onSyncMainCursorToLivePlay(play); onEditingLiveEventIdChange(play.id) }} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">{isEditing ? "Close" : "Edit"}</button>
                                    <button type="button" onClick={() => onDeleteLivePlay(play.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">Delete</button>
                                  </div>
                                </div>
                                {isEditing && (
                                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px]">
                                    <select value={play.result} onChange={(e) => onUpdateLivePlay(play.id, e.target.value as LivePlayResult, play.rbi, play.note)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm">
                                      {liveResultLabels.map((item) => (<option key={item.result} value={item.result}>{item.label}</option>))}
                                    </select>
                                    <input type="number" min={0} value={play.rbi} onChange={(e) => onUpdateLivePlay(play.id, play.result, Number(e.target.value), play.note)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                                    <input type="text" value={play.note} onChange={(e) => onUpdateLivePlay(play.id, play.result, play.rbi, e.target.value)} placeholder="Note" className="rounded-lg border border-gray-200 px-2 py-2 text-sm sm:col-span-2" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {summary.pitching.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pitching</p>
                          {summary.pitching.map((play) => {
                            const isEditing = editingLiveEventId === play.id
                            return (
                              <div key={play.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${pitchingResultBadge(play.result)}`}>{play.result}</span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{play.pitcherName}</p>
                                    <p className="truncate text-xs text-gray-500">Runs {estimateRunsForPitching(play.basesBefore, play.result)}{play.note ? ` · ${play.note}` : ""}</p>
                                  </div>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button type="button" onClick={() => { if (isEditing) { onEditingLiveEventIdChange(null); return }; onSyncMainCursorToLivePitchPlay(play); onEditingLiveEventIdChange(play.id) }} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">{isEditing ? "Close" : "Edit"}</button>
                                    <button type="button" onClick={() => onDeleteLivePitchPlay(play.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">Delete</button>
                                  </div>
                                </div>
                                {isEditing && (
                                  <div className="mt-3 grid grid-cols-1 gap-2">
                                    <select value={play.result} onChange={(e) => onUpdateLivePitchPlay(play.id, e.target.value as LivePitchResult, play.note)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm">
                                      {[
                                        ...livePitchResultLabels,
                                        { result: "H" as LivePitchResult, label: "1B" },
                                        { result: "2B" as LivePitchResult, label: "2B" },
                                        { result: "3B" as LivePitchResult, label: "3B" },
                                        { result: "R" as LivePitchResult, label: "Run" },
                                        { result: "ER" as LivePitchResult, label: "ER" },
                                        { result: "E" as LivePitchResult, label: "Error" },
                                      ].map((item) => (<option key={item.result} value={item.result}>{item.label}</option>))}
                                    </select>
                                    <input type="text" value={play.note} onChange={(e) => onUpdateLivePitchPlay(play.id, play.result, e.target.value)} placeholder="Note" className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}
