import { useState, useEffect, useRef } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  LeagueKey,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  PendingPitchingEntry,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  DisplayStat,
  PitchingEntryData,
} from "../types"
import { useGameStats } from "../hooks/useGameStats"
import {
  createFullGame,
  updateBattingStatEntry,
  updateFullGame,
  deleteGame,
  deleteBattingStatEntry,
  deletePitchingStatEntry,
  updateGameInfo,
  updatePitchingStatEntry,
} from "../api/api"
import {
  fetchGamesBySeason,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import type { GameRow } from "../api/supabase-api"
import RecordGamePage from "./RecordGamePage"
import MyStatsPage from "./MyStatsPage"
import MyPitchingStatsPage from "./MyPitchingStatsPage"
import {
  buildBattingStatPayload,
  buildFullGamePayload,
  buildGamePayload,
  buildPitchingStatPayload,
} from "../utils/gamePayload"

type MainDashboardProps = {
  activePlayer: Player
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
  activeView: "stats" | "record"
  teamName: string
  league?: LeagueKey | null
  gameMeta: DraftGameMeta
  setGameMeta: Dispatch<SetStateAction<DraftGameMeta>>
  entriesByPlayer: Record<string, BattingEntryData>
  setEntriesByPlayer: Dispatch<SetStateAction<Record<string, BattingEntryData>>>
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
  savedGames: GameRow[]
  mode: "batting" | "pitching"
  onModeChange: (mode: "batting" | "pitching") => void
  setSavedEntriesByPlayer: Dispatch<
    SetStateAction<Record<string, SavedBattingGameEntry[]>>
  >
  setPitchingEntriesByPlayer: Dispatch<
    SetStateAction<Record<string, SavedPitchingGameEntry[]>>
  >
  setSavedGames: Dispatch<SetStateAction<GameRow[]>>
  onGameModeChange?: (isGameMode: boolean) => void
}

const createInitialEntry = (): BattingEntryData => ({
  AB: 0,
  H: 0,
  doubles: 0,
  triples: 0,
  HR: 0,
  RBI: 0,
  BB: 0,
  HBP: 0,
  SF: 0,
  SO: 0,
  SB: 0,
  CS: 0,
  note: "",
})

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, game) => Math.max(max, Number(game.match_number) || 0), 0) + 1
}

