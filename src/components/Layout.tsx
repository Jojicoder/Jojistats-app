import PageShell from "./PageShell"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import TeamManagerDashboard from "./TeamManagerDashboard"
import UserAccessPanel from "./UserAccessPanel"
import ContactMessagesPanel from "./ContactMessagesPanel"
import MyTeamPage from "./MyTeamPage"
import SeasonArchivePage from "../pages/SeasonArchivePage"
import {
  applyGlobalTheme,
  isJunksTeam,
  JUNKS_THEME_STYLE,
  resetGlobalTheme,
} from "./teamTheme"
import { useEffect, useState } from "react"
import {
  fetchTeams,
  fetchPlayers,
  fetchGamesBySeason,
  fetchSavedEntriesByPlayer,
  fetchPitchingEntriesByPlayer,
  fetchUserAccessRows,
  mapUserAccessRow,
  updateUserAccessStatus,
  upsertUserAccess,
} from "../api/supabase-api"

import {
  createTeam,
  updateTeam,
  archiveTeam,
  createPlayer,
  updatePlayer,
  archivePlayer,
} from "../api/api"

import type { GameRow, PlayerRow, TeamRow } from "../api/supabase-api"
import type {
  Player,
  Team,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  BattingEntryData,
  DraftGameMeta,
  UserAccess,
} from "../types"

type ActiveView = "stats" | "record" | "myteam" | "manager" | "team" | "access" | "contact" | "archive"
type StatMode = "batting" | "pitching"

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
    location: "",
    seasonYear: seasonYear ?? new Date().getFullYear(),
    matchNumber: 1,
    teamScore: null,
    opponentScore: null,
    result: "",
  }
}

async function fetchPlayersForTeams(teams: Team[]) {
  const playerGroups = await Promise.all(
    teams.map((team) => fetchPlayers(Number(team.id), team.currentSeasonYear))
  )

  return playerGroups.flat().map(mapPlayerRow)
}

function replaceTeamSeasonPlayers(
  currentPlayers: Player[],
  teamId: string,
  seasonYear: number,
  nextPlayers: Player[]
) {
  return [
    ...currentPlayers.filter(
      (player) =>
        player.teamId !== teamId || player.seasonYear !== seasonYear
    ),
    ...nextPlayers,
  ]
}

