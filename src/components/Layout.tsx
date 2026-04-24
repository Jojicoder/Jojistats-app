import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import { useEffect, useState } from "react"
import {
  fetchTeams,
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchPitchingEntriesByPlayer,
} from "../api/supabase-api"
import type { PlayerRow, TeamRow } from "../api/supabase-api"
import type {
  Player,
  Team,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"

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

function mapTeamRow(team: TeamRow): Team {
  return {
    id: String(team.id),
    name: team.name,
    isArchived: Boolean(team.is_archived),
    currentSeasonYear: team.current_season_year,
  }
}

function mapPlayerRow(player: PlayerRow): Player {
  return {
    id: String(player.id),
    teamId: String(player.team_id),
    name: player.name,
    jerseyNumber: player.jersey_number,
    position: player.position as Player["position"],
    seasonYear: player.season_year,
    isArchived: Boolean(player.is_archived),
  }
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
  const [activeView, setActiveView] = useState<"stats" | "record" | "team">("stats")
  const [mode, setMode] = useState<"batting" | "pitching">("batting")

  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})

  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<
    Record<string, SavedPitchingGameEntry[]>
  >({})

  const visibleTeams = teams.filter((t) => !t.isArchived)
  const activeTeam = visibleTeams.find((t) => t.id === activeTeamId) || null

  const teamPlayers = players.filter(
    (p) =>
      p.teamId === activeTeam?.id &&
      !p.isArchived &&
      p.seasonYear === activeTeam?.currentSeasonYear
  )

  const activePlayer =
    teamPlayers.find((p) => p.id === activePlayerId) || teamPlayers[0] || null

  /* -------------------- INITIAL LOAD -------------------- */

  useEffect(() => {
    const load = async () => {
      const teamsData = (await fetchTeams())
        .map(mapTeamRow)
        .filter((t) => !t.isArchived)

      setTeams(teamsData)

      const first = teamsData[0]
      if (!first) return

      setActiveTeamId(first.id)

      const playersData = (await fetchPlayers(
        Number(first.id),
        first.currentSeasonYear
      ))
        .map(mapPlayerRow)
        .filter((p) => !p.isArchived)

      setPlayers(playersData)
      setActivePlayerId(playersData[0]?.id ?? "")

      const batting = await fetchSavedEntriesByPlayer(
        Number(first.id),
        first.currentSeasonYear
      )
      setSavedEntriesByPlayer(batting)

      const pitching = await fetchPitchingEntriesByPlayer(
        Number(first.id),
        first.currentSeasonYear
      )
      setPitchingEntriesByPlayer(pitching)
    }

    load()
  }, [])

  /* -------------------- TEAM SWITCH -------------------- */

  const handleChangeTeam = async (teamId: string) => {
    const team = visibleTeams.find((t) => t.id === teamId)
    if (!team) return

    setActiveTeamId(teamId)

    const playersData = (await fetchPlayers(
      Number(teamId),
      team.currentSeasonYear
    ))
      .map(mapPlayerRow)
      .filter((p) => !p.isArchived)

    setPlayers(playersData)
    setActivePlayerId(playersData[0]?.id ?? "")

    const batting = await fetchSavedEntriesByPlayer(
      Number(teamId),
      team.currentSeasonYear
    )
    setSavedEntriesByPlayer(batting)

    const pitching = await fetchPitchingEntriesByPlayer(
      Number(teamId),
      team.currentSeasonYear
    )
    setPitchingEntriesByPlayer(pitching)
  }

  /* -------------------- UI -------------------- */

  return (
  <div className="flex h-screen flex-col bg-gray-50">

    {/* Header */}
    <Header
      teamName={activeTeam?.name ?? "No Team"}
      teams={visibleTeams.map((t) => t.name)}
      onChangeTeam={(name) => {
        const t = visibleTeams.find((x) => x.name === name)
        if (t) handleChangeTeam(t.id)
      }}
      onOpenTeamSetup={() => setActiveView("team")}
      isLoggedIn={true}
    />

    {/* ✅ TopTabs（ここに置く） */}
    <TopTabs
      activeView={activeView}
      onChangeView={setActiveView}
    />

    {activeView === "stats" && (
      <div className="flex shrink-0 gap-2 px-4 pt-3">
        <button
          type="button"
          onClick={() => setMode("batting")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "batting"
              ? "bg-green-900 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Batting
        </button>

        <button
          type="button"
          onClick={() => setMode("pitching")}
          className={`rounded-lg px-4 py-2 text-sm font-semibold ${
            mode === "pitching"
              ? "bg-green-900 text-white"
              : "bg-gray-200 text-gray-700 hover:bg-gray-300"
          }`}
        >
          Pitching
        </button>
      </div>
    )}

    {/* Main Content */}
    <div className="flex min-h-0 flex-1 gap-4 overflow-auto p-4">

      {activeView === "team" ? (
        <TeamSetupPage
          teams={visibleTeams}
          activeTeamId={activeTeam?.id ?? null}
          setActiveTeamId={setActiveTeamId}
          teamName={activeTeam?.name ?? ""}
          seasonYear={activeTeam?.currentSeasonYear ?? 0}
          players={teamPlayers}
          activePlayerId={activePlayer?.id ?? null}
          setActivePlayerId={setActivePlayerId}
          savedEntriesByPlayer={savedEntriesByPlayer}
          onAddTeam={() => {}}
          onUpdateTeamName={() => {}}
          onArchiveTeam={() => {}}
          onStartNewSeason={() => {}}
          onAddPlayer={() => {}}
          onUpdatePlayer={() => {}}
          onDeletePlayer={() => {}}
        />
      ) : (
        <>
          <Sidebar
            players={teamPlayers}
            activePlayerId={activePlayer?.id ?? ""}
            setActivePlayerId={setActivePlayerId}
            savedEntriesByPlayer={savedEntriesByPlayer}
            pitchingEntriesByPlayer={pitchingEntriesByPlayer}
            mode={mode}
          />

          <div className="flex-1">
            {activePlayer ? (
              <MainDashboard
                activePlayer={activePlayer}
                activeView={activeView}
                teamName={activeTeam?.name ?? ""}
                gameMeta={{
                  date: new Date().toISOString().split("T")[0],
                  opponent: "",
                  seasonYear: activeTeam?.currentSeasonYear ?? 0,
                  matchNumber: 1,
                }}
                setGameMeta={() => {}}
                entriesByPlayer={{}}
                setEntriesByPlayer={() => {}}
                savedEntriesByPlayer={savedEntriesByPlayer}
                setSavedEntriesByPlayer={setSavedEntriesByPlayer}
              />
            ) : (
              <div className="p-6 text-gray-500">
                No player found
              </div>
            )}
          </div>
        </>
      )}
    </div>
  </div>
)
}
