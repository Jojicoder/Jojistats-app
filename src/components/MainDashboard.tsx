import StatCard from "./StatCard"
import type {Player} from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import AvgTrendCard from "./AvgTrendCard"


type MainDashboardProps = {
  activePlayer: Player
}


export default function MainDashboard({ activePlayer }: MainDashboardProps) {
  return (
    <main className="flex-1 p-6 bg-gray-50">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <h1 className="text-2xl font-bold">{activePlayer.name}</h1>
        <p className="text-gray-600 mt-2">
          Position: {activePlayer.position}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-4 mt-6">
        {activePlayer.stats.map((stat) => (
          <StatCard key={stat.label} stat={stat}/>
      
        ))}
      </div>

      <ScoreEntryPanel/>
      <AvgTrendCard avgTrend={activePlayer.avgTrend}/>
    </main>
  )
}