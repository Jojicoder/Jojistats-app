import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  SavedBattingGameEntry,
  DisplayStat,
} from "../types"
import { useGameStats } from "../hooks/useGameStats"
import {
  createFullGame,
  updateFullGame,
  deleteGame,
} from "../api/api"
import { fetchSavedEntriesByPlayer } from "../api/supabase-api"
import RecordGamePage from "./RecordGamePage"
import MyStatsPage from "./MyStatsPage"

type MainDashboardProps = {
  activePlayer: Player
  activeView: "stats" | "record"
  teamName: string
  gameMeta: DraftGameMeta
  setGameMeta: Dispatch<SetStateAction<DraftGameMeta>>
  entriesByPlayer: Record<string, BattingEntryData>
  setEntriesByPlayer: Dispatch<SetStateAction<Record<string, BattingEntryData>>>
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  setSavedEntriesByPlayer: Dispatch<
    SetStateAction<Record<string, SavedBattingGameEntry[]>>
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

const getTodayDate = (): string =>
  new Date().toISOString().split("T")[0]

export default function MainDashboard({
  activePlayer,
  activeView,
  teamName,
  gameMeta,
  setGameMeta,
  entriesByPlayer,
  setEntriesByPlayer,
  savedEntriesByPlayer,
  setSavedEntriesByPlayer,
}: MainDashboardProps) {
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(
    null
  )

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
    { label: "BB/K", value: kpi.bbPerK },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
  ]

  const handleEntryChange = (next: BattingEntryData) => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: next,
    }))
  }

  const buildPayload = (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => {
    return {
      game: {
        team_id: Number(activePlayer.teamId),
        game_date: nextGameMeta.date,
        opponent_name: nextGameMeta.opponent,
        season_year: nextGameMeta.seasonYear,
        match_number: nextGameMeta.matchNumber,
        location: null,
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
        hbp: 0,
        sf: 0,
      })),
      pitchingStats: [],
    }
  }

  const refreshSavedEntries = async () => {
    const updated = await fetchSavedEntriesByPlayer(
      Number(activePlayer.teamId)
    )
    setSavedEntriesByPlayer(updated)
  }

  const resetAfterSave = () => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
    }))

    setGameMeta((prev) => ({
      ...prev,
      opponent: "",
      matchNumber: prev.matchNumber + 1,
      date: getTodayDate(),
    }))

    setEditingSavedEntryId(null)
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
      resetAfterSave()
    } catch (error) {
      console.error("Failed to save game", error)
      window.alert("Failed to save game")
    }
  }

  const handleStartEditSavedEntry = (entry: SavedBattingGameEntry) => {
    setGameMeta(entry.gameMeta)

    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: {
        AB: entry.statLine.AB,
        H: entry.statLine.H,
        doubles: entry.statLine.doubles,
        triples: entry.statLine.triples,
        HR: entry.statLine.HR,
        RBI: entry.statLine.RBI,
        BB: entry.statLine.BB,
        SO: entry.statLine.SO,
        note: entry.statLine.note ?? "",
      },
    }))

    setEditingSavedEntryId(entry.id)
  }

  const handleUpdateSavedEntry = async (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => {
    if (!editingSavedEntryId) return

    try {
      const payload = {
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: nextGameMeta.date,
          opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear,
          match_number: nextGameMeta.matchNumber,
          location: null,
        },
        battingStats: [
          {
            player_id: Number(activePlayer.id),
            batting_order: 1,
            ab: nextStatLine.AB,
            h: nextStatLine.H,
            double_hits: nextStatLine.doubles,
            triple_hits: nextStatLine.triples,
            hr: nextStatLine.HR,
            rbi: nextStatLine.RBI,
            bb: nextStatLine.BB,
            so: nextStatLine.SO,
            hbp: 0,
            sf: 0,
          },
        ],
        pitchingStats: [],
      }

      const gameId = Number(editingSavedEntryId.replace("db-", ""))
      await updateFullGame(gameId, payload)

      await refreshSavedEntries()

      setEntriesByPlayer((prev) => ({
        ...prev,
        [activePlayer.id]: createInitialEntry(),
      }))

      setEditingSavedEntryId(null)
    } catch (error) {
      console.error(error)
      window.alert("Update failed")
    }
  }

  const handleCancelEditSavedEntry = () => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
    }))
    setEditingSavedEntryId(null)
  }

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    const ok = window.confirm(
      `Delete?\n${entry.gameMeta.date} vs ${entry.gameMeta.opponent}`
    )
    if (!ok) return

    try {
      const gameId = Number(entry.id.replace("db-", ""))
      await deleteGame(gameId)
      await refreshSavedEntries()

      if (editingSavedEntryId === entry.id) {
        setEntriesByPlayer((prev) => ({
          ...prev,
          [activePlayer.id]: createInitialEntry(),
        }))
        setEditingSavedEntryId(null)
      }
    } catch (error) {
      console.error(error)
      window.alert("Delete failed")
    }
  }

  const editingSavedEntry = savedEntries.find(
    (entry) => entry.id === editingSavedEntryId
  )

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
      editingGamePositions={editingSavedEntry?.gamePositions}
      onStartEditSavedEntry={handleStartEditSavedEntry}
      onUpdateSavedEntry={handleUpdateSavedEntry}
      onCancelEditSavedEntry={handleCancelEditSavedEntry}
      onDeleteSavedEntry={handleDeleteSavedEntry}
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