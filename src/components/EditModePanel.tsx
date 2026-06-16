import type { Player, BattingEntryData, PitchingEntryData, DraftGameMeta, SavedBattingGameEntry, PendingBattingEntry, PendingPitchingEntry } from "../types"
import type { EditGameTab, LivePlay } from "./RecordGamePage.types"
import GameMetaFields from "./GameMetaFields"
import SavedEntriesList from "./SavedEntriesList"
import BattingStatFields from "./BattingStatFields"
import PitchingStatFields from "./PitchingStatFields"
import { getPlayerLabel, getGameResult, getGameScore, formatLiveInnings } from "./RecordGamePage.utils"

type Props = {
  teamName: string
  teamRecord: { wins: number; losses: number; ties: number }
  teamGameEntries: SavedBattingGameEntry[]
  isEditingSavedEntry: boolean
  gameMeta: DraftGameMeta
  onGameMetaChange: (meta: DraftGameMeta) => void
  isMetaComplete: boolean
  onCancelEditSavedEntry: () => void
  onDeleteSavedGame?: () => void | Promise<void>
  onPrimaryAction: () => void
  editGameTab: EditGameTab
  onEditGameTabChange: (tab: EditGameTab) => void
  // Batting entries
  editGameEntries: PendingBattingEntry[]
  editAvailablePlayers: Player[]
  allPlayers: Player[]
  selectedEditAddPlayerId: string
  onEditAddPlayerIdChange: (id: string) => void
  onAddEditGameEntry: () => void
  selectedEditGameEntry: PendingBattingEntry | null
  onSelectEditPlayerId: (id: string) => void
  onUpdateEditGameEntry: (id: string, entry: BattingEntryData) => void
  onRemoveEditGameEntry: (id: string) => void
  livePlays: LivePlay[]
  hoveredEditPlayerId: string | null
  onHoveredEditPlayerIdChange: (id: string | null) => void
  hoveredEditPlayerEvents: LivePlay[]
  hasInvalidEditGameStats: boolean
  // Pitching entries
  editGamePitchingEntries: PendingPitchingEntry[]
  editAvailablePitchers: Player[]
  selectedEditAddPitcherId: string
  onEditAddPitcherIdChange: (id: string) => void
  onAddEditGamePitchingEntry: () => void
  selectedEditPitchingEntry: PendingPitchingEntry | null
  onSelectEditPitcherId: (id: string) => void
  onUpdateEditGamePitchingEntry: (id: string, entry: PitchingEntryData) => void
  onRemoveEditGamePitchingEntry: (id: string) => void
  hasInvalidEditPitchingStats: boolean
  // Save
  isSaving: boolean
  onSaveEditedGame: () => Promise<void>
  editingSavedEntryId: string | null
  onStartEditSavedEntry: (entry: SavedBattingGameEntry) => void
}

