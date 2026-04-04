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
  teamName: string
  seasonYear: number
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
  teamName,
  seasonYear,
}: MainDashboardProps) {
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: getTodayDate(),
    opponent: "",
    seasonYear,
    matchNumber: 1,
  })

  // Draft entry is still keyed by player id.
  const [entriesByPlayer, setEntriesByPlayer] = useState<
    Record<string, BattingEntryData>
  >({})

  // Saved history is still grouped by player id,
  // but each saved record now also stores teamId.
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})

  const currentEntry =
    entriesByPlayer[activePlayer.id] ?? createInitialEntry()

  // Pull this player's saved entries first.
  const allPlayerEntries = savedEntriesByPlayer[activePlayer.id] ?? []

  // Then filter them to only the currently selected team.
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

  const handleSaveEntry = () => {
    const savedEntry: SavedBattingGameEntry = {
      teamId: activePlayer.teamId,
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
      teamName={teamName}
      seasonYear={gameMeta.seasonYear}
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
