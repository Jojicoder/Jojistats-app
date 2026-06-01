import { useEffect, useRef, useState } from "react"
import {
  fetchGamesBySeason,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import type { GameRow } from "../api/supabase-api"
import {
  createFullGame,
  deleteBattingStatEntry,
  deleteGame,
  deletePitchingStatEntry,
  updateBattingStatEntry,
  updateFullGame,
  updateGameInfo,
  updatePitchingStatEntry,
} from "../api/api"
import RecordGamePage from "./RecordGamePage"
import {
  buildBattingStatPayload,
  buildFullGamePayload,
  buildGamePayload,
  buildPitchingStatPayload,
} from "../utils/gamePayload"
import type {
  Player,
  DraftGameMeta,
  BattingEntryData,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
} from "../types"

const emptyBattingEntry: BattingEntryData = {
  AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, note: "",
}

const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0,
}

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, g) => Math.max(max, Number(g.match_number) || 0), 0) + 1
}

type Props = {
  initialPlayer: Player
  allPlayers: Player[]
  teamName: string
  teamId: number
  seasonYear: number
  // Pre-loaded by the caller (e.g. StatsPage) to avoid duplicate API fetches
  initialSavedEntriesByPlayer?: Record<string, SavedBattingGameEntry[]>
  initialPitchingEntriesByPlayer?: Record<string, SavedPitchingGameEntry[]>
  showRosterPanel?: boolean
}

