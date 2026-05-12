import type {
  LiveGameTab,
  LivePitchPlay,
  LivePlay,
  RunnerOutAction,
  RunnerRbiAction,
} from "./RecordGamePage.types"
import type { Player } from "../types"

type Props = {
  liveGameTab: LiveGameTab
  livePlays: LivePlay[]
  livePitchPlays: LivePitchPlay[]
  runnerOutHistory: RunnerOutAction[]
  runnerRbiHistory: RunnerRbiAction[]
  onUndoLiveAction: (tab: LiveGameTab) => void
  onResetLiveGame: () => void
  pendingSyncConfirm: boolean
  onPendingSyncConfirmChange: (v: boolean) => void
  onSyncLiveGame: () => Promise<void>
  isSaving: boolean
  isMetaComplete: boolean
  saveError?: string
  onClearSaveError?: () => void
  lineupPlayers: Player[]
}

export default function GameModeActionsCard({
  liveGameTab,
  livePlays,
  livePitchPlays,
  runnerOutHistory,
  runnerRbiHistory,
  onUndoLiveAction,
  onResetLiveGame,
  pendingSyncConfirm,
  onPendingSyncConfirmChange,
  onSyncLiveGame,
  isSaving,
  isMetaComplete,
  saveError,
  onClearSaveError,
  lineupPlayers,
}: Props) {
  const hasUndo =
    liveGameTab === "batting"
      ? livePlays.length > 0 || runnerOutHistory.length > 0 || runnerRbiHistory.length > 0
      : livePitchPlays.length > 0 || runnerOutHistory.length > 0

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">Game Actions</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onUndoLiveAction(liveGameTab)}
          disabled={!hasUndo}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <button type="button" onClick={onResetLiveGame} className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700">
          Clear
        </button>
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
            <button type="button" onClick={() => onPendingSyncConfirmChange(false)} className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600">
              Cancel
            </button>
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
          <button type="button" onClick={onClearSaveError} className="shrink-0 font-bold leading-none">x</button>
        </div>
      )}
      <div className="mt-4 space-y-2 text-xs text-gray-500">
        <p>{isMetaComplete ? "Game info complete" : "Enter date and opponent"}</p>
        <p>{lineupPlayers.length} lineup spots</p>
        <p>{livePlays.length} unsynced batting plays</p>
        <p>{livePitchPlays.length} unsynced pitching events</p>
      </div>
    </div>
  )
}