export default function EditModePanel({
  teamName, teamRecord, teamGameEntries, isEditingSavedEntry,
  gameMeta, onGameMetaChange, isMetaComplete,
  onCancelEditSavedEntry, onDeleteSavedGame, onPrimaryAction,
  editGameTab, onEditGameTabChange,
  editGameEntries, editAvailablePlayers, allPlayers,
  selectedEditAddPlayerId, onEditAddPlayerIdChange, onAddEditGameEntry,
  selectedEditGameEntry, onSelectEditPlayerId, onUpdateEditGameEntry, onRemoveEditGameEntry,
  livePlays, onHoveredEditPlayerIdChange, hoveredEditPlayerEvents,
  hasInvalidEditGameStats,
  editGamePitchingEntries, editAvailablePitchers,
  selectedEditAddPitcherId, onEditAddPitcherIdChange, onAddEditGamePitchingEntry,
  selectedEditPitchingEntry, onSelectEditPitcherId,
  onUpdateEditGamePitchingEntry, onRemoveEditGamePitchingEntry,
  hasInvalidEditPitchingStats,
  isSaving, onSaveEditedGame,
  editingSavedEntryId, onStartEditSavedEntry,
}: Props) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_420px]">
      <section className="order-2 space-y-4 sm:space-y-6 xl:order-1">
        {/* Team record header */}
        <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">{teamName}</p>
              <h2 className="mt-1 text-2xl font-extrabold tracking-tight text-green-950">
                {teamRecord.wins}-{teamRecord.losses}
                {teamRecord.ties > 0 ? `-${teamRecord.ties}` : ""}
              </h2>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-lg bg-[#f7f8f3] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games</p>
                <p className="mt-1 font-bold text-gray-900">{teamGameEntries.length}</p>
              </div>
              <div className="rounded-lg bg-[#f7f8f3] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Last</p>
                <p className="mt-1 font-bold text-gray-900">{teamGameEntries[0] ? getGameScore(teamGameEntries[0].gameMeta) : "-"}</p>
              </div>
              <div className="rounded-lg bg-[#f7f8f3] px-3 py-2">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Result</p>
                <p className="mt-1 font-bold text-gray-900">{teamGameEntries[0] ? getGameResult(teamGameEntries[0].gameMeta) || "-" : "-"}</p>
              </div>
            </div>
          </div>
        </div>

        {isEditingSavedEntry ? (
          <>
            {/* Game meta editor */}
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <GameMetaFields gameMeta={gameMeta} onGameMetaChange={onGameMetaChange} showLocation showMemo showScore teamName={teamName} />
              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                {onDeleteSavedGame && (
                  <button type="button" onClick={onDeleteSavedGame} className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                    Delete Game
                  </button>
                )}
                <button type="button" onClick={onCancelEditSavedEntry} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#f7f8f3]">
                  Cancel
                </button>
                <button type="button" onClick={onPrimaryAction} disabled={!isMetaComplete} className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                  Save Game Info
                </button>
              </div>
            </div>

            {/* Players editor */}
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-base font-bold text-gray-900">Players</h2>
                <div className="flex rounded-full border border-gray-200 bg-[#f7f8f3] p-1">
                  {(["batting", "pitching"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => onEditGameTabChange(tab)}
                      className={`rounded-full px-3 py-1 text-xs font-bold capitalize transition ${editGameTab === tab ? "bg-green-900 text-white shadow-sm" : "text-gray-500 hover:text-green-900"}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Add player row */}
              {editGameTab === "batting" ? (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-[#f7f8f3] p-3 sm:flex-row">
                  <select value={selectedEditAddPlayerId} onChange={(e) => onEditAddPlayerIdChange(e.target.value)} disabled={editAvailablePlayers.length === 0} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">
                    {editAvailablePlayers.length === 0 ? (
                      <option value="">All players are in this game</option>
                    ) : (
                      editAvailablePlayers.map((player) => (
                        <option key={player.id} value={player.id}>{getPlayerLabel(player)} {player.positions.join(", ")}</option>
                      ))
                    )}
                  </select>
                  <button type="button" onClick={onAddEditGameEntry} disabled={editAvailablePlayers.length === 0} className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                    Add Player
                  </button>
                </div>
              ) : (
                <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-[#f7f8f3] p-3 sm:flex-row">
                  <select value={selectedEditAddPitcherId} onChange={(e) => onEditAddPitcherIdChange(e.target.value)} disabled={editAvailablePitchers.length === 0} className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400">
                    {editAvailablePitchers.length === 0 ? (
                      <option value="">All pitchers are in this game</option>
                    ) : (
                      editAvailablePitchers.map((player) => (
                        <option key={player.id} value={player.id}>{getPlayerLabel(player)} {player.positions.join(", ")}</option>
                      ))
                    )}
                  </select>
                  <button type="button" onClick={onAddEditGamePitchingEntry} disabled={editAvailablePitchers.length === 0} className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300">
                    Add Pitcher
                  </button>
                </div>
              )}

              {/* Batting entries list */}
              {editGameTab === "batting" ? (
                <>
                  <div className="mt-3 space-y-2">
                    {editGameEntries.map((entry) => {
                      const player = allPlayers.find((item) => item.id === entry.playerId)
                      const isEditingPlayer = selectedEditGameEntry?.playerId === entry.playerId
                      const playerEvents = livePlays.filter((play) => play.playerId === entry.playerId)

                      return (
                        <div
                          key={entry.playerId}
                          onMouseEnter={() => onHoveredEditPlayerIdChange(entry.playerId)}
                          onFocus={() => onHoveredEditPlayerIdChange(entry.playerId)}
                          className={`rounded-xl border px-3 py-3 transition ${isEditingPlayer ? "border-green-900 bg-green-50" : "border-gray-200 bg-white"}`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {player ? getPlayerLabel(player) : `Player ${entry.playerId}`}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {player?.position ?? entry.gamePositions.join(" / ")} · AB {entry.AB} · H {entry.H} · RBI {entry.RBI}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                              <button
                                type="button"
                                onClick={() => onSelectEditPlayerId(isEditingPlayer ? "" : entry.playerId)}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${isEditingPlayer ? "bg-green-900 text-white" : "border border-gray-200 text-gray-700 hover:bg-[#f7f8f3]"}`}
                              >
                                {isEditingPlayer ? "Close" : "Edit"}
                              </button>
                              <button type="button" onClick={() => onRemoveEditGameEntry(entry.playerId)} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                                Remove
                              </button>
                            </div>
                          </div>
                          {isEditingPlayer && (
                            <div className="mt-4">
                              <BattingStatFields entry={entry} onEntryChange={(nextEntry) => onUpdateEditGameEntry(entry.playerId, nextEntry)} />
                            </div>
                          )}
                          {isEditingPlayer && playerEvents.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {playerEvents.map((play) => (
                                <span key={play.id} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
                                  {play.half} {play.inning} · {play.result}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {editGameEntries.length === 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                      No players in this game.
                    </div>
                  )}

                  {hoveredEditPlayerEvents.length > 0 && (
                    <div className="mt-4 rounded-xl bg-[#f7f8f3] p-3">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Game Mode Hits</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hoveredEditPlayerEvents.map((play) => (
                          <span key={play.id} className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600">
                            {play.half} {play.inning} · {play.result}{play.rbi > 0 ? ` · RBI ${play.rbi}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="mt-3 space-y-2">
                    {editGamePitchingEntries.map((entry) => {
                      const player = allPlayers.find((item) => item.id === entry.playerId)
                      const isEditingPitcher = selectedEditPitchingEntry?.playerId === entry.playerId

                      return (
                        <div
                          key={entry.playerId}
                          className={`rounded-xl border px-3 py-3 transition ${isEditingPitcher ? "border-green-900 bg-green-50" : "border-gray-200 bg-white"}`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {player ? getPlayerLabel(player) : `Player ${entry.playerId}`}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {player?.position ?? "P"} · IP {formatLiveInnings(entry.inningsPitchedOuts)} · ER {entry.earnedRuns} · SO {entry.strikeouts}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                              <button
                                type="button"
                                onClick={() => onSelectEditPitcherId(isEditingPitcher ? "" : entry.playerId)}
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${isEditingPitcher ? "bg-green-900 text-white" : "border border-gray-200 text-gray-700 hover:bg-[#f7f8f3]"}`}
                              >
                                {isEditingPitcher ? "Close" : "Edit"}
                              </button>
                              <button type="button" onClick={() => onRemoveEditGamePitchingEntry(entry.playerId)} className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700">
                                Remove
                              </button>
                            </div>
                          </div>
                          {isEditingPitcher && (
                            <div className="mt-4">
                              <PitchingStatFields entry={entry} onEntryChange={(nextEntry) => onUpdateEditGamePitchingEntry(entry.playerId, nextEntry)} />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {editGamePitchingEntries.length === 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                      No pitching entries in this game.
                    </div>
                  )}
                </>
              )}

              {hasInvalidEditGameStats && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Check the stat lines: hits cannot be greater than at-bats, and extra-base hits cannot be greater than hits.
                </p>
              )}
              {hasInvalidEditPitchingStats && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  Check pitching stats: earned runs cannot be greater than runs allowed.
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancelEditSavedEntry} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-[#f7f8f3]">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={onSaveEditedGame}
                  disabled={isSaving || !isMetaComplete || (editGameEntries.length === 0 && editGamePitchingEntries.length === 0) || hasInvalidEditGameStats || hasInvalidEditPitchingStats}
                  className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                >
                  {isSaving ? "Saving..." : "Save Players & Scores"}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-xl bg-white p-10 text-center shadow-sm sm:rounded-2xl">
            <p className="text-base font-semibold text-gray-700">Select a game to edit</p>
            <p className="mt-1 text-sm text-gray-400">Choose a game from the list to edit its details and player stats.</p>
          </div>
        )}
      </section>

      <aside className="order-1 space-y-4 sm:space-y-6 xl:order-2">
        <SavedEntriesList
          savedEntries={teamGameEntries}
          title="Games"
          onEdit={onStartEditSavedEntry}
          onCancelEdit={onCancelEditSavedEntry}
          editingSavedEntryId={editingSavedEntryId}
          emptyMessage="No saved games yet."
          showDescription={false}
          showStats={false}
          previewLimit={0}
        />
      </aside>
    </div>
  )
}
