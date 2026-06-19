import { useEffect } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  LeagueKey,
  BattingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  DisplayStat,
} from "../types"
import { useGameStats } from "../hooks/useGameStats"
import { useMainDashboardCRUD } from "../hooks/useMainDashboardCRUD"
import type { GameRow } from "../api/supabase-api"
import RecordGamePage from "./RecordGamePage"
import MyStatsPage from "./MyStatsPage"
import MyPitchingStatsPage from "./MyPitchingStatsPage"

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

  useEffect(() => {
    if (activeView !== "stats") return
    const nextMode = activePlayer.positions.length === 1 && activePlayer.positions[0] === "P" ? "pitching" : "batting"
    if (mode !== nextMode) onModeChange(nextMode)
  }, [activePlayer.id, activeView])

  /* ---------------- DATA ---------------- */

  const currentEntry =
    entriesByPlayer[activePlayer.id] ?? createInitialEntry()

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

  /* ---------------- CRUD ---------------- */

  const {
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
  } = useMainDashboardCRUD({
    activePlayer,
    currentEntry,
    currentSeasonYear,
    gameMeta,
    setGameMeta,
    setEntriesByPlayer,
    setSavedEntriesByPlayer,
    setPitchingEntriesByPlayer,
    setSavedGames,
  })

  /* ---------------- STATS ---------------- */

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

  const handleRecordSelectPlayer = (player: Player) => {
    if (player.id === activePlayer.id) return
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
      [player.id]: prev[player.id] ?? createInitialEntry(),
    }))
    setPitchingEntry({ inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0, walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0, note: "" })
    setRecordMode("batting")
    onSelectPlayer(player)
  }

  const handleEntryChange = (next: BattingEntryData) => {
    if (saveSuccess) setSaveSuccess("")
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: next,
    }))
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
