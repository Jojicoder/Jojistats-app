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
  updateBattingStatEntry,
  updateFullGame,
  deleteGame,
  deleteBattingStatEntry,
  updateGameInfo,
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
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
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
  HBP: 0,
  SO: 0,
  note: "",
})

export default function MainDashboard({
  activePlayer,
  allPlayers,
  onSelectPlayer,
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
    hitBatters: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
  })

  /* ---------------- EDIT ---------------- */
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)

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
      location: nextGameMeta.location?.trim() || null,
      ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
      team_score: nextGameMeta.teamScore ?? null,
      opponent_score: nextGameMeta.opponentScore ?? null,
      result: nextGameMeta.result || null,
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
      hbp: entry.HBP,
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
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }

      await refreshSavedEntries()
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
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
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: gameMeta.date,
          opponent_name: gameMeta.opponent,
          season_year: gameMeta.seasonYear,
          match_number: gameMeta.matchNumber,
          location: gameMeta.location?.trim() || null,
          ...(gameMeta.memo !== undefined ? { memo: gameMeta.memo.trim() || null } : {}),
          team_score: gameMeta.teamScore ?? null,
          opponent_score: gameMeta.opponentScore ?? null,
          result: gameMeta.result || null,
        },
        battingStats: [],
        pitchingStats: [
          {
            player_id: Number(pitcherId),
            innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
            hits_allowed: nextPitchingEntry.hitsAllowed,
            runs_allowed: nextPitchingEntry.runsAllowed,
            earned_runs: nextPitchingEntry.earnedRuns,
            walks: nextPitchingEntry.walks,
            hbp: nextPitchingEntry.hitBatters,
            strikeouts: nextPitchingEntry.strikeouts,
            home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
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
        hitBatters: 0,
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
    setEditingSavedEntry(entry)

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
    if (!editingSavedEntry) return

    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: nextGameMeta.date,
          opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear,
          match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null,
          opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        battingStat: {
          player_id: Number(editingSavedEntry.playerId),
          batting_order: 1,
          ab: nextStatLine.AB,
          h: nextStatLine.H,
          double_hits: nextStatLine.doubles,
          triple_hits: nextStatLine.triples,
          hr: nextStatLine.HR,
          rbi: nextStatLine.RBI,
          bb: nextStatLine.BB,
          hbp: nextStatLine.HBP,
          so: nextStatLine.SO,
        },
      })

      await refreshSavedEntries()
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
    } catch {
      window.alert("Update failed")
    }
  }

  const handleUpdateSavedGameMeta = async (nextGameMeta: DraftGameMeta) => {
    if (!editingSavedEntry) return

    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        team_id: Number(activePlayer.teamId),
        game_date: nextGameMeta.date,
        opponent_name: nextGameMeta.opponent,
        season_year: nextGameMeta.seasonYear,
        match_number: nextGameMeta.matchNumber,
        location: nextGameMeta.location?.trim() || null,
        ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
        team_score: nextGameMeta.teamScore ?? null,
        opponent_score: nextGameMeta.opponentScore ?? null,
        result: nextGameMeta.result || null,
      })

      await refreshSavedEntries()
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
    } catch (error) {
      console.error(error)
      window.alert("Update failed")
    }
  }

  const handleUpdateSavedGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => {
    if (!editingSavedEntry) return

    try {
      await updateFullGame(editingSavedEntry.gameId, buildPayload(nextGameMeta, entries))
      await refreshSavedEntries()
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
    } catch (error) {
      console.error(error)
      window.alert("Update failed")
    }
  }

  const handleCancelEditSavedEntry = () => {
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
  }

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    if (!window.confirm("Delete?")) return

    try {
      await deleteBattingStatEntry(entry.statId, entry.gameId)
      await refreshSavedEntries()
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
      />
    )
  }

  return activeView === "record" ? (
    <RecordGamePage
      activePlayer={activePlayer}
      allPlayers={allPlayers}
      onSelectPlayer={onSelectPlayer}
      showRosterPanel={false}
      currentEntry={currentEntry}
      gameMeta={gameMeta}
      savedEntries={savedEntries}
      teamSavedEntries={teamSavedEntries}
      onGameMetaChange={setGameMeta}
      onEntryChange={handleEntryChange}
      onSaveGame={handleSaveGame}
      teamName={teamName}
      seasonYear={gameMeta.seasonYear}
      isEditingSavedEntry={editingSavedEntryId !== null}
      editingSavedEntryId={editingSavedEntryId}
      onStartEditSavedEntry={handleStartEditSavedEntry}
      onUpdateSavedEntry={handleUpdateSavedEntry}
      onUpdateSavedGame={handleUpdateSavedGame}
      onUpdateSavedGameMeta={handleUpdateSavedGameMeta}
      onCancelEditSavedEntry={handleCancelEditSavedEntry}
      onDeleteSavedEntry={handleDeleteSavedEntry}
      onDeleteSavedGame={handleDeleteSavedGame}
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
