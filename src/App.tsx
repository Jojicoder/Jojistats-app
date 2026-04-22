import { useState } from "react"
import Layout from "./components/Layout"
import type { Player, Team } from "./types"

export default function App() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTeamId, setActiveTeamId] = useState("")
  const [activePlayerId, setActivePlayerId] = useState("")

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
