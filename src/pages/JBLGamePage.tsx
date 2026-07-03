import { useEffect, useState } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import GameDetails from "../components/jbl/GameDetails"
import { getJblData, getJblGameById, jblTeamSlug, type JblTeam } from "../api/jbl"
import { jblThemeStyle } from "../components/jbl/teamTheme"
import { normalizeGame } from "../components/jbl/stats"
import type { GameData } from "../components/jbl/types"

export default function JBLGamePage() {
  const { gameId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const selectedTeamName = searchParams.get("team") ?? ""
  const selectedDate = searchParams.get("date")

  const [teams, setTeams] = useState<JblTeam[]>([])
  const [game, setGame] = useState<GameData | null>(null)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getJblData()
      .then((data) => setTeams([...data.teams].sort((a, b) => a.name.localeCompare(b.name))))
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!gameId) return
    let cancelled = false

    const loadGame = () => {
      setLoading(true)
      getJblGameById(gameId)
        .then((result) => {
          if (cancelled) return
          if (!result) {
            setError("Game not found.")
            return
          }
          setGame(normalizeGame(result.game))
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load this JBL game.")
        })
        .finally(() => {
          if (!cancelled) setLoading(false)
        })
    }

    loadGame()
    return () => {
      cancelled = true
    }
  }, [gameId])

  const teamQuery = selectedTeamName ? `team=${encodeURIComponent(selectedTeamName)}&` : ""
  const todayHref = `/jbl?${teamQuery}view=today${selectedDate ? `&date=${selectedDate}` : ""}`
  const teamOverviewHref = selectedTeamName
    ? `/jbl/teams/${jblTeamSlug(selectedTeamName)}`
    : `/jbl?${teamQuery}view=players`

  return (
    <PageShell
      variant="mlb"
      style={jblThemeStyle(selectedTeamName)}
      contentClassName="mx-auto w-full max-w-screen-2xl flex-1 px-3 pb-3 pt-2 sm:px-4 sm:pb-4 sm:pt-2"
      headerProps={{
        teamName: selectedTeamName,
        teams: teams.map((team) => team.name),
        onChangeTeam: (name) => {
          navigate(`/jbl?team=${encodeURIComponent(name)}&view=today`)
        },
        placeholder: "Select a JBL team...",
      }}
      activeView="today"
      onChangeView={() => {}}
      tabs={[
        { label: "Team Overview", href: teamOverviewHref },
        { label: "Players", href: `/jbl?${teamQuery}view=players` },
        { label: "Today's Games", href: todayHref },
        { label: "Standings", href: `/jbl?${teamQuery}view=standings` },
        { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
      {loading && <div className="p-4 text-sm text-gray-500">Loading game data...</div>}
      {!loading && error && (
        <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
      )}
      {!loading && !error && game && <GameDetails game={game} isVisible />}
    </PageShell>
  )
}
