import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import RosterPage from "./RosterPage"
import { useEffect, useState } from "react"
import type { Player, SetActiveIndex } from "../types"

type LayoutProps = {
  players: Player[]
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
  activeIndex: number
  setActiveIndex: SetActiveIndex
}

export default function Layout({
  players,
  setPlayers,
  activeIndex,
  setActiveIndex,
}: LayoutProps) {
  const activePlayer = players[activeIndex]

  const [activeView, setActiveView] = useState<
    "stats" | "record" | "roster" | "team"
  >("stats")

  const [teamName, setTeamName] = useState("My Team")
  const [seasonYear, setSeasonYear] = useState(2026)

  useEffect(() => {
    if (activeIndex > players.length - 1) {
      setActiveIndex(Math.max(0, players.length - 1))
    }
  }, [players.length, activeIndex, setActiveIndex])

  const handleAddPlayer = (player: Player) => {
    setPlayers((prev) => [...prev, player])
    setActiveIndex(players.length)
  }

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <TopTabs
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex flex-1 gap-4 p-4 bg-gray-50">
        {activeView === "team" ? (
          <TeamSetupPage
            teamName={teamName}
            seasonYear={seasonYear}
            onChangeTeamName={setTeamName}
            onChangeSeasonYear={setSeasonYear}
          />
        ) : activeView === "roster" ? (
          <RosterPage
            players={players}
            activeIndex={activeIndex}
            setActiveIndex={setActiveIndex}
            onAddPlayer={handleAddPlayer}
          />
        ) : (
          <>
            <Sidebar
              players={players}
              activeIndex={activeIndex}
              setActiveIndex={setActiveIndex}
            />

            {activePlayer && (
              <MainDashboard
                activePlayer={activePlayer}
                activeView={activeView}
              />
            )}
          </>
        )}
      </div>
    </div>
  )
}