export default function Layout() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTeamId, setActiveTeamId] = useState("")
  const [activePlayerId, setActivePlayerId] = useState("")
  const [activeView, setActiveView] = useState<ActiveView>("stats")
  const [mode, setMode] = useState<StatMode>("batting")
  const [isGameMode, setIsGameMode] = useState(false)

  const [entriesByPlayer, setEntriesByPlayer] = useState<Record<string, BattingEntryData>>({})
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>(() =>
    createInitialGameMeta()
  )

  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<Record<string, SavedPitchingGameEntry[]>>({})
  const [savedGames, setSavedGames] = useState<GameRow[]>([])
  const [userAccesses, setUserAccesses] = useState<UserAccess[]>([])

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
  const useJunksTheme = isJunksTeam(activeTeam?.name)

  useEffect(() => {
    if (useJunksTheme) {
      applyGlobalTheme(JUNKS_THEME_STYLE)
    } else {
      resetGlobalTheme()
    }

    return resetGlobalTheme
  }, [useJunksTheme])

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const load = async () => {
      const teamsData = (await fetchTeams()).map(mapTeamRow)
      setTeams(teamsData)

      const first = teamsData[0]
      if (!first) return

      setActiveTeamId(first.id)
      setGameMeta(createInitialGameMeta(first.currentSeasonYear))

      const playersData = await fetchPlayersForTeams(teamsData)
      setPlayers(playersData)
      setActivePlayerId(
        playersData.find((player) => player.teamId === first.id)?.id ?? ""
      )

      setSavedEntriesByPlayer(
        await fetchSavedEntriesByPlayer(Number(first.id), first.currentSeasonYear)
      )

      setPitchingEntriesByPlayer(
        await fetchPitchingEntriesByPlayer(Number(first.id), first.currentSeasonYear)
      )

      setSavedGames(await fetchGamesBySeason(Number(first.id), first.currentSeasonYear))

      setUserAccesses((await fetchUserAccessRows()).map(mapUserAccessRow))
    }

    load()
  }, [setActivePlayerId, setActiveTeamId, setPlayers, setTeams])

  useEffect(() => {
    const loadActiveTeamData = async () => {
      if (!activeTeam) return

      const [battingEntries, pitchingEntries, games] = await Promise.all([
        fetchSavedEntriesByPlayer(Number(activeTeam.id), activeTeam.currentSeasonYear),
        fetchPitchingEntriesByPlayer(Number(activeTeam.id), activeTeam.currentSeasonYear),
        fetchGamesBySeason(Number(activeTeam.id), activeTeam.currentSeasonYear),
      ])

      setSavedEntriesByPlayer(battingEntries)
      setPitchingEntriesByPlayer(pitchingEntries)
      setSavedGames(games)
    }

    loadActiveTeamData()
  }, [activeTeam])

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
    setPlayers((prev) =>
      replaceTeamSeasonPlayers(
        prev,
        player.teamId,
        player.seasonYear,
        updated.map(mapPlayerRow)
      )
    )
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
    setPlayers((prev) =>
      replaceTeamSeasonPlayers(
        prev,
        player.teamId,
        player.seasonYear,
        updated.map(mapPlayerRow)
      )
    )
  }

  const handleDeletePlayer = async (playerId: string) => {
    if (!activeTeam) return

    await archivePlayer(Number(playerId))
    const updated = await fetchPlayers(Number(activeTeamId), activeTeam.currentSeasonYear)
    setPlayers((prev) =>
      replaceTeamSeasonPlayers(
        prev,
        activeTeamId,
        activeTeam.currentSeasonYear,
        updated.map(mapPlayerRow)
      )
    )
  }

  /* ---------------- USER ACCESS ACTIONS ---------------- */

  const refreshUserAccesses = async () => {
    setUserAccesses((await fetchUserAccessRows()).map(mapUserAccessRow))
  }

  const handleSaveAccess = async (access: Omit<UserAccess, "id">) => {
    await upsertUserAccess(access)
    await refreshUserAccesses()
  }

  const handleSetAccessActive = async (
    accessId: string,
    isActive: boolean
  ) => {
    await updateUserAccessStatus(accessId, isActive)
    await refreshUserAccesses()
  }

  /* ---------------- UI ---------------- */

  return (
    <PageShell
      variant={useJunksTheme ? "team" : "default"}
      style={useJunksTheme ? JUNKS_THEME_STYLE : undefined}
      headerProps={{
        teamName: activeTeam?.name ?? "No Team",
        teams: visibleTeams.map((team) => team.name),
        onChangeTeam: (name) => {
          const t = visibleTeams.find((x: Team) => x.name === name)
          if (t) {
            setActiveTeamId(t.id)
            setGameMeta((prev) => ({
              ...prev,
              seasonYear: t.currentSeasonYear,
            }))
          }
        },
        isLoggedIn: true,
      }}
      activeView={activeView}
      onChangeView={(nextView) => setActiveView(nextView as ActiveView)}
      tabs={[
          { label: "My Stats", view: "stats" },
          { label: "Record Game", view: "record" },
          { label: "My Team", view: "myteam" },
          { label: "Team Manager", view: "manager" },
          { label: "Team Setup", view: "team" },
          { label: "User Access", view: "access" },
          { label: "Contact", view: "contact" },
          { label: "Archive", view: "archive" },
      ]}
      contentClassName="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col gap-3 p-3 lg:flex-row lg:items-start lg:p-4"
    >
        {activeView === "archive" ? (
          <SeasonArchivePage embedded />
        ) : activeView === "myteam" ? (
          <MyTeamPage
            team={activeTeam}
            players={teamPlayers}
            savedEntriesByPlayer={savedEntriesByPlayer}
            pitchingEntriesByPlayer={pitchingEntriesByPlayer}
          />
        ) : activeView === "team" ? (
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
        ) : activeView === "manager" ? (
          <TeamManagerDashboard
            team={activeTeam}
            players={teamPlayers}
            savedEntriesByPlayer={savedEntriesByPlayer}
            pitchingEntriesByPlayer={pitchingEntriesByPlayer}
          />
        ) : activeView === "access" ? (
          <main className="w-full">
            <UserAccessPanel
              teams={visibleTeams}
              players={players}
              userAccesses={userAccesses}
              onSaveAccess={handleSaveAccess}
              onSetAccessActive={handleSetAccessActive}
            />
          </main>
        ) : activeView === "contact" ? (
          <ContactMessagesPanel />
        ) : (
          <>
            {!(activeView === "record" && isGameMode) && (
              <Sidebar
                players={teamPlayers}
                activePlayerId={activePlayer?.id ?? ""}
                setActivePlayerId={setActivePlayerId}
                savedEntriesByPlayer={savedEntriesByPlayer}
                pitchingEntriesByPlayer={pitchingEntriesByPlayer}
                mode={mode}
              />
            )}

            {activePlayer ? (
              <MainDashboard
                activePlayer={activePlayer}
                allPlayers={teamPlayers}
                onSelectPlayer={(player) => setActivePlayerId(player.id)}
                activeView={activeView === "record" ? "record" : "stats"}
                teamName={activeTeam?.name ?? ""}
                gameMeta={gameMeta}
                setGameMeta={setGameMeta}
                entriesByPlayer={entriesByPlayer}
                setEntriesByPlayer={setEntriesByPlayer}
                savedEntriesByPlayer={savedEntriesByPlayer}
                pitchingEntriesByPlayer={pitchingEntriesByPlayer}
                savedGames={savedGames}
                mode={mode}
                onModeChange={setMode}
                setSavedEntriesByPlayer={setSavedEntriesByPlayer}
                setPitchingEntriesByPlayer={setPitchingEntriesByPlayer}
                setSavedGames={setSavedGames}
                onGameModeChange={setIsGameMode}
              />
            ) : (
              <main className="w-full rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
                Add a player to start recording stats.
              </main>
            )}
          </>
        )}
    </PageShell>
  )
}
