import { useState, useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  DraftGameMeta,
  BattingEntryData,
  PitchingEntryData,
  Position,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  PendingBattingEntry,
  PendingPitchingEntry,
} from "../types"
import type { GameRow } from "../api/supabase-api"
import {
  fetchGamesBySeason,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import {
  createFullGame,
  updateBattingStatEntry,
  updateFullGame,
  deleteGame,
  deleteBattingStatEntry,
  deletePitchingStatEntry,
  updateGameInfo,
  updatePitchingStatEntry,
} from "../api/games"
import {
  buildBattingStatPayload,
  buildFullGamePayload,
  buildGamePayload,
  buildPitchingStatPayload,
} from "../utils/gamePayload"

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, game) => Math.max(max, Number(game.match_number) || 0), 0) + 1
}

const emptyPitchingEntry = (): PitchingEntryData => ({
  inningsPitchedOuts: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walks: 0,
  hitBatters: 0,
  strikeouts: 0,
  homeRunsAllowed: 0,
  note: "",
})

type Input = {
  activePlayer: Player
  currentEntry: BattingEntryData
  currentSeasonYear: number
  gameMeta: DraftGameMeta
  setGameMeta: Dispatch<SetStateAction<DraftGameMeta>>
  setEntriesByPlayer: Dispatch<SetStateAction<Record<string, BattingEntryData>>>
  setSavedEntriesByPlayer: Dispatch<SetStateAction<Record<string, SavedBattingGameEntry[]>>>
  setPitchingEntriesByPlayer: Dispatch<SetStateAction<Record<string, SavedPitchingGameEntry[]>>>
  setSavedGames: Dispatch<SetStateAction<GameRow[]>>
}

