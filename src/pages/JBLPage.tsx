import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import PlayersTab from "../components/jbl/PlayersTab"
import StandingsTab from "../components/jbl/StandingsTab"
import TodayGamesTab from "../components/jbl/TodayGamesTab"
import { jblThemeStyle } from "../components/jbl/teamTheme"
import { getJblData, type JblTeam } from "../api/jbl"

type JblView = "team" | "today" | "standings" | "players"

export default function JBLPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view")
  const initialView: JblView =
    requestedView === "today" || requestedView === "standings" || requestedView === "players"
      ? requestedView
      : "team"
  const initialTeamName = searchParams.get("team") ?? ""
  const [activeView, setActiveView] = useState<JblView>(initialView)
  const [jblTeams, setJblTeams] = useState<JblTeam[]>([])
  const [selectedTeamName, setSelectedTeamName] = useState(initialTeamName)

  useEffect(() => {
    getJblData()
      .then((data) => setJblTeams([...data.teams].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (activeView === "team" && selectedTeamName) {
      const team = jblTeams.find((candidate) => candidate.name === selectedTeamName)
      if (team) navigate(`/jbl/teams/${team.id}`, { replace: true })
    }
  }, [activeView, selectedTeamName, jblTeams, navigate])

  const handleChangeTeam = (name: string) => {
    setSelectedTeamName(name)
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (name) next.set("team", name)
      else next.delete("team")
      next.set("view", activeView)
      return next
    })
  }

  const handleChangeView = (view: string) => {
    const nextView = view as JblView
    if (nextView === "team") {
      const team = jblTeams.find((candidate) => candidate.name === selectedTeamName)
      if (team) {
        navigate(`/jbl/teams/${team.id}`)
        return
      }
      setActiveView("team")
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
      style={jblThemeStyle(selectedTeamName)}
      headerProps={{
        teamName: selectedTeamName,
        teams: jblTeams.map((team) => team.name),
        onChangeTeam: handleChangeTeam,
        placeholder: "Select a JBL team...",
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
      {activeView === "today" && <TodayGamesTab selectedTeamName={selectedTeamName || undefined} />}
      {activeView === "standings" && (
        <StandingsTab
          selectedTeamId={jblTeams.find((team) => team.name === selectedTeamName)?.id}
        />
      )}
      {activeView === "players" && <PlayersTab selectedTeamName={selectedTeamName || undefined} />}
    </PageShell>
  )
}
