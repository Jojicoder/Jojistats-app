import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import type{ Player,SetActiveIndex} from "../types"


type LayoutProps={
  players: Player[]
  activeIndex: number
  setActiveIndex: SetActiveIndex
}

export default function Layout({
  players,
  activeIndex,
  setActiveIndex,
}: LayoutProps){
  const activePlayer = players[activeIndex]

  if (!activePlayer) return null

  return (
    <div className="h-screen flex flex-col">
      <Header />
      <TopTabs />

      <div className="flex flex-1">
        <Sidebar
          players={players}
          activeIndex={activeIndex}
          setActiveIndex={setActiveIndex}
        />
      <MainDashboard activePlayer={activePlayer}/>
    </div>
    </div>
  )
}