export default function MainDashboard({
  activePlayer,
  allPlayers,
  onSelectPlayer,
  activeView,
  teamName,
  league,
  gameMeta,
  setGameMeta,
  entriesByPlayer,
  setEntriesByPlayer,
  savedEntriesByPlayer,
  pitchingEntriesByPlayer,
  savedGames,
  mode,
  onModeChange,
  setSavedEntriesByPlayer,
  setPitchingEntriesByPlayer,
  setSavedGames,
  onGameModeChange,
}: MainDashboardProps) {

  /* ---------------- TAB ---------------- */
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")

  useEffect(() => {
    if (activeView !== "stats") return
    const nextMode = activePlayer.positions.length === 1 && activePlayer.positions[0] === "P" ? "pitching" : "batting"
    if (mode !== nextMode) onModeChange(nextMode)
  }, [activePlayer.id, activeView])

  /* ---------------- PITCHING ---------------- */
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>({
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

  /* ---------------- EDIT ---------------- */
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

  /* ---------------- DATA ---------------- */
  const currentEntry =
    entriesByPlayer[activePlayer.id] ?? createInitialEntry()

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

  const currentSeasonYear = activePlayer.seasonYear

  const allPlayerEntries = savedEntriesByPlayer[activePlayer.id] ?? []

  const savedEntries = allPlayerEntries.filter(
    (entry) =>
      entry.teamId === activePlayer.teamId &&
      entry.gameMeta.seasonYear === currentSeasonYear
  )

  const savedPitchingEntries = (pitchingEntriesByPlayer[activePlayer.id] ?? []).filter(
    (entry) =>
      entry.teamId === activePlayer.teamId &&
      entry.gameMeta.seasonYear === currentSeasonYear
  )

  const teamSavedEntries = Object.values(savedEntriesByPlayer)
    .flat()
    .filter(
      (entry) =>
        entry.teamId === activePlayer.teamId &&
        entry.gameMeta.seasonYear === currentSeasonYear
    )
  const teamSavedPitchingEntries = Object.values(pitchingEntriesByPlayer)
    .flat()
    .filter(
      (entry) =>
        entry.teamId === activePlayer.teamId &&
        entry.gameMeta.seasonYear === currentSeasonYear
    )

  const handleRecordSelectPlayer = (player: Player) => {
    if (player.id === activePlayer.id) return
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
      [player.id]: prev[player.id] ?? createInitialEntry(),
    }))
    setPitchingEntry(emptyPitchingEntry())
    setRecordMode("batting")
    onSelectPlayer(player)
  }

  const savedStatLines = savedEntries.map((entry) => entry.statLine)
  const { kpi } = useGameStats(savedStatLines)

  const calculatedStats: DisplayStat[] = [
    { label: "AVG", value: kpi.avg },
    { label: "OBP", value: kpi.obp },
    { label: "OPS", value: kpi.ops },
    { label: "BB/K", value: kpi.bbPerK },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
    { label: "SB", value: String(kpi.sb) },
    { label: "CS", value: String(kpi.cs) },
    { label: "SB%", value: kpi.sbPct },
  ]

  /* ---------------- HANDLERS ---------------- */

  const handleEntryChange = (next: BattingEntryData) => {
    if (saveSuccess) setSaveSuccess("")
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: next,
    }))
  }

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

  /* ---------------- EDIT ---------------- */

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
    gamePositions?: import("../types").Position[]
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

  /* ---------------- VIEW ---------------- */

  if (activeView === "stats" && mode === "pitching") {
    return (
      <MyPitchingStatsPage
        activePlayer={activePlayer}
        entries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
        teamEntries={teamSavedPitchingEntries}
        battingEntries={savedEntries}
        league={league}
        mode={mode}
        onModeChange={onModeChange}
      />
    )
  }

  return activeView === "record" ? (
    <RecordGamePage
      activePlayer={activePlayer}
      allPlayers={allPlayers}
      onSelectPlayer={handleRecordSelectPlayer}
      showRosterPanel={false}
      currentEntry={currentEntry}
      gameMeta={gameMeta}
      savedEntries={savedEntries}
      savedPitchingEntries={savedPitchingEntries}
      teamSavedEntries={teamSavedEntries}
      teamSavedPitchingEntries={teamSavedPitchingEntries}
      savedGames={savedGames}
      onGameMetaChange={setGameMeta}
      onEntryChange={handleEntryChange}
      onSaveGame={handleSaveGame}
      teamName={teamName}
      seasonYear={gameMeta.seasonYear}
      isEditingSavedEntry={editingSavedEntryId !== null}
      isEditingSavedPitchingEntry={editingSavedPitchingEntry !== null}
      editingSavedEntryId={editingSavedEntryId}
      editingSavedPitchingEntryId={editingSavedPitchingEntry?.id ?? null}
      editingGamePositions={editingSavedEntry?.gamePositions}
      onStartEditSavedEntry={handleStartEditSavedEntry}
      onUpdateSavedEntry={handleUpdateSavedEntry}
      onUpdateSavedGame={handleUpdateSavedGame}
      onUpdateSavedGameMeta={handleUpdateSavedGameMeta}
      onCancelEditSavedEntry={handleCancelEditSavedEntry}
      onDeleteSavedEntry={handleDeleteSavedEntry}
      onDeleteSavedGame={handleDeleteSavedGame}
      onStartEditSavedPitchingEntry={handleStartEditSavedPitchingEntry}
      onUpdateSavedPitchingEntry={handleUpdateSavedPitchingEntry}
      onCancelEditSavedPitchingEntry={handleCancelEditSavedPitchingEntry}
      onDeleteSavedPitchingEntry={handleDeleteSavedPitchingEntry}
      saveSuccess={saveSuccess}
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
      onGameModeChange={onGameModeChange}
    />
  ) : (
      <MyStatsPage
        activePlayer={activePlayer}
        calculatedStats={calculatedStats}
        savedEntries={savedEntries}
        pitchingEntries={savedPitchingEntries}
        teamSavedEntries={teamSavedEntries}
        seasonYear={gameMeta.seasonYear}
        league={league}
        mode={mode}
        onModeChange={onModeChange}
      />
  )
}
