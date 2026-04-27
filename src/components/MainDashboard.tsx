import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  DisplayStat,
  PitchingEntryData,
} from "../types"
import { useGameStats } from "../hooks/useGameStats"
import {
  createFullGame,
  updateFullGame,
  deleteGame,
} from "../api/api"
import {
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import RecordGamePage from "./RecordGamePage"
import MyStatsPage from "./MyStatsPage"
import MyPitchingStatsPage from "./MyPitchingStatsPage"

type MainDashboardProps = {
  activePlayer: Player
  activeView: "stats" | "record"
  teamName: string
  gameMeta: DraftGameMeta
  setGameMeta: Dispatch<SetStateAction<DraftGameMeta>>
  entriesByPlayer: Record<string, BattingEntryData>
  setEntriesByPlayer: Dispatch<SetStateAction<Record<string, BattingEntryData>>>
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
  mode: "batting" | "pitching"
  setSavedEntriesByPlayer: Dispatch<
    SetStateAction<Record<string, SavedBattingGameEntry[]>>
  >
  setPitchingEntriesByPlayer: Dispatch<
    SetStateAction<Record<string, SavedPitchingGameEntry[]>>
  >
}

const createInitialEntry = (): BattingEntryData => ({
  AB: 0,
  H: 0,
  doubles: 0,
  triples: 0,
  HR: 0,
  RBI: 0,
  BB: 0,
  SO: 0,
  note: "",
})

export default function MainDashboard({
  activePlayer,
  activeView,
  teamName,
  gameMeta,
  setGameMeta,
  entriesByPlayer,
  setEntriesByPlayer,
  savedEntriesByPlayer,
  pitchingEntriesByPlayer,
  mode,
  setSavedEntriesByPlayer,
  setPitchingEntriesByPlayer,
}: MainDashboardProps) {

  /* ---------------- TAB ---------------- */
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")

  /* ---------------- PITCHING ---------------- */
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>({
    inningsPitchedOuts: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
  })

  /* ---------------- EDIT ---------------- */
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)

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

  const teamSavedEntries = Object.values(savedEntriesByPlayer)
    .flat()
    .filter(
      (entry) =>
        entry.teamId === activePlayer.teamId &&
        entry.gameMeta.seasonYear === currentSeasonYear
    )

  const savedStatLines = savedEntries.map((entry) => entry.statLine)
  const { kpi } = useGameStats(savedStatLines)

  const calculatedStats: DisplayStat[] = [
    { label: "AVG", value: kpi.avg },
    { label: "OBP", value: kpi.obp },
    { label: "OPS", value: kpi.ops },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
  ]

  /* ---------------- HANDLERS ---------------- */

  const handleEntryChange = (next: BattingEntryData) => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: next,
    }))
  }

  const buildPayload = (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => ({
    game: {
      team_id: Number(activePlayer.teamId),
      game_date: nextGameMeta.date,
      opponent_name: nextGameMeta.opponent,
      season_year: nextGameMeta.seasonYear,
      match_number: nextGameMeta.matchNumber,
    },
    battingStats: entries.map((entry, index) => ({
      player_id: Number(entry.playerId),
      batting_order: index + 1,
      ab: entry.AB,
      h: entry.H,
      double_hits: entry.doubles,
      triple_hits: entry.triples,
      hr: entry.HR,
      rbi: entry.RBI,
      bb: entry.BB,
      so: entry.SO,
    })),
    pitchingStats: [],
  })

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

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => {
    try {
      const payload = buildPayload(nextGameMeta, entries)

      if (editingSavedEntryId) {
        const gameId = Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }

      await refreshSavedEntries()
      setEditingSavedEntryId(null)
    } catch (error) {
      console.error(error)
      window.alert("Save failed")
    }
  }

  const handleSavePitchingGame = async () => {
    if (!gameMeta.date.trim() || !gameMeta.opponent.trim()) {
      window.alert("Please enter Game Date and Opponent first.")
      return
    }

    if (pitchingEntry.earnedRuns > pitchingEntry.runsAllowed) {
      window.alert("Earned runs cannot exceed runs allowed.")
      return
    }

    try {
      await createFullGame({
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: gameMeta.date,
          opponent_name: gameMeta.opponent,
          season_year: gameMeta.seasonYear,
          match_number: gameMeta.matchNumber,
        },
        battingStats: [],
        pitchingStats: [
          {
            player_id: Number(activePlayer.id),
            innings_pitched_outs: pitchingEntry.inningsPitchedOuts,
            hits_allowed: pitchingEntry.hitsAllowed,
            runs_allowed: pitchingEntry.runsAllowed,
            earned_runs: pitchingEntry.earnedRuns,
            walks: pitchingEntry.walks,
            strikeouts: pitchingEntry.strikeouts,
            home_runs_allowed: pitchingEntry.homeRunsAllowed,
          },
        ],
      })

      await refreshPitchingEntries()
      setPitchingEntry({
        inningsPitchedOuts: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 0,
        homeRunsAllowed: 0,
      })
      setGameMeta((prev) => ({
        ...prev,
        opponent: "",
        matchNumber: prev.matchNumber + 1,
        date: new Date().toISOString().split("T")[0],
      }))
    } catch (error) {
      console.error(error)
      window.alert("Pitching save failed")
    }
  }

  /* ---------------- EDIT ---------------- */

  const handleStartEditSavedEntry = (entry: SavedBattingGameEntry) => {
    setGameMeta(entry.gameMeta)

    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: entry.statLine,
    }))

    setEditingSavedEntryId(entry.id)
  }

  const handleUpdateSavedEntry = async (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => {
    if (!editingSavedEntryId) return

    try {
      const gameId = Number(editingSavedEntryId.replace("db-", ""))

      await updateFullGame(
        gameId,
        buildPayload(nextGameMeta, [
          {
            ...nextStatLine,
            playerId: activePlayer.id,
            playerName: activePlayer.name,
            gamePositions: [activePlayer.position],
          },
        ])
      )

      await refreshSavedEntries()
      setEditingSavedEntryId(null)
    } catch {
      window.alert("Update failed")
    }
  }

  const handleCancelEditSavedEntry = () => {
    setEditingSavedEntryId(null)
  }

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    if (!window.confirm("Delete?")) return

    const gameId = Number(entry.id.replace("db-", ""))
    await deleteGame(gameId)
    await refreshSavedEntries()
  }

  /* ---------------- VIEW ---------------- */

  if (activeView === "stats" && mode === "pitching") {
    return (
      <MyPitchingStatsPage
        activePlayer={activePlayer}
        entries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
      />
    )
  }

  return activeView === "record" ? (
    <RecordGamePage
      activePlayer={activePlayer}
      currentEntry={currentEntry}
      gameMeta={gameMeta}
      savedEntries={savedEntries}
      onGameMetaChange={setGameMeta}
      onEntryChange={handleEntryChange}
      onSaveGame={handleSaveGame}
      teamName={teamName}
      seasonYear={gameMeta.seasonYear}
      isEditingSavedEntry={editingSavedEntryId !== null}
      editingSavedEntryId={editingSavedEntryId}
      onStartEditSavedEntry={handleStartEditSavedEntry}
      onUpdateSavedEntry={handleUpdateSavedEntry}
      onCancelEditSavedEntry={handleCancelEditSavedEntry}
      onDeleteSavedEntry={handleDeleteSavedEntry}
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
    />
  ) : (
    <MyStatsPage
      activePlayer={activePlayer}
      calculatedStats={calculatedStats}
      savedEntries={savedEntries}
      teamSavedEntries={teamSavedEntries}
      gamesPlayed={kpi.gamesPlayed}
      seasonYear={gameMeta.seasonYear}
    />
  )
}
