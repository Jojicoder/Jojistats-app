import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import RosterPage from "./RosterPage"
import { useEffect, useMemo, useState } from "react"
import type { Player, Team } from "../types"

type LayoutProps = {
  teams: Team[]
  setTeams: React.Dispatch<React.SetStateAction<Team[]>>
  players: Player[]
  setPlayers: React.Dispatch<React.SetStateAction<Player[]>>
  activeTeamId: string
  setActiveTeamId: React.Dispatch<React.SetStateAction<string>>
  activePlayerId: string
  setActivePlayerId: React.Dispatch<React.SetStateAction<string>>
}

const createTeamId = () => {
  return `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

export default function Layout({
  teams,
  setTeams,
  players,
  setPlayers,
  activeTeamId,
  setActiveTeamId,
  activePlayerId,
  setActivePlayerId,
}: LayoutProps) {
  const [activeView, setActiveView] = useState<
    "stats" | "record" | "roster" | "team"
  >("stats")

  const visibleTeams = useMemo(
    () => teams.filter((team) => !team.isArchived),
    [teams]
  )

  const activeTeam =
    visibleTeams.find((team) => team.id === activeTeamId) ?? visibleTeams[0] ?? null

  const teamPlayers = useMemo(
    () => players.filter((player) => player.teamId === activeTeam?.id),
    [players, activeTeam?.id]
  )

  const activePlayer =
    teamPlayers.find((player) => player.id === activePlayerId) ??
    teamPlayers[0] ??
    null

  useEffect(() => {
    if (activeTeam && activeTeam.id !== activeTeamId) {
      setActiveTeamId(activeTeam.id)
    }
  }, [activeTeam, activeTeamId, setActiveTeamId])

  useEffect(() => {
    if (activePlayer && activePlayer.id !== activePlayerId) {
      setActivePlayerId(activePlayer.id)
    }
  }, [activePlayer, activePlayerId, setActivePlayerId])

  const handleAddTeam = (name: string) => {
    const teamId = createTeamId()

    setTeams((prev) => [
      ...prev,
      {
        id: teamId,
        name,
        isArchived: false,
      },
    ])

    setActiveTeamId(teamId)
  }

  const handleUpdateTeamName = (teamId: string, name: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, name } : team
      )
    )
  }

  const handleArchiveTeam = (teamId: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, isArchived: true } : team
      )
    )
  }

  const handleAddPlayer = (player: Player) => {
    setPlayers((prev) => [...prev, player])
    setActivePlayerId(player.id)
  }

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === updatedPlayer.id ? updatedPlayer : player
      )
    )
  }

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId))

    if (playerId === activePlayerId) {
      const remainingPlayers = teamPlayers.filter((player) => player.id !== playerId)
      setActivePlayerId(remainingPlayers[0]?.id ?? "")
    }
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50">
      <Header teamName={activeTeam?.name ?? "No Team"} />

      <TopTabs
        activeView={activeView}
        onChangeView={setActiveView}
      />

      <div className="flex flex-1 items-start gap-6 px-5 py-5">
        {activeView === "team" ? (
          <TeamSetupPage
            teams={visibleTeams}
            activeTeamId={activeTeam?.id ?? null}
            setActiveTeamId={setActiveTeamId}
            onAddTeam={handleAddTeam}
            onUpdateTeamName={handleUpdateTeamName}
            onArchiveTeam={handleArchiveTeam}
          />
        ) : activeView === "roster" ? (
          <RosterPage
            teamName={activeTeam?.name ?? "No Team"}
            seasonYear={new Date().getFullYear()}
            players={teamPlayers}
            activePlayerId={activePlayer?.id ?? null}
            setActivePlayerId={setActivePlayerId}
            activeTeamId={activeTeam?.id ?? ""}
            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
          />
        ) : activePlayer ? (
          <>
            <Sidebar
              players={teamPlayers}
              activePlayerId={activePlayer.id}
              setActivePlayerId={setActivePlayerId}
            />

            <div className="flex-1 min-w-0">
              <MainDashboard
                activePlayer={activePlayer}
                activeView={activeView}
                teamName={activeTeam?.name ?? "No Team"}
                seasonYear={new Date().getFullYear()}
              />
            </div>
          </>
        ) : (
          <main className="w-full">
            <div className="max-w-6xl rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-green-900">
                No active player
              </p>
              <h1 className="mt-2 text-2xl font-bold">
                Add a player in Roster first
              </h1>
              <p className="mt-2 text-gray-600">
                You need at least one player in the selected team before using
                Record Game or My Stats.
              </p>
            </div>
          </main>
        )}
      </div>
    </div>
  )
}