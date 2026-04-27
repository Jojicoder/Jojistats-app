import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import { useEffect, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import {
  fetchTeams,
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchPitchingEntriesByPlayer,
} from "../api/supabase-api"

import {
  createTeam,
  updateTeam,
  archiveTeam,
  createPlayer,
  updatePlayer,
  archivePlayer,
} from "../api/api"

import type { PlayerRow, TeamRow } from "../api/supabase-api"
import type {
  Player,
  Team,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  BattingEntryData,
  DraftGameMeta,
} from "../types"

type ActiveView = "stats" | "record" | "team"
type StatMode = "batting" | "pitching"

type LayoutProps = {
  teams: Team[]
  setTeams: Dispatch<SetStateAction<Team[]>>
  players: Player[]
  setPlayers: Dispatch<SetStateAction<Player[]>>
  activeTeamId: string
  setActiveTeamId: Dispatch<SetStateAction<string>>
  activePlayerId: string
  setActivePlayerId: Dispatch<SetStateAction<string>>
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

function createInitialGameMeta(seasonYear?: number): DraftGameMeta {
  return {
    date: new Date().toISOString().split("T")[0],
    opponent: "",
    seasonYear: seasonYear ?? new Date().getFullYear(),
    matchNumber: 1,
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
  const [activeView, setActiveView] = useState<ActiveView>("stats")
  const [mode, setMode] = useState<StatMode>("batting")

  const [entriesByPlayer, setEntriesByPlayer] = useState<Record<string, BattingEntryData>>({})
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>(() =>
    createInitialGameMeta()
  )

  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<Record<string, SavedPitchingGameEntry[]>>({})

  const visibleTeams = teams.filter((t: Team) => !t.isArchived)
  const activeTeam = visibleTeams.find((t: Team) => t.id === activeTeamId) || null

  const teamPlayers = players.filter(
    (p: Player) =>
      p.teamId === activeTeam?.id &&
      !p.isArchived &&
      p.seasonYear === activeTeam?.currentSeasonYear
  )

  const activePlayer =
    teamPlayers.find((p: Player) => p.id === activePlayerId) || teamPlayers[0] || null

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const load = async () => {
      const teamsData = (await fetchTeams()).map(mapTeamRow)
      setTeams(teamsData)

      const first = teamsData[0]
      if (!first) return

      setActiveTeamId(first.id)
      setGameMeta(createInitialGameMeta(first.currentSeasonYear))

      const playersData = (await fetchPlayers(Number(first.id), first.currentSeasonYear)).map(mapPlayerRow)
      setPlayers(playersData)
      setActivePlayerId(playersData[0]?.id ?? "")

      setSavedEntriesByPlayer(
        await fetchSavedEntriesByPlayer(Number(first.id), first.currentSeasonYear)
      )

      setPitchingEntriesByPlayer(
        await fetchPitchingEntriesByPlayer(Number(first.id), first.currentSeasonYear)
      )
    }

    load()
  }, [])

  /* ---------------- TEAM ACTIONS ---------------- */

  const handleAddTeam = async (name: string) => {
    await createTeam({ name })
    const updated = await fetchTeams()
    setTeams(updated.map(mapTeamRow))
  }

  const handleUpdateTeamName = async (teamId: string, name: string) => {
    const team = teams.find((t) => t.id === teamId)
    if (!team) return

    await updateTeam(Number(teamId), {
      name,
      current_season_year: team.currentSeasonYear,
    })
    const updated = await fetchTeams()
    setTeams(updated.map(mapTeamRow))
  }

  const handleArchiveTeam = async (teamId: string) => {
    await archiveTeam(Number(teamId))
    const updated = await fetchTeams()
    setTeams(updated.map(mapTeamRow))
  }

  /* ---------------- PLAYER ACTIONS ---------------- */

  const handleAddPlayer = async (player: Player) => {
    await createPlayer({
      team_id: Number(player.teamId),
      name: player.name,
      jersey_number: player.jerseyNumber ?? null,
      position: player.position,
      season_year: player.seasonYear,
      is_archived: player.isArchived ? 1 : 0,
    })
    const updated = await fetchPlayers(Number(player.teamId), player.seasonYear)
    setPlayers(updated.map(mapPlayerRow))
  }

  const handleUpdatePlayer = async (player: Player) => {
    await updatePlayer(Number(player.id), {
      team_id: Number(player.teamId),
      name: player.name,
      jersey_number: player.jerseyNumber ?? null,
      position: player.position,
      season_year: player.seasonYear,
      is_archived: player.isArchived ? 1 : 0,
    })
    const updated = await fetchPlayers(Number(player.teamId), player.seasonYear)
    setPlayers(updated.map(mapPlayerRow))
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!activeTeam) return

    await archivePlayer(Number(playerId))
    const updated = await fetchPlayers(Number(activeTeamId), activeTeam.currentSeasonYear)
    setPlayers(updated.map(mapPlayerRow))
  }

  /* ---------------- UI ---------------- */

  return (
    <div className="flex h-screen flex-col bg-gray-50">

      <Header
        teamName={activeTeam?.name ?? "No Team"}
        teams={visibleTeams.map((t) => t.name)}
        onChangeTeam={(name) => {
          const t = visibleTeams.find((x: Team) => x.name === name)
          if (t) {
            setActiveTeamId(t.id)
            setGameMeta((prev) => ({
              ...prev,
              seasonYear: t.currentSeasonYear,
            }))
          }
        }}
        isLoggedIn={true}
      />

      <TopTabs activeView={activeView} onChangeView={setActiveView} />

      {activeView === "stats" && (
        <div className="flex gap-2 px-4 pt-3">
          <button
            type="button"
            onClick={() => setMode("batting")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "batting"
                ? "bg-green-900 text-white shadow-sm"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Batting
          </button>
          <button
            type="button"
            onClick={() => setMode("pitching")}
            className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
              mode === "pitching"
                ? "bg-green-900 text-white shadow-sm"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pitching
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:p-4">

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

            onAddTeam={handleAddTeam}
            onUpdateTeamName={handleUpdateTeamName}
            onArchiveTeam={handleArchiveTeam}

            onAddPlayer={handleAddPlayer}
            onUpdatePlayer={handleUpdatePlayer}
            onDeletePlayer={handleDeletePlayer}
            onChangeSeason={(year) => {
              if (!activeTeam) return

              setTeams((prev) =>
                prev.map((team) =>
                  team.id === activeTeam.id
                    ? { ...team, currentSeasonYear: year }
                    : team
                )
              )
            }}
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

            {activePlayer ? (
              <MainDashboard
                activePlayer={activePlayer}
                activeView={activeView === "record" ? "record" : "stats"}
                teamName={activeTeam?.name ?? ""}
                gameMeta={gameMeta}
                setGameMeta={setGameMeta}
                entriesByPlayer={entriesByPlayer}
                setEntriesByPlayer={setEntriesByPlayer}
                savedEntriesByPlayer={savedEntriesByPlayer}
                pitchingEntriesByPlayer={pitchingEntriesByPlayer}
                mode={mode}
                setSavedEntriesByPlayer={setSavedEntriesByPlayer}
                setPitchingEntriesByPlayer={setPitchingEntriesByPlayer}
              />
            ) : (
              <main className="w-full rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                Add a player to start recording stats.
              </main>
            )}
          </>
        )}
      </div>
    </div>
  )
}
