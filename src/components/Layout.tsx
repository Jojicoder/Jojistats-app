import Header from "./Header"
import TopTabs from "./TopTabs"
import Sidebar from "./Sidebar"
import MainDashboard from "./MainDashboard"
import TeamSetupPage from "./TeamSetupPage"
import { useEffect, useMemo, useState } from "react"
import { demoSavedEntriesByPlayer } from "../demoData"
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

const createTeamId = () => {
  return `team-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

const createPlayerId = () => {
  return `player-${Date.now()}-${Math.floor(Math.random() * 1000)}`
}

const getTodayDate = (): string => {
  return new Date().toISOString().split("T")[0]
}

function sortPlayersByJersey(players: Player[]) {
  return [...players].sort((a, b) => {
    return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
  })
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
  >(demoSavedEntriesByPlayer)

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
    const currentYear = new Date().getFullYear()

    setTeams((prev) => [
      ...prev,
      {
        id: teamId,
        name,
        isArchived: false,
        currentSeasonYear: currentYear,
      },
    ])

    setActiveTeamId(teamId)
  }

  const handleUpdateTeamName = (teamId: string, name: string) => {
    setTeams((prev) =>
      prev.map((team) => (team.id === teamId ? { ...team, name } : team))
    )
  }

  const handleArchiveTeam = (teamId: string) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === teamId ? { ...team, isArchived: true } : team
      )
    )
  }

  const handleStartNewSeason = () => {
    if (!activeTeam) return

    const nextSeasonYear = currentSeasonYear + 1

    const previousSeasonPlayers = players.filter(
      (player) =>
        player.teamId === activeTeam.id &&
        player.seasonYear === currentSeasonYear &&
        !player.isArchived
    )

    const confirmed = window.confirm(
      `Start ${nextSeasonYear} season for ${activeTeam.name}?\n\nThe current roster will be copied into the new season.`
    )

    if (!confirmed) return

    const copiedPlayers = previousSeasonPlayers.map((player) => ({
      ...player,
      id: createPlayerId(),
      seasonYear: nextSeasonYear,
      isArchived: false,
    }))

    const sortedCopiedPlayers = sortPlayersByJersey(copiedPlayers)

    setPlayers((prev) => [...prev, ...sortedCopiedPlayers])

    setTeams((prev) =>
      prev.map((team) =>
        team.id === activeTeam.id
          ? {
              ...team,
              currentSeasonYear: nextSeasonYear,
            }
          : team
      )
    )

    setGameMeta({
      date: getTodayDate(),
      opponent: "",
      seasonYear: nextSeasonYear,
      matchNumber: 1,
    })

    setEntriesByPlayer({})

    if (sortedCopiedPlayers.length > 0) {
      setActivePlayerId(sortedCopiedPlayers[0].id)
    } else {
      setActivePlayerId("")
    }
  }

  const handleAddPlayer = (player: Player) => {
    const nextPlayer: Player = {
      ...player,
      seasonYear: currentSeasonYear,
      isArchived: false,
    }

    setPlayers((prev) => [...prev, nextPlayer])
    setActivePlayerId(nextPlayer.id)
  }

  const handleUpdatePlayer = (updatedPlayer: Player) => {
    setPlayers((prev) =>
      prev.map((player) =>
        player.id === updatedPlayer.id
          ? {
              ...updatedPlayer,
              seasonYear: player.seasonYear,
              isArchived: player.isArchived ?? false,
            }
          : player
      )
    )
  }

  const handleDeletePlayer = (playerId: string) => {
    setPlayers((prev) => prev.filter((player) => player.id !== playerId))

    if (playerId === activePlayerId) {
      const remainingPlayers = teamPlayers.filter(
        (player) => player.id !== playerId
      )
      const sortedRemainingPlayers = sortPlayersByJersey(remainingPlayers)
      setActivePlayerId(sortedRemainingPlayers[0]?.id ?? "")
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
