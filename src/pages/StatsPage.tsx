import { useEffect, useMemo, useState } from "react"
import Header from "../components/Header"
import Sidebar from "../components/Sidebar"

import {
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchTeams,
  fetchPitchingEntriesByPlayer,
} from "../api/supabase-api"

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

/* -------------------- main -------------------- */

export default function StatsPage() {
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
  ]

  /* -------------------- 初期ロード -------------------- */

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")

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

        const batting = await fetchSavedEntriesByPlayer(
          Number(firstTeam.id),
          firstTeam.currentSeasonYear
        )
        setSavedEntriesByPlayer(batting)

        const pitching = await fetchPitchingEntriesByPlayer(
          Number(firstTeam.id),
          firstTeam.currentSeasonYear
        )
        setPitchingEntriesByPlayer(pitching)
      } catch (error) {
        console.error(error)
        setErrorMessage("Failed to load stats.")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  /* -------------------- チーム切替 -------------------- */

  const handleChangeTeam = async (teamId: string) => {
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

      const batting = await fetchSavedEntriesByPlayer(
        Number(teamId),
        nextTeam.currentSeasonYear
      )
      setSavedEntriesByPlayer(batting)

      const pitching = await fetchPitchingEntriesByPlayer(
        Number(teamId),
        nextTeam.currentSeasonYear
      )
      setPitchingEntriesByPlayer(pitching)
    } catch {
      setErrorMessage("Failed to switch team")
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
        isLoggedIn={false}
      />

     {/* Mode switch */}
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
</div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 lg:flex-row lg:p-4">
        {isLoading ? (
          <div>Loading...</div>
        ) : errorMessage ? (
          <div className="text-red-600">{errorMessage}</div>
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
                  teamSavedEntries={savedEntries}
                  gamesPlayed={kpi.gamesPlayed}
                  seasonYear={activeTeam?.currentSeasonYear ?? 0}
                />
              ) : (
                <MyPitchingStatsPage
                  activePlayer={activePlayer}
                  entries={
                    pitchingEntriesByPlayer[activePlayer.id] ?? []
                  }
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
