import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import Header from "../components/Header"
import PlayersTab from "../components/mlb/PlayersTab"
import StandingsTab from "../components/mlb/StandingsTab"
import TodayGamesTab from "../components/mlb/TodayGamesTab"
import { getAllTeams } from "../components/mlb/api"
import type { MLBTeam } from "../components/mlb/types"
import { getTeamThemeStyle } from "../components/mlb/teamTheme"
import TopTabs from "../components/TopTabs"

type MLBView = "today" | "standings" | "players"

export default function MLBPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view")
  const initialView: MLBView =
    requestedView === "today" || requestedView === "standings" ? requestedView : "players"
  const initialTeamId = Number(searchParams.get("teamId"))
  const initialPlayerId = Number(searchParams.get("playerId"))
  const [activeView, setActiveView] = useState<MLBView>(initialView)
  const [mlbTeams, setMlbTeams] = useState<MLBTeam[]>([])
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(
    Number.isInteger(initialTeamId) && initialTeamId > 0 ? initialTeamId : null
  )

  useEffect(() => {
    getAllTeams()
      .then((data) => setMlbTeams([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
  }, [])

  const selectedTeam = mlbTeams.find((team) => team.id === selectedTeamId)

  const handleChangeTeam = (name: string) => {
    const team = mlbTeams.find((candidate) => candidate.name === name)
    setSelectedTeamId(team?.id ?? null)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (team) next.set("teamId", String(team.id))
      else next.delete("teamId")
      next.set("view", activeView)
      return next
    })
  }

  const handleChangeView = (view: string) => {
    if (view === "team") {
      if (selectedTeamId) navigate(`/mlb/teams/${selectedTeamId}`)
      return
    }

    const nextView = view as MLBView
    setActiveView(nextView)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("view", nextView)
      return next
    })
  }

  return (
    <div
      className="mlb-themed flex min-h-dvh flex-col bg-gray-50"
      style={getTeamThemeStyle(selectedTeamId)}
    >
      <Header
        teamName={selectedTeam?.name ?? ""}
        teams={mlbTeams.map((team) => team.name)}
        onChangeTeam={handleChangeTeam}
        placeholder="Select a team..."
      />

      <TopTabs
        activeView={activeView}
        onChangeView={handleChangeView}
        tabs={[
          { label: "Players", view: "players" },
          { label: "Team Overview", view: "team" },
          { label: "Today's Games", view: "today" },
          { label: "Standings", view: "standings" },
          { label: "Back to Your Stats", href: "/stats" },
        ]}
      />

      <div className="mx-auto w-full max-w-screen-2xl flex-1 p-3 lg:p-4">
        {activeView === "today" && <TodayGamesTab selectedTeamId={selectedTeamId} />}
        {activeView === "standings" && <StandingsTab selectedTeamId={selectedTeamId} />}
        {activeView === "players" && (
          <PlayersTab
            teams={mlbTeams}
            selectedTeamId={selectedTeamId}
            initialPlayerId={
              Number.isInteger(initialPlayerId) && initialPlayerId > 0
                ? initialPlayerId
                : null
            }
          />
        )}
      </div>
    </div>
  )
}
