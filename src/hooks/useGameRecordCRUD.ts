import type { Dispatch, SetStateAction } from "react"
import {
  createFullGame,
  deleteBattingStatEntry,
  deleteGame,
  deletePitchingStatEntry,
  updateBattingStatEntry,
  updateFullGame,
  updateGameInfo,
  updatePitchingStatEntry,
} from "../api/games"
import {
  fetchGamesBySeason,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import type { GameRow } from "../api/supabase-api"
import type {
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import { buildFullGamePayload } from "../utils/gamePayload"

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, game) => Math.max(max, Number(game.match_number) || 0), 0) + 1
}

const emptyBattingEntry: BattingEntryData = {
  AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
  BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "",
}
const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0, note: "",
}

type Input = {
  activePlayer: Player | null
  allPlayers: Player[]
  teamId: number | null
  seasonYear: number
  gameMeta: DraftGameMeta
  pitchingEntry: PitchingEntryData
  editingSavedEntry: SavedBattingGameEntry | null
  editingSavedEntryId: string | null
  editingSavedPitchingEntry: SavedPitchingGameEntry | null
  preEditSnapshot: { gameMeta: DraftGameMeta; currentEntry: BattingEntryData } | null
  seasonGames: GameRow[]
  setSaveError: Dispatch<SetStateAction<string>>
  setSaveSuccess: Dispatch<SetStateAction<string>>
  setCurrentEntry: Dispatch<SetStateAction<BattingEntryData>>
  setPitchingEntry: Dispatch<SetStateAction<PitchingEntryData>>
  setSavedEntriesByPlayer: Dispatch<SetStateAction<Record<string, SavedBattingGameEntry[]>>>
  setPitchingEntriesByPlayer: Dispatch<SetStateAction<Record<string, SavedPitchingGameEntry[]>>>
  setSavedEntries: Dispatch<SetStateAction<SavedBattingGameEntry[]>>
  setSeasonGames: Dispatch<SetStateAction<GameRow[]>>
  setGameMeta: Dispatch<SetStateAction<DraftGameMeta>>
  setEditingSavedEntryId: Dispatch<SetStateAction<string | null>>
  setEditingSavedEntry: Dispatch<SetStateAction<SavedBattingGameEntry | null>>
  setEditingSavedPitchingEntry: Dispatch<SetStateAction<SavedPitchingGameEntry | null>>
  setPreEditSnapshot: Dispatch<SetStateAction<{ gameMeta: DraftGameMeta; currentEntry: BattingEntryData } | null>>
  setRecordMode: Dispatch<SetStateAction<"batting" | "pitching">>
  enqueueOfflineGame: (payload: ReturnType<typeof buildFullGamePayload>) => void
}

