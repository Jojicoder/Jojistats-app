import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  DisplayStat,
} from "../types"
import { useState } from "react"
import { useGameStats } from "../hooks/useGameStats"
import RecordGamePage from "./RecordGamePage"
import MyStatsPage from "./MyStatsPage"

type MainDashboardProps = {
  activePlayer: Player
  activeView: "stats" | "record"
}

const createInitialEntry = (): BattingEntryData => ({
  AB: 4,
  H: 2,
  HR: 1,
  RBI: 3,
  BB: 0,
  SO: 1,
})

const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0]
}

export default function MainDashboard({
  activePlayer,
  activeView,
}: MainDashboardProps) {
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: getTodayDate(),
    opponent: "",
    seasonYear: 2026,
    matchNumber: 1,
  })

  const [entriesByPlayer, setEntriesByPlayer] = useState<
    Record<string, BattingEntryData>
  >({})

  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})

  const currentEntry =
    entriesByPlayer[activePlayer.id] ?? createInitialEntry()

  const savedEntries = savedEntriesByPlayer[activePlayer.id] ?? []

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

  const handleSaveEntry = () => {
    const savedEntry: SavedBattingGameEntry = {
      gameMeta,
      statLine: currentEntry,
    }

    setSavedEntriesByPlayer((prev) => {
      const currentSaved = prev[activePlayer.id] ?? []

      return {
        ...prev,
        [activePlayer.id]: [...currentSaved, savedEntry],
      }
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

  return activeView === "record" ? (
    <RecordGamePage
      activePlayer={activePlayer}
      currentEntry={currentEntry}
      gameMeta={gameMeta}
      savedEntries={savedEntries}
      onGameMetaChange={setGameMeta}
      onEntryChange={handleEntryChange}
      onSave={handleSaveEntry}
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