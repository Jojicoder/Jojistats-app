import { useState } from "react"
import Layout from "./components/Layout"
import type { Player, Team } from "./types"

const initialTeams: Team[] = [
  {
    id: "team-1",
    name: "My Team",
    isArchived: false,
  },
]

const initialPlayers: Player[] = [
  {
    id: "player-1",
    teamId: "team-1",
    name: "Joji",
    position: "2B",
    jerseyNumber: 7,
    isActive: true,
  },
]

export default function App() {
  const [teams, setTeams] = useState<Team[]>(initialTeams)
  const [players, setPlayers] = useState<Player[]>(initialPlayers)

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