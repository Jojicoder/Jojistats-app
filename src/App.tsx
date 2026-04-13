import { useState } from "react"
import Layout from "./components/Layout"
import type { Player, Team } from "./types"
import { demoTeams, demoPlayers } from "./demoData"

export default function App() {
  const [teams, setTeams] = useState<Team[]>(demoTeams)
  const [players, setPlayers] = useState<Player[]>(demoPlayers)

  const [activeTeamId, setActiveTeamId] = useState("team-1")
  const [activePlayerId, setActivePlayerId] = useState("player-1")

  return (
    <Layout
      teams={teams}
      setTeams={setTeams}
      players={players}
      setPlayers={setPlayers}
      activeTeamId={activeTeamId}
      setActiveTeamId={setActiveTeamId}
      activePlayerId={activePlayerId}
      setActivePlayerId={setActivePlayerId}
    />
  )
}