export default function RecordGameContainer({
  initialPlayer,
  allPlayers,
  teamName,
  teamId,
  seasonYear,
  initialSavedEntriesByPlayer = {},
  initialPitchingEntriesByPlayer = {},
  showRosterPanel = true,
}: Props) {
  const [activePlayer, setActivePlayer] = useState(initialPlayer)
  const [currentEntry, setCurrentEntry] = useState<BattingEntryData>(emptyBattingEntry)
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>(emptyPitchingEntry)
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: "", opponent: "", location: "", seasonYear, matchNumber: 1,
  })
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState(initialSavedEntriesByPlayer)
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState(initialPitchingEntriesByPlayer)
  const [seasonGames, setSeasonGames] = useState<GameRow[]>([])
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)
  const [editingSavedPitchingEntry, setEditingSavedPitchingEntry] = useState<SavedPitchingGameEntry | null>(null)
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")
  const [saveError, setSaveError] = useState("")
  const skipNextSaveRef = useRef(true)
  const [preEditSnapshot, setPreEditSnapshot] = useState<{ gameMeta: DraftGameMeta; currentEntry: BattingEntryData } | null>(null)
  const standardDraftKey = `standard-draft-${teamId}-${seasonYear}`

  const savedEntries = savedEntriesByPlayer[activePlayer.id] ?? []
  const savedPitchingEntries = pitchingEntriesByPlayer[activePlayer.id] ?? []
  const teamSavedEntries = Object.values(savedEntriesByPlayer).flat()
  const teamSavedPitchingEntries = Object.values(pitchingEntriesByPlayer).flat()

  useEffect(() => {
    fetchGamesBySeason(teamId, seasonYear)
      .then((games) => {
        setSeasonGames(games)
        setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
      })
      .catch(console.error)
  }, [teamId, seasonYear])

  useEffect(() => {
    const saved = localStorage.getItem(standardDraftKey)
    if (!saved) return
    try {
      const draft = JSON.parse(saved) as {
        gameMeta?: DraftGameMeta
        currentEntry?: BattingEntryData
        pitchingEntry?: PitchingEntryData
        recordMode?: "batting" | "pitching"
        activePlayerId?: string
      }
      skipNextSaveRef.current = true
      if (draft.gameMeta) setGameMeta(draft.gameMeta)
      if (draft.currentEntry) setCurrentEntry(draft.currentEntry)
      if (draft.pitchingEntry) setPitchingEntry(draft.pitchingEntry)
      if (draft.recordMode) setRecordMode(draft.recordMode)
      if (draft.activePlayerId) {
        const player = allPlayers.find((p) => p.id === draft.activePlayerId)
        if (player) setActivePlayer(player)
      }
    } catch (error) {
      console.error("Failed to restore standard draft", error)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [standardDraftKey])

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }
    if (editingSavedEntryId || editingSavedPitchingEntry) return
    localStorage.setItem(
      standardDraftKey,
      JSON.stringify({ gameMeta, currentEntry, pitchingEntry, recordMode, activePlayerId: activePlayer.id })
    )
  }, [gameMeta, currentEntry, pitchingEntry, recordMode, activePlayer.id, standardDraftKey, editingSavedEntryId, editingSavedPitchingEntry])

  const clearDraft = () => localStorage.removeItem(standardDraftKey)

  const refreshAll = async (nextSeasonYear = seasonYear) => {
    const [batting, pitching, games] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, nextSeasonYear),
      fetchPitchingEntriesByPlayer(teamId, nextSeasonYear),
      fetchGamesBySeason(teamId, nextSeasonYear),
    ])
    setSavedEntriesByPlayer(batting)
    setPitchingEntriesByPlayer(pitching)
    setSeasonGames(games)
    return { batting, pitching, games }
  }

  const handleSelectPlayer = async (player: Player) => {
    if (player.id === activePlayer.id) return
    setActivePlayer(player)
    const [batting, pitching] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, seasonYear),
      fetchPitchingEntriesByPlayer(teamId, seasonYear),
    ])
    setSavedEntriesByPlayer(batting)
    setPitchingEntriesByPlayer(pitching)
  }

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
  ) => {
    setSaveError("")
    const payload = buildFullGamePayload(teamId, nextGameMeta, entries, pitchingEntries)

    try {
      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }
      const { batting, games } = await refreshAll(nextGameMeta.seasonYear)
      setGameMeta({
        date: "",
        opponent: "",
        location: "",
        seasonYear: nextGameMeta.seasonYear,
        matchNumber: getNextMatchNumber(games),
      })
      setSavedEntriesByPlayer(batting)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setEditingSavedPitchingEntry(null)
      setCurrentEntry(emptyBattingEntry)
      setPitchingEntry(emptyPitchingEntry)
      setRecordMode("batting")
      clearDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      setSaveError(message)
      throw err
    }
  }

  const handleStartEditSavedEntry = (entry: SavedBattingGameEntry) => {
    if (!editingSavedEntryId) {
      setPreEditSnapshot({ gameMeta, currentEntry })
    }
    setEditingSavedEntryId(entry.id)
    setEditingSavedEntry(entry)
    setGameMeta(entry.gameMeta)
    setCurrentEntry(entry.statLine)
  }

  const handleNewGame = () => {
    setSaveError("")
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setCurrentEntry(emptyBattingEntry)
    setPitchingEntry(emptyPitchingEntry)
    setRecordMode("batting")
    setGameMeta({ date: "", opponent: "", location: "", seasonYear, matchNumber: getNextMatchNumber(seasonGames) })
    clearDraft()
  }

  const restorePreEditState = () => {
    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setGameMeta(snap?.gameMeta ?? { date: "", opponent: "", location: "", seasonYear, matchNumber: getNextMatchNumber(seasonGames) })
    setCurrentEntry(snap?.currentEntry ?? emptyBattingEntry)
  }

  const handleUpdateSavedEntry = async (nextGameMeta: DraftGameMeta, nextStatLine: BattingEntryData, gamePositions?: import("../types").Position[]) => {
    if (!editingSavedEntry) return
    setSaveError("")
    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: buildGamePayload(teamId, nextGameMeta),
        battingStat: buildBattingStatPayload(
          editingSavedEntry.playerId,
          gamePositions ?? editingSavedEntry.gamePositions,
          nextStatLine,
          1
        ),
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      restorePreEditState()
      clearDraft()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleUpdateSavedGameMeta = async (nextGameMeta: DraftGameMeta) => {
    if (!editingSavedEntry) return
    setSaveError("")
    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        ...buildGamePayload(teamId, nextGameMeta),
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      restorePreEditState()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleCancelEditSavedEntry = () => {
    const snap = preEditSnapshot
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setGameMeta(snap?.gameMeta ?? { date: "", opponent: "", location: "", seasonYear, matchNumber: getNextMatchNumber(seasonGames) })
    setCurrentEntry(snap?.currentEntry ?? emptyBattingEntry)
    setPitchingEntry(emptyPitchingEntry)
    setRecordMode("batting")
  }

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    if (!window.confirm("Delete this saved entry?")) return
    setSaveError("")
    try {
      await deleteBattingStatEntry(entry.statId, entry.gameId)
      const { games } = await refreshAll()
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
      if (editingSavedEntryId === entry.id) {
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
    if (!editingSavedEntry) return
    if (!window.confirm("Delete this entire game? This cannot be undone.")) return
    setSaveError("")
    try {
      await deleteGame(editingSavedEntry.gameId)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
      const { games } = await refreshAll()
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleStartEditSavedPitchingEntry = (entry: SavedPitchingGameEntry) => {
    setEditingSavedPitchingEntry(entry)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setGameMeta(entry.gameMeta)
    setPitchingEntry(entry.statLine)
    setRecordMode("pitching")
  }

  const handleUpdateSavedPitchingEntry = async (nextGameMeta: DraftGameMeta, nextPitchingEntry: PitchingEntryData) => {
    if (!editingSavedPitchingEntry) return
    setSaveError("")
    try {
      await updatePitchingStatEntry(editingSavedPitchingEntry.statId, editingSavedPitchingEntry.gameId, {
        game: buildGamePayload(teamId, nextGameMeta),
        pitchingStat: buildPitchingStatPayload(editingSavedPitchingEntry.playerId, nextPitchingEntry),
      })
      await refreshAll(nextGameMeta.seasonYear)
      setEditingSavedPitchingEntry(null)
      setPitchingEntry(emptyPitchingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleCancelEditSavedPitchingEntry = () => {
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry)
  }

  const handleDeleteSavedPitchingEntry = async (entry: SavedPitchingGameEntry) => {
    if (!window.confirm("Delete this pitching entry?")) return
    setSaveError("")
    try {
      await deletePitchingStatEntry(entry.statId, entry.gameId)
      await refreshAll()
      if (editingSavedPitchingEntry?.id === entry.id) {
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
    pitcherId = activePlayer.id
  ) => {
    const pitcher = allPlayers.find((player) => player.id === pitcherId)

    try {
      await handleSaveGame(gameMeta, [], [
        {
          ...nextPitchingEntry,
          playerId: pitcherId,
          playerName: pitcher?.name ?? activePlayer.name,
        },
      ])
      setPitchingEntry(emptyPitchingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching save failed"
      setSaveError(message)
      throw err
    }
  }

  return (
    <RecordGamePage
      activePlayer={activePlayer}
      allPlayers={allPlayers}
      onSelectPlayer={handleSelectPlayer}
      showRosterPanel={showRosterPanel}
      currentEntry={currentEntry}
      gameMeta={gameMeta}
      savedEntries={savedEntries}
      savedPitchingEntries={savedPitchingEntries}
      teamSavedEntries={teamSavedEntries}
      teamSavedPitchingEntries={teamSavedPitchingEntries}
      savedGames={seasonGames}
      onGameMetaChange={setGameMeta}
      onEntryChange={setCurrentEntry}
      onSaveGame={handleSaveGame}
      teamName={teamName}
      seasonYear={seasonYear}
      isEditingSavedEntry={editingSavedEntryId !== null}
      isEditingSavedPitchingEntry={editingSavedPitchingEntry !== null}
      editingSavedEntryId={editingSavedEntryId}
      onStartEditSavedEntry={handleStartEditSavedEntry}
      onUpdateSavedEntry={handleUpdateSavedEntry}
      onUpdateSavedGame={handleSaveGame}
      onUpdateSavedGameMeta={handleUpdateSavedGameMeta}
      onCancelEditSavedEntry={handleCancelEditSavedEntry}
      onDeleteSavedEntry={handleDeleteSavedEntry}
      onDeleteSavedGame={handleDeleteSavedGame}
      onStartEditSavedPitchingEntry={handleStartEditSavedPitchingEntry}
      onUpdateSavedPitchingEntry={handleUpdateSavedPitchingEntry}
      onCancelEditSavedPitchingEntry={handleCancelEditSavedPitchingEntry}
      onDeleteSavedPitchingEntry={handleDeleteSavedPitchingEntry}
      editingGamePositions={editingSavedEntry?.gamePositions}
      recordMode={recordMode}
      setRecordMode={setRecordMode}
      pitchingEntry={pitchingEntry}
      onPitchingEntryChange={setPitchingEntry}
      onSavePitchingGame={handleSavePitchingGame}
      isPitchingSaveDisabled={
        !gameMeta.date.trim() ||
        !gameMeta.opponent.trim() ||
        pitchingEntry.earnedRuns > pitchingEntry.runsAllowed
      }
      saveError={saveError}
      onClearSaveError={() => setSaveError("")}
      onNewGame={handleNewGame}
    />
  )
}
