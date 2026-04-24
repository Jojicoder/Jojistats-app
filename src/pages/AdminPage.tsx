import Layout from "../components/Layout"
import type { Dispatch, SetStateAction } from "react"
import type { Player, Team } from "../types"

type AdminPageProps = {
  teams: Team[]
  setTeams: Dispatch<SetStateAction<Team[]>>
  players: Player[]
  setPlayers: Dispatch<SetStateAction<Player[]>>
  activeTeamId: string
  setActiveTeamId: Dispatch<SetStateAction<string>>
  activePlayerId: string
  setActivePlayerId: Dispatch<SetStateAction<string>>
}

export default function AdminPage({
  teams,
  setTeams,
  players,
  setPlayers,
  activeTeamId,
  setActiveTeamId,
  activePlayerId,
  setActivePlayerId,
}: AdminPageProps) {
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