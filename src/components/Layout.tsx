import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import { useEffect, useMemo, useState } from "react"
import {
  createTeam,
  updateTeam,
  archiveTeam,
  createPlayer,
  updatePlayer,
  archivePlayer,
  startNewSeason,
} from "../api/api"
import {
  fetchTeams,
  fetchPlayers,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import type { Dispatch, SetStateAction } from "react"
import type {
  Player,
  Team,
  BattingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
} from "../types"

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

const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0]
}

function sortPlayersByJersey(players: Player[]) {
  return [...players].sort((a, b) => {
    return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
  })
}

function mapTeamRow(team: any): Team {
  return {
    id: String(team.id),
    name: team.name,
    isArchived: Boolean(team.is_archived),
    currentSeasonYear: team.current_season_year,
  }
}

function mapPlayerRow(player: any): Player {
  return {
    id: String(player.id),
    teamId: String(player.team_id),
    name: player.name,
    jerseyNumber: player.jersey_number,
    position: player.position,
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
  const [activeView, setActiveView] = useState<"stats" | "record" | "team">(
    "stats"
  )

  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: getTodayDate(),
    opponent: "",
    seasonYear: new Date().getFullYear(),
    matchNumber: 1,
  })

  const [entriesByPlayer, setEntriesByPlayer] = useState<
    Record<string, BattingEntryData>
  >({})

const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<
  Record<string, SavedBattingGameEntry[]>
