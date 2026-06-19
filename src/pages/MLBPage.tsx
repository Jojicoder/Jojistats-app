import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import PlayersTab from "../components/mlb/PlayersTab"
import StandingsTab from "../components/mlb/StandingsTab"
import TodayGamesTab from "../components/mlb/TodayGamesTab"
import { getAllTeams } from "../api/mlb"
import type { MLBTeam } from "../components/mlb/types"
import { applyGlobalMLBTheme, clearGlobalMLBTheme, getTeamThemeStyle } from "../components/mlb/teamTheme"

type MLBView = "team" | "today" | "standings" | "players"

export default function MLBPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view")
  const initialView: MLBView =
    requestedView === "today" || requestedView === "standings" || requestedView === "players"
      ? requestedView
      : "team"
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

  useEffect(() => {
    if (activeView === "team" && selectedTeamId) {
      navigate(`/mlb/teams/${selectedTeamId}`, { replace: true })
    }
  }, [activeView, selectedTeamId, navigate])

  useEffect(() => {
    applyGlobalMLBTheme(selectedTeamId)
    return () => clearGlobalMLBTheme()
  }, [selectedTeamId])

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
    const nextView = view as MLBView
    if (nextView === "team") {
      if (selectedTeamId) {
        navigate(`/mlb/teams/${selectedTeamId}`)
      } else {
        setActiveView("team")
      }
      return
    }

    setActiveView(nextView)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("view", nextView)
      return next
    })
  }

  return (
    <PageShell
      variant="mlb"
      style={getTeamThemeStyle(selectedTeamId)}
      headerProps={{
        teamName: selectedTeam?.name ?? "",
        teams: mlbTeams.map((team) => team.name),
        onChangeTeam: handleChangeTeam,
        placeholder: "Select a team...",
      }}
      activeView={activeView}
      onChangeView={handleChangeView}
      tabs={[
          { label: "Team Overview", view: "team" },
          { label: "Players", view: "players" },
          { label: "Today's Games", view: "today" },
          { label: "Standings", view: "standings" },
          { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
        {activeView === "team" && (
          <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
            <p className="text-sm text-gray-500">Select a team from the header to view Team Overview.</p>
          </div>
        )}
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
    </PageShell>
  )
}