export function useGameRecordCRUD({
  activePlayer,
  allPlayers,
  teamId,
  seasonYear,
  gameMeta,
  pitchingEntry,
  editingSavedEntry,
  editingSavedEntryId,
  editingSavedPitchingEntry,
  preEditSnapshot,
  seasonGames,
  setSaveError,
  setSaveSuccess,
  setCurrentEntry,
  setPitchingEntry,
  setSavedEntriesByPlayer,
  setPitchingEntriesByPlayer,
  setSavedEntries,
  setSeasonGames,
  setGameMeta,
  setEditingSavedEntryId,
  setEditingSavedEntry,
  setEditingSavedPitchingEntry,
  setPreEditSnapshot,
  setRecordMode,
  enqueueOfflineGame,
}: Input) {
  const refreshAll = async (year: number) => {
    if (teamId == null || !activePlayer) return null
    const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, year),
      fetchPitchingEntriesByPlayer(teamId, year),
      fetchGamesBySeason(teamId, year),
    ])
    setSavedEntriesByPlayer(refreshed)
    setPitchingEntriesByPlayer(refreshedPitching)
    setSavedEntries(refreshed[activePlayer.id] ?? [])
    setSeasonGames(refreshedGames)
    return refreshedGames
  }

  const clearEditing = () => {
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setCurrentEntry(emptyBattingEntry)
    setPitchingEntry(emptyPitchingEntry)
    setRecordMode("batting")
  }

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
  ) => {
    if (!activePlayer) return
    setSaveError("")
    try {
      const payload = buildFullGamePayload(Number(activePlayer.teamId), nextGameMeta, entries, pitchingEntries)
      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else if (!navigator.onLine) {
        enqueueOfflineGame(payload)
        return
      } else {
        await createFullGame(payload)
      }
      const refreshedGames = await refreshAll(nextGameMeta.seasonYear)
      setGameMeta({
        date: "", opponent: "", location: "",
        seasonYear: nextGameMeta.seasonYear,
        matchNumber: getNextMatchNumber(refreshedGames ?? []),
      })
      clearEditing()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      setSaveError(message)
      throw err
    }
  }

  const handleStartEditSavedEntry = (savedEntry: SavedBattingGameEntry) => {
    if (!editingSavedEntryId) setPreEditSnapshot({ gameMeta, currentEntry: emptyBattingEntry })
    setEditingSavedEntryId(savedEntry.id)
    setEditingSavedEntry(savedEntry)
    setGameMeta(savedEntry.gameMeta)
    setCurrentEntry(savedEntry.statLine)
  }

  const handleUpdateSavedEntry = async (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData,
    gamePositions?: import("../types").Position[]
  ) => {
    if (!activePlayer) { setSaveError("No active player."); return }
    if (!editingSavedEntry) { setSaveError("No entry selected."); return }
    if (!nextGameMeta.date.trim() || !nextGameMeta.opponent.trim()) { setSaveError("Date and opponent are required."); return }
    setSaveError("")
    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: {
          team_id: Number(editingSavedEntry.teamId),
          game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null,
          opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        battingStat: {
          player_id: Number(editingSavedEntry.playerId), batting_order: 1,
          game_positions: gamePositions ?? editingSavedEntry.gamePositions,
          ab: nextStatLine.AB, h: nextStatLine.H, double_hits: nextStatLine.doubles,
          triple_hits: nextStatLine.triples, hr: nextStatLine.HR, rbi: nextStatLine.RBI,
          bb: nextStatLine.BB, hbp: nextStatLine.HBP, sf: nextStatLine.SF,
          so: nextStatLine.SO, sb: nextStatLine.SB, cs: nextStatLine.CS,
          note: nextStatLine.note.trim() || null,
        },
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
      setSaveSuccess("Saved")
      setTimeout(() => setSaveSuccess(""), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed")
    }
  }

  const handleUpdateSavedGameMeta = async (nextGameMeta: DraftGameMeta) => {
    if (!activePlayer || !editingSavedEntry) return
    setSaveError("")
    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        team_id: Number(editingSavedEntry.teamId),
        game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
        season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
        location: nextGameMeta.location?.trim() || null,
        ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
        team_score: nextGameMeta.teamScore ?? null,
        opponent_score: nextGameMeta.opponentScore ?? null,
        result: nextGameMeta.result || null,
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Update failed")
      throw err
    }
  }

  const handleCancelEditSavedEntry = () => {
    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setGameMeta(snap?.gameMeta ?? { date: "", opponent: "", location: "", seasonYear, matchNumber: 1 })
    setCurrentEntry(snap?.currentEntry ?? emptyBattingEntry)
    setPitchingEntry(emptyPitchingEntry)
    setRecordMode("batting")
  }

  const handleDeleteSavedEntry = async (savedEntry: SavedBattingGameEntry) => {
    if (!activePlayer) return
    if (!window.confirm("Delete this saved entry?")) return
    setSaveError("")
    try {
      await deleteBattingStatEntry(savedEntry.statId, savedEntry.gameId)
      await refreshAll(seasonYear)
      if (editingSavedEntryId === savedEntry.id) {
        setEditingSavedEntryId(null)
        setEditingSavedEntry(null)
        setCurrentEntry(emptyBattingEntry)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleDeleteSavedGame = async () => {
    if (!activePlayer || !editingSavedEntry) return
    if (!window.confirm("Delete this entire game? This cannot be undone.")) return
    setSaveError("")
    try {
      await deleteGame(editingSavedEntry.gameId)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
      const refreshedGames = await refreshAll(seasonYear)
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(refreshedGames ?? []) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleStartEditSavedPitchingEntry = (savedEntry: SavedPitchingGameEntry) => {
    setEditingSavedPitchingEntry(savedEntry)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setGameMeta(savedEntry.gameMeta)
    setPitchingEntry(savedEntry.statLine)
    setRecordMode("pitching")
  }

  const handleUpdateSavedPitchingEntry = async (
    nextGameMeta: DraftGameMeta,
    nextPitchingEntry: PitchingEntryData
  ) => {
    if (!activePlayer || !editingSavedPitchingEntry) return
    setSaveError("")
    try {
      await updatePitchingStatEntry(editingSavedPitchingEntry.statId, editingSavedPitchingEntry.gameId, {
        game: {
          team_id: Number(editingSavedPitchingEntry.teamId),
          game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null,
          opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        pitchingStat: {
          player_id: Number(editingSavedPitchingEntry.playerId),
          innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
          hits_allowed: nextPitchingEntry.hitsAllowed,
          runs_allowed: nextPitchingEntry.runsAllowed,
          earned_runs: nextPitchingEntry.earnedRuns,
          walks: nextPitchingEntry.walks, hbp: nextPitchingEntry.hitBatters,
          strikeouts: nextPitchingEntry.strikeouts,
          home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
          note: nextPitchingEntry.note.trim() || null,
        },
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedPitchingEntry(null)
      setPitchingEntry(emptyPitchingEntry)
      setSaveSuccess("Saved")
      setTimeout(() => setSaveSuccess(""), 3000)
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Pitching update failed")
      throw err
    }
  }

  const handleCancelEditSavedPitchingEntry = () => {
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry)
  }

  const handleDeleteSavedPitchingEntry = async (savedEntry: SavedPitchingGameEntry) => {
    if (!activePlayer) return
    if (!window.confirm("Delete this pitching entry?")) return
    setSaveError("")
    try {
      await deletePitchingStatEntry(savedEntry.statId, savedEntry.gameId)
      await refreshAll(seasonYear)
      if (editingSavedPitchingEntry?.id === savedEntry.id) {
        setEditingSavedPitchingEntry(null)
        setPitchingEntry(emptyPitchingEntry)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching delete failed"
      setSaveError(message)
      window.alert(`Pitching delete failed: ${message}`)
    }
  }

  const handleSavePitchingGame = async (
    nextPitchingEntry = pitchingEntry,
    pitcherId = activePlayer?.id
  ) => {
    if (!activePlayer || !pitcherId) return
    const pitcher = allPlayers.find((p) => p.id === pitcherId)
    try {
      await handleSaveGame(gameMeta, [], [{ ...nextPitchingEntry, playerId: pitcherId, playerName: pitcher?.name ?? activePlayer.name }])
      setPitchingEntry(emptyPitchingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching save failed"
      setSaveError(message)
      throw err
    }
  }

  const handleNewGame = () => {
    setSaveError("")
    setPreEditSnapshot(null)
    clearEditing()
    setGameMeta({
      date: "", opponent: "", location: "", seasonYear,
      matchNumber: getNextMatchNumber(seasonGames),
    })
  }

  return {
    handleSaveGame,
    handleStartEditSavedEntry,
    handleUpdateSavedEntry,
    handleUpdateSavedGameMeta,
    handleCancelEditSavedEntry,
    handleDeleteSavedEntry,
    handleDeleteSavedGame,
    handleStartEditSavedPitchingEntry,
    handleUpdateSavedPitchingEntry,
    handleCancelEditSavedPitchingEntry,
    handleDeleteSavedPitchingEntry,
    handleSavePitchingGame,
    handleNewGame,
  }
}