>({})

  const visibleTeams = useMemo(
    () => teams.filter((team) => !team.isArchived),
    [teams]
  )

  const activeTeam =
    visibleTeams.find((team) => team.id === activeTeamId) ??
    visibleTeams[0] ??
    null

  const currentSeasonYear =
    activeTeam?.currentSeasonYear ?? new Date().getFullYear()

  const activeGameMeta = useMemo(
    () => ({
      ...gameMeta,
      seasonYear: currentSeasonYear,
    }),
    [gameMeta, currentSeasonYear]
  )

  const teamPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.teamId === activeTeam?.id &&
          player.seasonYear === currentSeasonYear &&
          !player.isArchived
      ),
    [players, activeTeam?.id, currentSeasonYear]
  )

  const activePlayer =
    teamPlayers.find((player) => player.id === activePlayerId) ??
    teamPlayers[0] ??
    null

  const loadTeams = async () => {
    const rows = await fetchTeams()
    const mappedTeams: Team[] = rows.map(mapTeamRow)
    setTeams(mappedTeams)
    return mappedTeams
  }

  const loadPlayers = async (teamId: string, seasonYear: number) => {
    const rows = await fetchPlayers(Number(teamId), seasonYear)
    const mappedPlayers: Player[] = rows.map(mapPlayerRow)

    setPlayers((prev) => {
      const nextPlayers = prev.filter(
        (player) =>
          !(
            player.teamId === String(teamId) &&
            player.seasonYear === seasonYear
          )
      )

      return [...nextPlayers, ...mappedPlayers]
    })

    return mappedPlayers
  }

  useEffect(() => {
    const run = async () => {
      try {
        const loadedTeams = await loadTeams()

        if (!activeTeamId && loadedTeams.length > 0) {
          setActiveTeamId(loadedTeams[0].id)
        }
      } catch (error) {
        console.error("Failed to load teams", error)
      }
    }

    run()
  }, [])

  useEffect(() => {
    if (!activeTeamId || !activeTeam) return

    const run = async () => {
      try {
        await loadPlayers(activeTeamId, currentSeasonYear)
      } catch (error) {
        console.error("Failed to load players", error)
      }
    }

    run()
  }, [activeTeamId, activeTeam, currentSeasonYear])

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

  useEffect(() => {
  if (!activeTeamId) return

  const loadSavedEntries = async () => {
    try {
      const data = await fetchSavedEntriesByPlayer(
        Number(activeTeamId),
        currentSeasonYear
      )
      setSavedEntriesByPlayer(data)
    } catch (error) {
      console.error("Failed to load saved entries", error)
    }
  }

  loadSavedEntries()
}, [activeTeamId, currentSeasonYear])

  const handleAddTeam = async (name: string) => {
    try {
      const currentYear = new Date().getFullYear()

      await createTeam({
        name,
        current_season_year: currentYear,
        is_archived: 0,
      })

      const loadedTeams = await loadTeams()
      const newestTeam = loadedTeams[0]

      if (newestTeam) {
        setActiveTeamId(newestTeam.id)
      }
    } catch (error) {
      console.error("Failed to add team", error)
      window.alert("Failed to add team")
    }
  }

  const handleUpdateTeamName = async (teamId: string, name: string) => {
    try {
      const team = teams.find((item) => item.id === teamId)
      if (!team) return

      await updateTeam(Number(teamId), {
        name,
        current_season_year: team.currentSeasonYear,
        is_archived: team.isArchived ? 1 : 0,
      })

      await loadTeams()
    } catch (error) {
      console.error("Failed to update team", error)
      window.alert("Failed to update team")
    }
  }

  const handleArchiveTeam = async (teamId: string) => {
    try {
      await archiveTeam(Number(teamId))
      const loadedTeams = await loadTeams()

      if (loadedTeams.length > 0) {
        setActiveTeamId(loadedTeams[0].id)
      } else {
        setActiveTeamId("")
      }
    } catch (error) {
      console.error("Failed to archive team", error)
      window.alert("Failed to archive team")
    }
  }

  const handleStartNewSeason = async () => {
    if (!activeTeam) return

    const nextSeasonYear = currentSeasonYear + 1
    const confirmed = window.confirm(
      `Start ${nextSeasonYear} season for ${activeTeam.name}?\n\nThe current roster will be copied into the new season.`
    )

    if (!confirmed) return

    try {
      await startNewSeason(Number(activeTeam.id), true)

      const loadedTeams = await loadTeams()
      const refreshedActiveTeam =
        loadedTeams.find((team) => team.id === activeTeam.id) ?? null

      if (!refreshedActiveTeam) return

      const loadedPlayers = await loadPlayers(
        refreshedActiveTeam.id,
        refreshedActiveTeam.currentSeasonYear
      )

      const sortedPlayers = sortPlayersByJersey(loadedPlayers)

      setGameMeta({
        date: getTodayDate(),
        opponent: "",
        seasonYear: refreshedActiveTeam.currentSeasonYear,
        matchNumber: 1,
      })

      setEntriesByPlayer({})

      if (sortedPlayers.length > 0) {
        setActivePlayerId(sortedPlayers[0].id)
      } else {
        setActivePlayerId("")
      }
    } catch (error) {
      console.error("Failed to start new season", error)
      window.alert("Failed to start new season")
    }
  }

  const handleAddPlayer = async (player: Player) => {
    try {
      await createPlayer({
        team_id: Number(player.teamId),
        name: player.name,
        jersey_number: player.jerseyNumber ?? null,
        position: player.position ?? null,
        season_year: currentSeasonYear,
        is_archived: 0,
      })

      const loadedPlayers = await loadPlayers(player.teamId, currentSeasonYear)
      const sortedPlayers = sortPlayersByJersey(loadedPlayers)
      const matchedPlayer =
        sortedPlayers.find(
          (item) =>
            item.name === player.name &&
            item.jerseyNumber === (player.jerseyNumber ?? null) &&
            item.position === player.position
        ) ?? sortedPlayers[sortedPlayers.length - 1]

      if (matchedPlayer) {
        setActivePlayerId(matchedPlayer.id)
      }
    } catch (error) {
      console.error("Failed to add player", error)
      window.alert("Failed to add player")
    }
  }

  const handleUpdatePlayer = async (updatedPlayer: Player) => {
    try {
      await updatePlayer(Number(updatedPlayer.id), {
        team_id: Number(updatedPlayer.teamId),
        name: updatedPlayer.name,
        jersey_number: updatedPlayer.jerseyNumber ?? null,
        position: updatedPlayer.position ?? null,
        season_year: updatedPlayer.seasonYear,
        is_archived: updatedPlayer.isArchived ? 1 : 0,
      })

      await loadPlayers(updatedPlayer.teamId, updatedPlayer.seasonYear)
    } catch (error) {
      console.error("Failed to update player", error)
      window.alert("Failed to update player")
    }
  }

  const handleDeletePlayer = async (playerId: string) => {
    try {
      const player = players.find((item) => item.id === playerId)
      if (!player) return

      await archivePlayer(Number(playerId))

      const loadedPlayers = await loadPlayers(player.teamId, player.seasonYear)
      const sortedRemainingPlayers = sortPlayersByJersey(loadedPlayers)

      if (playerId === activePlayerId) {
        setActivePlayerId(sortedRemainingPlayers[0]?.id ?? "")
      }
    } catch (error) {
      console.error("Failed to archive player", error)
      window.alert("Failed to archive player")
    }
  }

  return (
    <div className="flex h-screen flex-col bg-gray-50">
      <Header
        teamName={activeTeam?.name ?? "No Team"}
        onOpenTeamSetup={() => setActiveView("team")}
      />

      <TopTabs activeView={activeView} onChangeView={setActiveView} />

      <div className="flex min-h-0 flex-1 flex-col items-stretch gap-4 overflow-auto px-3 py-4 sm:px-5 sm:py-5 lg:flex-row lg:items-start lg:gap-6">
        {activeView === "team" ? (
          <TeamSetupPage
            teams={visibleTeams}
            activeTeamId={activeTeam?.id ?? null}
            setActiveTeamId={setActiveTeamId}
            onAddTeam={handleAddTeam}
            onUpdateTeamName={handleUpdateTeamName}
            onArchiveTeam={handleArchiveTeam}
            onStartNewSeason={handleStartNewSeason}
            teamName={activeTeam?.name ?? "No Team"}
            seasonYear={currentSeasonYear}
            players={teamPlayers}
            activePlayerId={activePlayer?.id ?? null}
            setActivePlayerId={setActivePlayerId}
            savedEntriesByPlayer={savedEntriesByPlayer}
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
              savedEntriesByPlayer={savedEntriesByPlayer}
            />

            <div className="min-w-0 flex-1">
              <MainDashboard
                activePlayer={activePlayer}
                activeView={activeView}
                teamName={activeTeam?.name ?? "No Team"}
                gameMeta={activeGameMeta}
                setGameMeta={setGameMeta}
                entriesByPlayer={entriesByPlayer}
                setEntriesByPlayer={setEntriesByPlayer}
                savedEntriesByPlayer={savedEntriesByPlayer}
                setSavedEntriesByPlayer={setSavedEntriesByPlayer}
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
                Add a player in Team Setup first
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