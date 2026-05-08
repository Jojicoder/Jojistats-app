import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"
import TopTabs from "../components/TopTabs"
import MyTeamPage from "../components/MyTeamPage"
import type { TabItem } from "../components/TopTabs"

import {
  fetchPlayers,
  fetchPlayersByTeam,
  fetchSavedEntriesByPlayer,
  fetchTeams,
  fetchPitchingEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import { supabase } from "../api/supabase-client"

import MyStatsPage from "../components/MyStatsPage"
import MyPitchingStatsPage from "../components/MyPitchingStatsPage"

import { useGameStats } from "../hooks/useGameStats"

import type { PlayerRow, TeamRow } from "../api/supabase-api"
import type {
  DisplayStat,
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  Team,
} from "../types"

/* -------------------- mapping -------------------- */

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

function sortPlayersByJersey(players: Player[]) {
  return [...players].sort(
    (a, b) => (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
  )
}

async function loadTeamEntries(teamId: string, seasonYear: number) {
  const [batting, pitching] = await Promise.all([
    fetchSavedEntriesByPlayer(Number(teamId), seasonYear),
    fetchPitchingEntriesByPlayer(Number(teamId), seasonYear),
  ])

  return { batting, pitching }
}

/* -------------------- main -------------------- */

export default function StatsPage() {
  const navigate = useNavigate()
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTeamId, setActiveTeamId] = useState("")
  const [activePlayerId, setActivePlayerId] = useState("")

  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<
    Record<string, SavedBattingGameEntry[]>
  >({})

  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<
    Record<string, SavedPitchingGameEntry[]>
  >({})

  const [mode, setMode] = useState<"batting" | "pitching">("batting")
  const [isRestrictedUser, setIsRestrictedUser] = useState(false)
  const [userRole, setUserRole] = useState<"player" | "recorder" | "manager" | "admin" | null>(null)
  const [view, setView] = useState<"stats" | "myteam">("stats")

  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  /* -------------------- FIX: fallback削除 -------------------- */

  const activeTeam =
    teams.find((team) => team.id === activeTeamId) || null

  const activePlayer =
    players.find((player) => player.id === activePlayerId) || null

  /* -------------------- 安定化 -------------------- */

  useEffect(() => {
    if (!players.length) return

    const exists = players.find((p) => p.id === activePlayerId)

    if (!exists) {
      setActivePlayerId(players[0].id)
    }
  }, [players, activePlayerId])

  /* -------------------- stats -------------------- */

  const savedEntries = useMemo(() => {
    if (!activePlayer) return []
    return savedEntriesByPlayer[activePlayer.id] ?? []
  }, [activePlayer, savedEntriesByPlayer])

  const allTeamEntries = useMemo(
    () => Object.values(savedEntriesByPlayer).flat(),
    [savedEntriesByPlayer]
  )

  const savedStatLines = useMemo(
    () => savedEntries.map((entry) => entry.statLine),
    [savedEntries]
  )

  const { kpi } = useGameStats(savedStatLines)

  const calculatedStats: DisplayStat[] = [
    { label: "AVG", value: kpi.avg },
    { label: "OBP", value: kpi.obp },
    { label: "OPS", value: kpi.ops },
    { label: "BB/K", value: kpi.bbPerK },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
    { label: "HBP", value: String(kpi.hbp) },
  ]

  const tabs: TabItem[] = useMemo(() => {
    if (userRole === "manager") {
      return [
        { label: "My Stats", view: "stats" },
        { label: "Team Stats", view: "myteam" },
        { label: "Team Manager", href: "/manager" },
      ]
    }
    if (userRole === "recorder") {
      return [
        { label: "My Stats", view: "stats" },
        { label: "My Team", view: "myteam" },
        { label: "Record Game", href: "/record-game" },
      ]
    }
    return [
      { label: "My Stats", view: "stats" },
      { label: "My Team", view: "myteam" },
    ]
  }, [userRole])

  /* -------------------- 初期ロード -------------------- */

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")

        const { data: authData } = await supabase.auth.getUser()
        const userEmail = authData.user?.email?.trim().toLowerCase() ?? ""
        const isAdmin = userEmail === "admin@jojistats.com"

        if (isAdmin) {
          navigate("/admin", { replace: true })
          return
        }

        if (authData.user && !isAdmin) {
          const access = await fetchUserAccessByEmail(userEmail)

          if (!access) {
            setTeams([])
            setPlayers([])
            setActiveTeamId("")
            setActivePlayerId("")
            setSavedEntriesByPlayer({})
            setPitchingEntriesByPlayer({})
            setIsRestrictedUser(true)
            setErrorMessage("No User Access has been assigned.")
            return
          }

          const teamRow = await fetchTeamById(access.team_id)
          const team = mapTeamRow(teamRow)
          let playerRows = await fetchPlayers(
            access.team_id,
            team.currentSeasonYear
          )
          if (playerRows.length === 0) {
            playerRows = await fetchPlayersByTeam(access.team_id)
          }
          const visiblePlayers = sortPlayersByJersey(
            playerRows
              .map(mapPlayerRow)
              .filter((player) => !player.isArchived)
          )

          const assignedPlayer =
            visiblePlayers.find(
              (player) => player.id === String(access.player_id)
            ) ?? visiblePlayers[0]

          if (!assignedPlayer) {
            setTeams([team])
            setPlayers(visiblePlayers)
            setActiveTeamId(team.id)
            setActivePlayerId("")
            setSavedEntriesByPlayer({})
            setPitchingEntriesByPlayer({})
            setIsRestrictedUser(true)
            setErrorMessage("No players were found for this team.")
            return
          }

          setIsRestrictedUser(true)
          setUserRole(access.role)
          setTeams([team])
          setActiveTeamId(team.id)
          setPlayers(visiblePlayers)
          setActivePlayerId(assignedPlayer.id)

          try {
            const { batting, pitching } = await loadTeamEntries(
              team.id,
              team.currentSeasonYear
            )
            setSavedEntriesByPlayer(batting)
            setPitchingEntriesByPlayer(pitching)
          } catch (statsError) {
            console.error(statsError)
            setSavedEntriesByPlayer({})
            setPitchingEntriesByPlayer({})
          }

          return
        }

        setIsRestrictedUser(false)
        const teamRows = await fetchTeams()

        const visibleTeams = teamRows
          .map(mapTeamRow)
          .filter((team) => !team.isArchived)

        setTeams(visibleTeams)

        const firstTeam = visibleTeams[0]
        if (!firstTeam) return

        setActiveTeamId(firstTeam.id)

        const playerRows = await fetchPlayers(
          Number(firstTeam.id),
          firstTeam.currentSeasonYear
        )

        const visiblePlayers = sortPlayersByJersey(
          playerRows
            .map(mapPlayerRow)
            .filter((p) => !p.isArchived)
        )

        setPlayers(visiblePlayers)
        setActivePlayerId(visiblePlayers[0]?.id ?? "")

        try {
          const { batting, pitching } = await loadTeamEntries(
            firstTeam.id,
            firstTeam.currentSeasonYear
          )
          setSavedEntriesByPlayer(batting)
          setPitchingEntriesByPlayer(pitching)
        } catch (statsError) {
          console.error(statsError)
          setSavedEntriesByPlayer({})
          setPitchingEntriesByPlayer({})
        }
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error
            ? `Failed to load stats: ${error.message}`
            : "Failed to load stats."
        )
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [navigate])

  /* -------------------- チーム切替 -------------------- */

  const handleChangeTeam = async (teamId: string) => {
    if (isRestrictedUser) return

    const nextTeam = teams.find((t) => t.id === teamId)
    if (!nextTeam) return

    try {
      setIsLoading(true)
      setActiveTeamId(teamId)

      const playerRows = await fetchPlayers(
        Number(teamId),
        nextTeam.currentSeasonYear
      )

      const visiblePlayers = sortPlayersByJersey(
        playerRows
          .map(mapPlayerRow)
          .filter((p) => !p.isArchived)
      )

      setPlayers(visiblePlayers)
      setActivePlayerId(visiblePlayers[0]?.id ?? "")

      try {
        const { batting, pitching } = await loadTeamEntries(
          teamId,
          nextTeam.currentSeasonYear
        )
        setSavedEntriesByPlayer(batting)
        setPitchingEntriesByPlayer(pitching)
      } catch (statsError) {
        console.error(statsError)
        setSavedEntriesByPlayer({})
        setPitchingEntriesByPlayer({})
      }
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? `Failed to switch team: ${error.message}`
          : "Failed to switch team"
      )
    } finally {
      setIsLoading(false)
    }
  }

  /* -------------------- リフレッシュ -------------------- */

  const handleRefresh = async () => {
    if (!activeTeam) return
    try {
      setIsLoading(true)
      const { batting, pitching } = await loadTeamEntries(
        activeTeam.id,
        activeTeam.currentSeasonYear
      )
      setSavedEntriesByPlayer(batting)
      setPitchingEntriesByPlayer(pitching)
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  /* -------------------- UI -------------------- */

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Header
        teamName={activeTeam?.name ?? "No Team"}
        teams={teams.map((t) => t.name)}
        onChangeTeam={(teamName) => {
          const team = teams.find((t) => t.name === teamName)
          if (team) handleChangeTeam(team.id)
        }}
      />

      <TopTabs
        activeView={view}
        onChangeView={(v) => setView(v as "stats" | "myteam")}
        tabs={tabs}
      />

      {view === "stats" && (
        <div className="flex w-full gap-2 px-3 pt-3 sm:w-auto sm:px-4">
          <button
            onClick={() => setMode("batting")}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4 ${
              mode === "batting"
                ? "bg-green-900 text-white shadow-sm"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Batting
          </button>

          <button
            onClick={() => setMode("pitching")}
            className={`min-w-0 flex-1 truncate rounded-lg px-3 py-2 text-sm font-semibold transition sm:flex-none sm:px-4 ${
              mode === "pitching"
                ? "bg-green-900 text-white shadow-sm"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Pitching
          </button>

          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-40"
            aria-label="Refresh stats"
          >
            ↻
          </button>
        </div>
      )}

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:p-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : errorMessage ? (
          <div className="text-red-600">{errorMessage}</div>
        ) : view === "myteam" ? (
          <MyTeamPage
            team={activeTeam}
            players={players}
            savedEntriesByPlayer={savedEntriesByPlayer}
            pitchingEntriesByPlayer={pitchingEntriesByPlayer}
          />
        ) : activePlayer ? (
          <>
            <Sidebar
              players={players}
              activePlayerId={activePlayer.id}
              setActivePlayerId={setActivePlayerId}
              savedEntriesByPlayer={savedEntriesByPlayer}
              pitchingEntriesByPlayer={pitchingEntriesByPlayer}
              mode={mode}
            />

            <div className="flex-1">
              {mode === "batting" ? (
                <MyStatsPage
                  activePlayer={activePlayer}
                  calculatedStats={calculatedStats}
                  savedEntries={savedEntries}
                  pitchingEntries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
                  teamSavedEntries={allTeamEntries}
                  gamesPlayed={kpi.gamesPlayed}
                  seasonYear={activeTeam?.currentSeasonYear ?? 0}
                />
              ) : (
                <MyPitchingStatsPage
                  activePlayer={activePlayer}
                  entries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
                  battingEntries={savedEntries}
                />
              )}
            </div>
          </>
        ) : (
          <div>No player found</div>
        )}
      </div>
    </div>
  )
}
