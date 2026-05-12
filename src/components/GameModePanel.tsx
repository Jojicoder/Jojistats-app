import type { Player, PitchingEntryData, DraftGameMeta } from "../types"
import type {
  BaseName, BasesState, GameHalf, LiveGameTab, LiveInningSummary,
  LivePitchPlay, LivePitchResult, LivePlay, LivePlayResult,
  RunnerOutAction, RunnerRbiAction, RunnerRunAction,
} from "./RecordGamePage.types"
import BaseDiamond from "./BaseDiamond"
import GameModeActionsCard from "./GameModeActionsCard"
import GameModeInningLog from "./GameModeInningLog"
import GameModeLineupPanel from "./GameModeLineupPanel"
import GameModeStatusPanel from "./GameModeStatusPanel"
import {
  getPlayerLabel, formatLiveInnings, battingResultClass,
  pitchingResultClass, liveResultLabels, livePitchResultLabels, emptyBases,
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
      <GameModeLineupPanel
        allPlayers={allPlayers}
        lineupIds={lineupIds}
        currentBatterIndex={currentBatterIndex}
        onCurrentBatterIndexChange={onCurrentBatterIndexChange}
        onLineupChange={onLineupChange}
        onAddLineupSpot={onAddLineupSpot}
        onRemoveLineupSpot={onRemoveLineupSpot}
        onLineupDrop={onLineupDrop}
        dragLineupIndex={dragLineupIndex}
        dragOverLineupIndex={dragOverLineupIndex}
        onDragLineupIndexChange={onDragLineupIndexChange}
        onDragOverLineupIndexChange={onDragOverLineupIndexChange}
        pinhitters={pinhitters}
        onPinhittersChange={onPinhittersChange}
        replacedLineupIds={replacedLineupIds}
        pendingRemoveIndex={pendingRemoveIndex}
        onPendingRemoveIndexChange={onPendingRemoveIndexChange}
        livePitcherId={livePitcherId}
        onLivePitcherIdChange={onLivePitcherIdChange}
        currentLivePitchingEntry={currentLivePitchingEntry}
        livePlays={livePlays}
      />

      {/* CENTER: Live input */}
      <section className="order-1 space-y-4 sm:space-y-6 xl:order-none">
        <GameModeStatusPanel
          gameMeta={gameMeta}
          onGameMetaChange={onGameMetaChange}
          liveGameTab={liveGameTab}
          onSetLiveGameTab={onSetLiveGameTab}
          isLiveBattingBlocked={isLiveBattingBlocked}
          isLivePitchingBlocked={isLivePitchingBlocked}
          currentFrameLocksRecordMode={currentFrameLocksRecordMode}
          liveInning={liveInning}
          liveHalf={liveHalf}
          liveOuts={liveOuts}
          onLiveInningChange={onLiveInningChange}
          onLiveHalfChange={onLiveHalfChange}
          onLiveOutsChange={onLiveOutsChange}
          awayScore={awayScore}
          homeScore={homeScore}
          onAwayScoreChange={onAwayScoreChange}
          onHomeScoreChange={onHomeScoreChange}
        />

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
        <GameModeActionsCard
          liveGameTab={liveGameTab}
          livePlays={livePlays}
          livePitchPlays={livePitchPlays}
          runnerOutHistory={runnerOutHistory}
          runnerRbiHistory={runnerRbiHistory}
          onUndoLiveAction={onUndoLiveAction}
          onResetLiveGame={onResetLiveGame}
          pendingSyncConfirm={pendingSyncConfirm}
          onPendingSyncConfirmChange={onPendingSyncConfirmChange}
          onSyncLiveGame={onSyncLiveGame}
          isSaving={isSaving}
          isMetaComplete={isMetaComplete}
          saveError={saveError}
          onClearSaveError={onClearSaveError}
          lineupPlayers={lineupPlayers}
        />

        <GameModeInningLog
          awayScore={awayScore}
          homeScore={homeScore}
          liveHalf={liveHalf}
          liveInning={liveInning}
          liveOuts={liveOuts}
          liveInningSummaries={liveInningSummaries}
          expandedLiveInningKey={expandedLiveInningKey}
          onExpandedLiveInningKeyChange={onExpandedLiveInningKeyChange}
          onLiveInningChange={onLiveInningChange}
          onLiveHalfChange={onLiveHalfChange}
          editingLiveEventId={editingLiveEventId}
          onEditingLiveEventIdChange={onEditingLiveEventIdChange}
          onSyncMainCursorToLivePlay={onSyncMainCursorToLivePlay}
          onSyncMainCursorToLivePitchPlay={onSyncMainCursorToLivePitchPlay}
          onDeleteLivePlay={onDeleteLivePlay}
          onDeleteLivePitchPlay={onDeleteLivePitchPlay}
          onUpdateLivePlay={onUpdateLivePlay}
          onUpdateLivePitchPlay={onUpdateLivePitchPlay}
        />
      </aside>
    </div>
  )
}
