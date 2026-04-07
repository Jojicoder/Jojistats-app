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
  HR: 0,
  RBI: 0,
  BB: 0,
  SO: 0,
})

const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0]
}

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

  const allPlayerEntries = savedEntriesByPlayer[activePlayer.id] ?? []

  const savedEntries = allPlayerEntries.filter(
    (entry) => entry.teamId === activePlayer.teamId
  )

  const savedStatLines = savedEntries.map((entry) => entry.statLine)

  const { kpi, avgTrend } = useGameStats(savedStatLines)

  const calculatedStats: DisplayStat[] = [
    { label: "AVG", value: kpi.avg },
    { label: "OBP", value: kpi.obp },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
  ]

  const handleEntryChange = (nextEntry: BattingEntryData) => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: nextEntry,
    }))
  }

  const handleSaveGame = (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => {
    setSavedEntriesByPlayer((prev) => {
      const nextSaved = { ...prev }

      entries.forEach((entry) => {
        const savedEntry: SavedBattingGameEntry = {
          id: crypto.randomUUID(),
          teamId: activePlayer.teamId,
          gameMeta: nextGameMeta,
          statLine: {
            AB: entry.AB,
            H: entry.H,
            HR: entry.HR,
            RBI: entry.RBI,
            BB: entry.BB,
            SO: entry.SO,
          },
        }

        const currentSaved = nextSaved[entry.playerId] ?? []
        nextSaved[entry.playerId] = [...currentSaved, savedEntry]
      })

      return nextSaved
    })

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
  }

  const handleStartEditSavedEntry = (savedEntry: SavedBattingGameEntry) => {
    setGameMeta(savedEntry.gameMeta)

    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: {
        AB: savedEntry.statLine.AB,
        H: savedEntry.statLine.H,
        HR: savedEntry.statLine.HR,
        RBI: savedEntry.statLine.RBI,
        BB: savedEntry.statLine.BB,
        SO: savedEntry.statLine.SO,
      },
    }))

    setEditingSavedEntryId(savedEntry.id)
  }

  const handleUpdateSavedEntry = (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => {
    if (!editingSavedEntryId) return

    setSavedEntriesByPlayer((prev) => {
      const nextSaved = { ...prev }
      const currentSaved = nextSaved[activePlayer.id] ?? []

      nextSaved[activePlayer.id] = currentSaved.map((entry) =>
        entry.id === editingSavedEntryId
          ? {
              ...entry,
              gameMeta: nextGameMeta,
              statLine: nextStatLine,
            }
          : entry
      )

      return nextSaved
    })

    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
    }))

    setEditingSavedEntryId(null)
  }

  const handleCancelEditSavedEntry = () => {
    setEntriesByPlayer((prev) => ({
      ...prev,
      [activePlayer.id]: createInitialEntry(),
    }))

    setEditingSavedEntryId(null)
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
    />
  ) : (
    <MyStatsPage
      activePlayer={activePlayer}
      calculatedStats={calculatedStats}
      avgTrend={avgTrend}
      savedEntries={savedEntries}
      gamesPlayed={kpi.gamesPlayed}
    />
  )
}