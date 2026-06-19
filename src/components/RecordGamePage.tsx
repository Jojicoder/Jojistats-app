import { useMemo, useState } from "react"
import type {
  Position,
  SavedBattingGameEntry,
} from "../types"
import type { RecordGamePageProps, InputStyle } from "./RecordGamePage.types"
import { createEmptyBattingLine } from "./gameConstants"
import { getGameResult } from "./gameLiveUtils"
import { useStandardMode } from "../hooks/useStandardMode"
import { useGameMode } from "../hooks/useGameMode"
import { useEditMode } from "../hooks/useEditMode"
import StandardModePanel from "./StandardModePanel"
import GameModePanel from "./GameModePanel"
import EditModePanel from "./EditModePanel"

export type { SavedGameSummary } from "./RecordGamePage.types"
export type { RecordGamePageProps }

export default function RecordGamePage({
  activePlayer,
  allPlayers,
  onSelectPlayer,
  showRosterPanel = true,
  currentEntry,
  gameMeta,
  savedEntries,
  savedPitchingEntries = [],
  teamSavedEntries,
  teamSavedPitchingEntries,
  savedGames = [],
  onGameMetaChange,
  onEntryChange,
  onSaveGame,
  teamName,
  seasonYear,
  isEditingSavedEntry,
  isEditingSavedPitchingEntry = false,
  editingSavedEntryId,
  editingSavedPitchingEntryId = null,
  onStartEditSavedEntry,
  onUpdateSavedEntry,
  onUpdateSavedGame,
  onUpdateSavedGameMeta,
  onCancelEditSavedEntry,
  onDeleteSavedEntry,
  onDeleteSavedGame,
  onStartEditSavedPitchingEntry,
  onUpdateSavedPitchingEntry,
  onCancelEditSavedPitchingEntry,
  onDeleteSavedPitchingEntry,
  editingGamePositions,
  recordMode,
  setRecordMode,
  pitchingEntry,
  onPitchingEntryChange,
  isPitchingSaveDisabled,
  saveError = "",
  saveSuccess = "",
  onClearSaveError,
  onGameModeChange,
  onNewGame,
}: RecordGamePageProps) {

  const [inputStyle, setInputStyle] = useState<InputStyle>("standard")
  const handleInputStyleChange = (next: InputStyle) => {
    setInputStyle(next)
    onGameModeChange?.(next === "game")
  }

  const isMetaComplete = gameMeta.date.trim() !== "" && gameMeta.opponent.trim() !== ""
  const localDraftKey = `jojistats-live-game-${activePlayer.teamId}-${seasonYear}`

  /* ---------------- SHARED DERIVED DATA ---------------- */

  const teamGameEntries = useMemo(() => {
    const battingEntries = teamSavedEntries ?? savedEntries
    const pitchingEntries = teamSavedPitchingEntries ?? savedPitchingEntries
    const byGame = new Map<number, SavedBattingGameEntry>()

    savedGames.forEach((game) => {
      byGame.set(game.id, {
        id: `game-${game.id}`, statId: 0, gameId: game.id,
        teamId: String(game.team_id), playerId: "",
        gameMeta: {
          date: game.game_date, opponent: game.opponent_name,
          location: game.location ?? "", seasonYear: game.season_year,
          matchNumber: game.match_number, memo: game.memo ?? "",
          teamScore: game.team_score ?? null, opponentScore: game.opponent_score ?? null,
          result: game.result === "W" || game.result === "L" || game.result === "T" ? game.result : "",
        },
        gamePositions: [],
        statLine: createEmptyBattingLine(),
      })
    })

    battingEntries.forEach((entry) => {
      const existing = byGame.get(entry.gameId)
      if (!existing || existing.statId === 0 || entry.statId < existing.statId) {
        byGame.set(entry.gameId, entry)
      }
    })

    pitchingEntries.forEach((entry) => {
      if (byGame.has(entry.gameId)) return
      byGame.set(entry.gameId, {
        id: `pitching-game-${entry.gameId}`, statId: entry.statId, gameId: entry.gameId,
        teamId: entry.teamId, playerId: entry.playerId, gameMeta: entry.gameMeta,
        gamePositions: ["P"] as Position[], statLine: createEmptyBattingLine(),
      })
    })

    return Array.from(byGame.values()).sort((a, b) => {
      const d = b.gameMeta.date.localeCompare(a.gameMeta.date)
      return d !== 0 ? d : b.gameMeta.matchNumber - a.gameMeta.matchNumber
    })
  }, [savedEntries, savedGames, savedPitchingEntries, teamSavedEntries, teamSavedPitchingEntries])

  const selectedGameEntry =
    teamGameEntries.find((e) => e.id === editingSavedEntryId) ??
    (teamSavedEntries ?? savedEntries).find((e) => e.id === editingSavedEntryId) ??
    savedEntries.find((e) => e.id === editingSavedEntryId) ??
    null

  const activeEditingSavedEntry =
    (teamSavedEntries ?? savedEntries).find((e) => e.id === editingSavedEntryId) ??
    savedEntries.find((e) => e.id === editingSavedEntryId) ??
    null
  const isEditingActiveSavedEntry =
    isEditingSavedEntry && activeEditingSavedEntry?.playerId === activePlayer.id

  const gameEntriesForEditing = useMemo(
    () =>
      selectedGameEntry
        ? (teamSavedEntries ?? savedEntries)
            .filter((e) => e.gameId === selectedGameEntry.gameId)
            .sort((a, b) => {
              const pA = allPlayers.find((p) => p.id === a.playerId)
              const pB = allPlayers.find((p) => p.id === b.playerId)
              return (pA?.jerseyNumber ?? 999) - (pB?.jerseyNumber ?? 999)
            })
        : [],
    [allPlayers, savedEntries, selectedGameEntry, teamSavedEntries]
  )

  const pitchingEntriesForEditing = useMemo(
    () =>
      selectedGameEntry
        ? (teamSavedPitchingEntries ?? savedPitchingEntries)
            .filter((e) => e.gameId === selectedGameEntry.gameId)
            .sort((a, b) => {
              const pA = allPlayers.find((p) => p.id === a.playerId)
              const pB = allPlayers.find((p) => p.id === b.playerId)
              return (pA?.jerseyNumber ?? 999) - (pB?.jerseyNumber ?? 999)
            })
        : [],
    [allPlayers, savedPitchingEntries, selectedGameEntry, teamSavedPitchingEntries]
  )

  const teamRecord = useMemo(
    () =>
      teamGameEntries.reduce(
        (rec, e) => {
          const r = getGameResult(e.gameMeta)
          if (r === "W") rec.wins += 1
          if (r === "L") rec.losses += 1
          if (r === "T") rec.ties += 1
          return rec
        },
        { wins: 0, losses: 0, ties: 0 }
      ),
    [teamGameEntries]
  )

  /* ---------------- HOOKS ---------------- */

  const standard = useStandardMode({
    activePlayer, allPlayers, currentEntry, onEntryChange, gameMeta, isMetaComplete,
    isEditingSavedEntry: isEditingActiveSavedEntry, isEditingSavedPitchingEntry, editingGamePositions,
    recordMode, setRecordMode, onSaveGame, onUpdateSavedEntry, onUpdateSavedGame,
    onCancelEditSavedEntry, gameEntriesForEditing, pitchingEntriesForEditing,
    pitchingEntry, onPitchingEntryChange, onUpdateSavedPitchingEntry,
    onNewGame,
  })

  const game = useGameMode({
    allPlayers, activePlayer, gameMeta, isMetaComplete, onSaveGame, localDraftKey,
  })

  const edit = useEditMode({
    allPlayers, gameMeta, isMetaComplete,
    gameEntriesForEditing,
    pitchingEntriesForEditing,
    onUpdateSavedGame,
    livePlays: game.livePlays,
  })

  /* ---------------- UI ---------------- */

  return (
    <main className="w-full">
      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Record Game</p>
          <p className="text-xs text-gray-500">
            {inputStyle === "game"
              ? `Game Mode · Local saved ${game.lastLocalSaveAt || "now"}`
              : inputStyle === "edit"
                ? "Edit saved games"
                : "Standard entry"}
          </p>
        </div>
        <div className="inline-flex w-full rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 sm:w-auto">
          {(["standard", "game", "edit"] as const).map((style, i) => (
            <button
              key={style}
              type="button"
              onClick={() => handleInputStyleChange(style)}
              className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${inputStyle === style ? "bg-green-900 text-white shadow-sm" : "text-gray-600 hover:text-green-900"}`}
            >
              {i === 0 ? "Standard" : i === 1 ? "Game Mode" : "Edit Game"}
            </button>
          ))}
        </div>
      </div>

      {inputStyle === "game" ? (
        <GameModePanel
          gameMeta={gameMeta}
          onGameMetaChange={onGameMetaChange}
          teamName={teamName}
          isMetaComplete={isMetaComplete}
          lastLocalSaveAt={game.lastLocalSaveAt}
          awayScore={game.awayScore}
          homeScore={game.homeScore}
          onAwayScoreChange={game.setAwayScore}
          onHomeScoreChange={game.setHomeScore}
          liveInning={game.liveInning}
          liveHalf={game.liveHalf}
          liveOuts={game.liveOuts}
          onLiveInningChange={game.setLiveInning}
          onLiveHalfChange={game.setLiveHalf}
          onLiveOutsChange={game.setLiveOuts}
          bases={game.bases}
          onBasesChange={game.setBases}
          selectedBase={game.selectedBase}
          onSelectBase={game.setSelectedBase}
          allPlayers={allPlayers}
          lineupIds={game.lineupIds}
          lineupPlayers={game.lineupPlayers}
          currentBatterIndex={game.currentBatterIndex}
          onCurrentBatterIndexChange={game.setCurrentBatterIndex}
          onLineupChange={game.handleLineupChange}
          onAddLineupSpot={game.handleAddLineupSpot}
          onRemoveLineupSpot={game.handleRemoveLineupSpot}
          onLineupDrop={game.handleLineupDrop}
          dragLineupIndex={game.dragLineupIndex}
          dragOverLineupIndex={game.dragOverLineupIndex}
          onDragLineupIndexChange={game.setDragLineupIndex}
          onDragOverLineupIndexChange={game.setDragOverLineupIndex}
          pinhitters={game.pinhitters}
          onPinhittersChange={game.setPinhitters}
          replacedLineupIds={game.replacedLineupIds}
          pendingRemoveIndex={game.pendingRemoveIndex}
          onPendingRemoveIndexChange={game.setPendingRemoveIndex}
          livePitcherId={game.livePitcherId}
          onLivePitcherIdChange={game.setLivePitcherId}
          livePitcher={game.livePitcher}
          currentLivePitchingEntry={game.currentLivePitchingEntry}
          currentLivePitchPlays={game.currentLivePitchPlays}
          liveGameTab={game.liveGameTab}
          onSetLiveGameTab={game.handleSetLiveGameTab}
          isLiveBattingBlocked={game.isLiveBattingBlocked}
          isLivePitchingBlocked={game.isLivePitchingBlocked}
          currentFrameLocksRecordMode={game.currentFrameLocksRecordMode}
          livePlays={game.livePlays}
          livePitchPlays={game.livePitchPlays}
          currentLiveBatter={game.currentLiveBatter}
          currentInningPlays={game.currentInningPlays}
          currentInningRuns={game.currentInningRuns}
          currentInningHits={game.currentInningHits}
          liveInningSummaries={game.liveInningSummaries}
          expandedLiveInningKey={game.expandedLiveInningKey}
          onExpandedLiveInningKeyChange={game.setExpandedLiveInningKey}
          editingLiveEventId={game.editingLiveEventId}
          onEditingLiveEventIdChange={game.setEditingLiveEventId}
          runnerOutHistory={game.runnerOutHistory}
          runnerRbiHistory={game.runnerRbiHistory}
          runnerRunHistory={game.runnerRunHistory}
          quickRbi={game.quickRbi}
          onQuickRbiChange={game.setQuickRbi}
          quickNote={game.quickNote}
          onQuickNoteChange={game.setQuickNote}
          quickPitchNote={game.quickPitchNote}
          onQuickPitchNoteChange={game.setQuickPitchNote}
          onRecordLivePlay={game.handleRecordLivePlay}
          onRecordLivePitch={game.handleRecordLivePitch}
          onUndoLiveAction={game.handleUndoLiveAction}
          onRunnerOut={game.handleRunnerOut}
          onRunnerRbi={game.handleRunnerRbi}
          onRunnerRun={game.handleRunnerRun}
          onDeleteLivePlay={game.handleDeleteLivePlay}
          onDeleteLivePitchPlay={game.handleDeleteLivePitchPlay}
          onUpdateLivePlay={game.handleUpdateLivePlay}
          onUpdateLivePitchPlay={game.handleUpdateLivePitchPlay}
          onSyncLiveGame={game.handleSyncLiveGame}
          onResetLiveGame={game.handleResetLiveGame}
          onSyncMainCursorToLivePlay={game.syncMainCursorToLivePlay}
          onSyncMainCursorToLivePitchPlay={game.syncMainCursorToLivePitchPlay}
          isSaving={game.isSaving}
          pendingSyncConfirm={game.pendingSyncConfirm}
          onPendingSyncConfirmChange={game.setPendingSyncConfirm}
          saveError={saveError}
          onClearSaveError={onClearSaveError}
        />
      ) : inputStyle === "edit" ? (
        <EditModePanel
          teamName={teamName}
          teamRecord={teamRecord}
          teamGameEntries={teamGameEntries}
          isEditingSavedEntry={isEditingSavedEntry}
          gameMeta={gameMeta}
          onGameMetaChange={onGameMetaChange}
          isMetaComplete={isMetaComplete}
          onCancelEditSavedEntry={onCancelEditSavedEntry}
          onDeleteSavedGame={onDeleteSavedGame}
          onPrimaryAction={() => onUpdateSavedGameMeta?.(gameMeta)}
          editGameTab={edit.editGameTab}
          onEditGameTabChange={edit.setEditGameTab}
          editGameEntries={edit.editGameEntries}
          editAvailablePlayers={edit.editAvailablePlayers}
          allPlayers={allPlayers}
          selectedEditAddPlayerId={edit.selectedEditAddPlayerId}
          onEditAddPlayerIdChange={edit.setEditAddPlayerId}
          onAddEditGameEntry={edit.handleAddEditGameEntry}
          selectedEditGameEntry={edit.selectedEditGameEntry}
          onSelectEditPlayerId={edit.setSelectedEditPlayerId}
          onUpdateEditGameEntry={edit.handleUpdateEditGameEntry}
          onAddEditGamePosition={edit.handleAddEditGamePosition}
          onUpdateEditGamePosition={edit.handleUpdateEditGamePosition}
          onRemoveEditGamePosition={edit.handleRemoveEditGamePosition}
          onRemoveEditGameEntry={edit.handleRemoveEditGameEntry}
          livePlays={game.livePlays}
          hoveredEditPlayerId={edit.hoveredEditPlayerId}
          onHoveredEditPlayerIdChange={edit.setHoveredEditPlayerId}
          hoveredEditPlayerEvents={edit.hoveredEditPlayerEvents}
          hasInvalidEditGameStats={edit.hasInvalidEditGameStats}
          editGamePitchingEntries={edit.editGamePitchingEntries}
          editAvailablePitchers={edit.editAvailablePitchers}
          selectedEditAddPitcherId={edit.selectedEditAddPitcherId}
          onEditAddPitcherIdChange={edit.setEditAddPitcherId}
          onAddEditGamePitchingEntry={edit.handleAddEditGamePitchingEntry}
          selectedEditPitchingEntry={edit.selectedEditPitchingEntry}
          onSelectEditPitcherId={edit.setSelectedEditPitcherId}
          onUpdateEditGamePitchingEntry={edit.handleUpdateEditGamePitchingEntry}
          onRemoveEditGamePitchingEntry={edit.handleRemoveEditGamePitchingEntry}
          hasInvalidEditPitchingStats={edit.hasInvalidEditPitchingStats}
          isSaving={edit.isSaving}
          onSaveEditedGame={edit.handleSaveEditedGame}
          editingSavedEntryId={editingSavedEntryId}
          onStartEditSavedEntry={onStartEditSavedEntry}
        />
      ) : (
        <StandardModePanel
          showRosterPanel={showRosterPanel}
          activePlayer={activePlayer}
          allPlayers={allPlayers}
          onSelectPlayer={onSelectPlayer}
          gameMeta={gameMeta}
          onGameMetaChange={onGameMetaChange}
          teamName={teamName}
          seasonYear={seasonYear}
          gamePositions={standard.gamePositions}
          onAddGamePosition={standard.addGamePosition}
          onUpdateGamePosition={standard.updateGamePosition}
          onRemoveGamePosition={standard.removeGamePosition}
          recordMode={recordMode}
          onSetRecordMode={standard.handleSetRecordMode}
          canRecordPitching={standard.canRecordPitching}
          currentEntry={currentEntry}
          onEntryChange={onEntryChange}
          onPrimaryAction={standard.handlePrimaryAction}
          primaryActionDisabled={standard.primaryActionDisabled}
          isEditingSavedEntry={isEditingActiveSavedEntry}
          isEditingSavedPitchingEntry={isEditingSavedPitchingEntry}
          onCancelEditSavedEntry={standard.handleCancelEditSavedEntry}
          pitchingEntry={pitchingEntry}
          onPitchingEntryChange={onPitchingEntryChange}
          onPitchingPrimaryAction={standard.handlePitchingPrimaryAction}
          isPitchingSaveDisabled={
            isPitchingSaveDisabled ||
            (!isEditingActiveSavedEntry &&
              !isEditingSavedPitchingEntry &&
              standard.pendingPitchingEntries.some((entry) => entry.playerId === activePlayer.id))
          }
          onCancelEditSavedPitchingEntry={onCancelEditSavedPitchingEntry}
          pendingEntries={standard.pendingEntries}
          pendingPitchingEntries={standard.pendingPitchingEntries}
          editingPendingPlayerId={standard.editingPendingPlayerId}
          onStartEditPendingEntry={standard.handleStartEditPendingEntry}
          onRemovePendingEntry={standard.handleRemovePendingEntry}
          onRemovePendingPitchingEntry={standard.handleRemovePendingPitchingEntry}
          onCancelEditPendingEntry={standard.resetPendingEdit}
          isSaving={standard.isSaving}
          onSave={standard.handleSave}
          savedEntries={savedEntries}
          savedPitchingEntries={savedPitchingEntries}
          editingSavedEntryId={isEditingActiveSavedEntry ? editingSavedEntryId : null}
          editingSavedPitchingEntryId={editingSavedPitchingEntryId}
          onStartEditSavedEntry={onStartEditSavedEntry}
          onDeleteSavedEntry={onDeleteSavedEntry}
          onStartEditSavedPitchingEntry={onStartEditSavedPitchingEntry}
          onDeleteSavedPitchingEntry={onDeleteSavedPitchingEntry}
          saveError={saveError}
          saveSuccess={saveSuccess}
          onClearSaveError={onClearSaveError}
          onNewGame={standard.handleNewGame}
        />
      )}
    </main>
  )
}
