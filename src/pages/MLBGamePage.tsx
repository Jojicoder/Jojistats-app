import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import MLBGameDetails from "../components/mlb/MLBGameDetails"
import { getAllTeams } from "../components/mlb/api"
import { applyGlobalMLBTheme, clearGlobalMLBTheme, getTeamThemeStyle } from "../components/mlb/teamTheme"
import type { MLBTeam } from "../components/mlb/types"

export default function MLBGamePage() {
  const { gamePk: gamePkParam } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const gamePk = Number(gamePkParam)
  const selectedTeamId = Number(searchParams.get("teamId"))
  const selectedDate = searchParams.get("date")
  const isLive = searchParams.get("live") === "1"
  const [teams, setTeams] = useState<MLBTeam[]>([])

  useEffect(() => {
    getAllTeams()
      .then((data) => setTeams([...data].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    applyGlobalMLBTheme(selectedTeamId)
    return () => clearGlobalMLBTheme()
  }, [selectedTeamId])

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  const teamQuery = Number.isInteger(selectedTeamId) && selectedTeamId > 0
    ? `teamId=${selectedTeamId}&`
    : ""
  const todayHref = `/mlb?${teamQuery}view=today`

  return (
    <PageShell
      variant="mlb"
      style={getTeamThemeStyle(selectedTeamId)}
      contentClassName="mx-auto w-full max-w-screen-2xl flex-1 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2"
      headerProps={{
        teamName: selectedTeam?.name ?? "",
        teams: teams.map((team) => team.name),
        onChangeTeam: (name) => {
          const team = teams.find((candidate) => candidate.name === name)
          if (team) navigate(`/mlb?teamId=${team.id}&view=today`)
        },
        placeholder: "Select a team...",
      }}
      activeView="today"
      onChangeView={() => {}}
      tabs={[
          { label: "Team Overview", href: selectedTeamId ? `/mlb/teams/${selectedTeamId}` : "/mlb?view=players" },
          { label: "Players", href: `/mlb?${teamQuery}view=players` },
          { label: "Today's Games", href: todayHref },
          { label: "Standings", href: `/mlb?${teamQuery}view=standings` },
          { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
        {Number.isInteger(gamePk) && gamePk > 0 ? (
          <MLBGameDetails
            gamePk={gamePk}
            isLive={isLive}
            backHref={selectedDate ? `${todayHref}&date=${selectedDate}` : todayHref}
          />
        ) : (
          <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">
            Invalid game ID.
          </div>
        )}
    </PageShell>
  )
}