export function useMainDashboardCRUD({
  activePlayer,
  currentEntry,
  currentSeasonYear,
  gameMeta,
  setGameMeta,
  setEntriesByPlayer,
  setSavedEntriesByPlayer,
  setPitchingEntriesByPlayer,
  setSavedGames,
}: Input) {
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>(emptyPitchingEntry())
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)
  const [editingSavedPitchingEntry, setEditingSavedPitchingEntry] =
    useState<SavedPitchingGameEntry | null>(null)
  const [saveSuccess, setSaveSuccess] = useState("")
  const [preEditSnapshot, setPreEditSnapshot] = useState<{
    playerId: string
    gameMeta: DraftGameMeta
    currentEntry: BattingEntryData
  } | null>(null)
  const previousActivePlayerIdRef = useRef(activePlayer.id)

  useEffect(() => {
    const previousActivePlayerId = previousActivePlayerIdRef.current
    previousActivePlayerIdRef.current = activePlayer.id
    if (previousActivePlayerId === activePlayer.id) return
    if (!editingSavedEntryId && !editingSavedPitchingEntry) return

    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry())
    setRecordMode("batting")

    if (snap) {
      setGameMeta(snap.gameMeta)
      setEntriesByPlayer((prev) => ({
        ...prev,
        [snap.playerId]: snap.currentEntry,
      }))
    }
  }, [
    activePlayer.id,
    editingSavedEntryId,
    editingSavedPitchingEntry,
    preEditSnapshot,
    setEntriesByPlayer,
    setGameMeta,
  ])

  /* ---------------- REFRESH ---------------- */

  const refreshSavedEntries = async () => {
    const updated = await fetchSavedEntriesByPlayer(
      Number(activePlayer.teamId),
      currentSeasonYear
    )
    setSavedEntriesByPlayer(updated)
  }

  const refreshPitchingEntries = async () => {
    const updated = await fetchPitchingEntriesByPlayer(
      Number(activePlayer.teamId),
      currentSeasonYear
    )
    setPitchingEntriesByPlayer(updated)
  }

  const refreshSavedGames = async () => {
    const updated = await fetchGamesBySeason(
      Number(activePlayer.teamId),
      currentSeasonYear
    )
    setSavedGames(updated)
  }

  /* ---------------- SAVE ---------------- */

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
  ) => {
    try {
      const payload = buildFullGamePayload(Number(activePlayer.teamId), nextGameMeta, entries, pitchingEntries)

      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }

      await refreshSavedEntries()
      const updatedGames = await fetchGamesBySeason(
        Number(activePlayer.teamId),
        nextGameMeta.seasonYear
      )
      setSavedGames(updatedGames)
      if (pitchingEntries.length > 0) {
        await refreshPitchingEntries()
      }
      setGameMeta({
        date: "",
        opponent: "",
        location: "",
        seasonYear: nextGameMeta.seasonYear,
        matchNumber: getNextMatchNumber(updatedGames),
      })
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setEditingSavedPitchingEntry(null)
      setPitchingEntry(emptyPitchingEntry())
      setRecordMode("batting")
    } catch (error) {
      console.error(error)
      window.alert("Save failed")
    }
  }

  const handleSavePitchingGame = async (
    nextPitchingEntry = pitchingEntry,
    pitcherId = activePlayer.id
  ) => {
    if (!gameMeta.date.trim() || !gameMeta.opponent.trim()) {
      window.alert("Please enter Game Date and Opponent first.")
      return
    }

    if (nextPitchingEntry.earnedRuns > nextPitchingEntry.runsAllowed) {
      window.alert("Earned runs cannot exceed runs allowed.")
      return
    }

    try {
      await createFullGame({
        game: buildGamePayload(Number(activePlayer.teamId), gameMeta),
        battingStats: [],
        pitchingStats: [buildPitchingStatPayload(pitcherId, nextPitchingEntry)],
      })

      await refreshPitchingEntries()
      await refreshSavedGames()
    } catch (error) {
      console.error(error)
      window.alert("Pitching save failed")
    }
  }

  /* ---------------- EDIT BATTING ---------------- */

  const handleStartEditSavedEntry = (entry: SavedBattingGameEntry) => {
    if (!editingSavedEntryId) {
      setPreEditSnapshot({
        playerId: activePlayer.id,
        gameMeta,
        currentEntry,
      })
    }
    setGameMeta(entry.gameMeta)
    setEditingSavedEntry(entry)
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: entry.statLine,
    }))
    setEditingSavedEntryId(entry.id)
  }

  const handleUpdateSavedEntry = async (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData,
    gamePositions?: Position[]
  ) => {
    if (!editingSavedEntry) return

    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: buildGamePayload(Number(editingSavedEntry.teamId), nextGameMeta),
        battingStat: buildBattingStatPayload(
          editingSavedEntry.playerId,
          gamePositions ?? editingSavedEntry.gamePositions,
          nextStatLine,
          1
        ),
      })

      await refreshSavedEntries()
      await refreshSavedGames()
      const snap = preEditSnapshot
      setPreEditSnapshot(null)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      if (snap) {
        setGameMeta(snap.gameMeta)
        setEntriesByPlayer((prev) => ({
          ...prev,
          [snap.playerId]: snap.currentEntry,
        }))
      }
      setSaveSuccess("Saved")
      window.setTimeout(() => setSaveSuccess(""), 3000)
    } catch {
      window.alert("Update failed")
    }
  }

  const handleUpdateSavedGameMeta = async (nextGameMeta: DraftGameMeta) => {
    if (!editingSavedEntry) return

    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        ...buildGamePayload(Number(editingSavedEntry.teamId), nextGameMeta),
      })

      await refreshSavedEntries()
      await refreshSavedGames()
      const snap = preEditSnapshot
      setPreEditSnapshot(null)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      if (snap) {
        setGameMeta(snap.gameMeta)
        setEntriesByPlayer((prev) => ({
          ...prev,
          [snap.playerId]: snap.currentEntry,
        }))
      }
    } catch (error) {
      console.error(error)
      window.alert("Update failed")
    }
  }

  const handleUpdateSavedGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
  ) => {
    if (!editingSavedEntry) return

    try {
      await updateFullGame(
        editingSavedEntry.gameId,
        buildFullGamePayload(Number(editingSavedEntry.teamId), nextGameMeta, entries, pitchingEntries)
      )
      await refreshSavedEntries()
      await refreshPitchingEntries()
      await refreshSavedGames()
      const snap = preEditSnapshot
      setPreEditSnapshot(null)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setPitchingEntry(emptyPitchingEntry())
      setRecordMode("batting")
      if (snap) {
        setGameMeta(snap.gameMeta)
        setEntriesByPlayer((prev) => ({
          ...prev,
          [snap.playerId]: snap.currentEntry,
        }))
      }
      setSaveSuccess("Saved")
      window.setTimeout(() => setSaveSuccess(""), 3000)
    } catch (error) {
      console.error(error)
      window.alert("Update failed")
    }
  }

  const handleCancelEditSavedEntry = () => {
    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry())
    setRecordMode("batting")
    if (snap) {
      setGameMeta(snap.gameMeta)
      setEntriesByPlayer((prev) => ({
        ...prev,
        [snap.playerId]: snap.currentEntry,
      }))
    }
  }

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    if (!window.confirm("Delete?")) return

    try {
      await deleteBattingStatEntry(entry.statId, entry.gameId)
      await refreshSavedEntries()
      await refreshSavedGames()
      if (editingSavedEntryId === entry.id) {
        setEditingSavedEntryId(null)
        setEditingSavedEntry(null)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleDeleteSavedGame = async () => {
    if (!editingSavedEntry) return
    if (!window.confirm("Delete this whole game? All player stats for this game will be removed.")) {
      return
    }

    try {
      await deleteGame(editingSavedEntry.gameId)
      await refreshSavedEntries()
      await refreshPitchingEntries()
      await refreshSavedGames()
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete game failed"
      window.alert(`Delete game failed: ${message}`)
    }
  }

  /* ---------------- EDIT PITCHING ---------------- */

  const handleStartEditSavedPitchingEntry = (entry: SavedPitchingGameEntry) => {
    if (!editingSavedEntryId && !editingSavedPitchingEntry) {
      setPreEditSnapshot({
        playerId: activePlayer.id,
        gameMeta,
        currentEntry,
      })
    }
    setGameMeta(entry.gameMeta)
    setPitchingEntry(entry.statLine)
    setEditingSavedPitchingEntry(entry)
    setRecordMode("pitching")
  }

  const handleUpdateSavedPitchingEntry = async (
    nextGameMeta: DraftGameMeta,
    nextPitchingEntry: PitchingEntryData
  ) => {
    if (!editingSavedPitchingEntry) return

    try {
      await updatePitchingStatEntry(
        editingSavedPitchingEntry.statId,
        editingSavedPitchingEntry.gameId,
        {
          game: buildGamePayload(Number(editingSavedPitchingEntry.teamId), nextGameMeta),
          pitchingStat: buildPitchingStatPayload(editingSavedPitchingEntry.playerId, nextPitchingEntry),
        }
      )
      await refreshPitchingEntries()
      await refreshSavedGames()
      const snap = preEditSnapshot
      setPreEditSnapshot(null)
      setEditingSavedPitchingEntry(null)
      setPitchingEntry(emptyPitchingEntry())
      setRecordMode("batting")
      if (snap) {
        setGameMeta(snap.gameMeta)
        setEntriesByPlayer((prev) => ({
          ...prev,
          [snap.playerId]: snap.currentEntry,
        }))
      }
      setSaveSuccess("Saved")
      window.setTimeout(() => setSaveSuccess(""), 3000)
    } catch (error) {
      console.error(error)
      window.alert("Pitching update failed")
    }
  }

  const handleCancelEditSavedPitchingEntry = () => {
    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry())
    setRecordMode("batting")
    if (snap) {
      setGameMeta(snap.gameMeta)
      setEntriesByPlayer((prev) => ({
        ...prev,
        [snap.playerId]: snap.currentEntry,
      }))
    }
  }

  const handleDeleteSavedPitchingEntry = async (entry: SavedPitchingGameEntry) => {
    if (!window.confirm("Delete pitching entry?")) return

    try {
      await deletePitchingStatEntry(entry.statId, entry.gameId)
      await refreshPitchingEntries()
      await refreshSavedGames()
      if (editingSavedPitchingEntry?.id === entry.id) {
        handleCancelEditSavedPitchingEntry()
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching delete failed"
      window.alert(`Pitching delete failed: ${message}`)
    }
  }

  return {
    editingSavedEntryId,
    editingSavedEntry,
    editingSavedPitchingEntry,
    saveSuccess,
    setSaveSuccess,
    pitchingEntry,
    setPitchingEntry,
    recordMode,
    setRecordMode,
    handleSaveGame,
    handleSavePitchingGame,
    handleStartEditSavedEntry,
    handleUpdateSavedEntry,
    handleUpdateSavedGameMeta,
    handleUpdateSavedGame,
    handleCancelEditSavedEntry,
    handleDeleteSavedEntry,
    handleDeleteSavedGame,
    handleStartEditSavedPitchingEntry,
    handleUpdateSavedPitchingEntry,
    handleCancelEditSavedPitchingEntry,
    handleDeleteSavedPitchingEntry,
  }
}
