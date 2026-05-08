import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import {
  fetchPlayers,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import { createFullGame, deleteBattingStatEntry, updateBattingStatEntry, updateFullGame, updateGameInfo } from "../api/api"

import RecordGamePage from "../components/RecordGamePage"

import type {
  Player,
  DraftGameMeta,
  BattingEntryData,
  SavedBattingGameEntry,
  PendingBattingEntry,
  PitchingEntryData,
} from "../types"

const emptyBattingEntry: BattingEntryData = {
  AB: 0,
  H: 0,
  doubles: 0,
  triples: 0,
  HR: 0,
  RBI: 0,
  BB: 0,
  HBP: 0,
  SO: 0,
  note: "",
}

const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walks: 0,
  strikeouts: 0,
  homeRunsAllowed: 0,
}

function mapPlayer(row: {
  id: number
  team_id: number
  name: string
  position: string
  jersey_number: number | null
  season_year: number
  is_archived: boolean | number | null
}): Player {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    name: row.name,
    position: row.position as Player["position"],
    jerseyNumber: row.jersey_number,
    seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
  }
}

export default function GameRecordPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState("")
  const [teamId, setTeamId] = useState<number | null>(null)
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())
  const [avatarUrl, setAvatarUrl] = useState("")

  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: "",
    opponent: "",
    location: "",
    seasonYear: new Date().getFullYear(),
    matchNumber: 1,
  })

  const [currentEntry, setCurrentEntry] =
    useState<BattingEntryData>(emptyBattingEntry)

  const [savedEntries, setSavedEntries] = useState<SavedBattingGameEntry[]>([])
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)

  const [recordMode, setRecordMode] = useState<"batting" | "pitching">(
    "batting"
  )
  const teamSavedEntries = Object.values(savedEntriesByPlayer).flat()

  const [pitchingEntry, setPitchingEntry] =
    useState<PitchingEntryData>(emptyPitchingEntry)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data } = await supabase.auth.getUser()

        if (!data.user) {
          navigate("/login", { replace: true })
          return
        }

        const email = data.user.email?.trim().toLowerCase()
        if (!email) {
          setAccessError("No email address found for this account.")
          return
        }

        const isAdmin = email === "admin@jojistats.com"

        if (isAdmin) {
          navigate("/admin", { replace: true })
          return
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .maybeSingle()
        setAvatarUrl(profile?.avatar_url ?? "")

        const access = await fetchUserAccessByEmail(email)
        if (!access || access.role !== "recorder") {
          setAccessError("No GameRecord access has been assigned.")
          return
        }

        const team = await fetchTeamById(access.team_id)
        await loadTeam(team, String(access.player_id))
      } catch (error) {
        console.error(error)
        setAccessError(
          error instanceof Error
            ? `Failed to load: ${error.message}`
            : "Failed to load GameRecord access."
        )
      } finally {
        setIsLoading(false)
      }
    }

    checkUser()
  }, [navigate])

  const loadTeam = async (
    team: { id: number; name: string; current_season_year: number },
    preferredPlayerId?: string
  ) => {
    const playerRows = await fetchPlayers(team.id, team.current_season_year)
    const mapped = playerRows.map(mapPlayer).filter((p) => !p.isArchived)
    const first = (preferredPlayerId && mapped.find((p) => p.id === preferredPlayerId)) ?? mapped[0]
    if (!first) { setAccessError("No players found for this season."); return }

    setTeamName(team.name)
    setTeamId(team.id)
    setSeasonYear(team.current_season_year)
    setAllPlayers(mapped)
    setActivePlayer(first)
    setGameMeta((prev) => ({ ...prev, seasonYear: team.current_season_year }))

    const entries = await fetchSavedEntriesByPlayer(team.id, team.current_season_year)
    setSavedEntriesByPlayer(entries)
    setSavedEntries(entries[first.id] ?? [])
  }

  const handleSelectPlayer = async (player: Player) => {
    if (player.id === activePlayer?.id) return
    setActivePlayer(player)
    if (teamId == null) return
    const refreshed = await fetchSavedEntriesByPlayer(teamId, seasonYear)
    setSavedEntriesByPlayer(refreshed)
    setSavedEntries(refreshed[player.id] ?? [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => {
    if (!activePlayer) return

    setSaveError("")
    try {
      const payload = {
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: nextGameMeta.date,
          opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear,
          match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null,
          opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        battingStats: entries.map((entry, index) => ({
          player_id: Number(entry.playerId),
          batting_order: index + 1,
          ab: entry.AB,
          h: entry.H,
          double_hits: entry.doubles,
          triple_hits: entry.triples,
          hr: entry.HR,
          rbi: entry.RBI,
          bb: entry.BB,
          hbp: entry.HBP,
          so: entry.SO,
        })),
        pitchingStats: [],
      }

      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }

      if (teamId != null) {
        const refreshed = await fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear)
        setSavedEntriesByPlayer(refreshed)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
      }
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      setSaveError(message)
      throw err
    }
  }

  const handleStartEditSavedEntry = (savedEntry: SavedBattingGameEntry) => {
    setEditingSavedEntryId(savedEntry.id)
    setEditingSavedEntry(savedEntry)
    setGameMeta(savedEntry.gameMeta)
    setCurrentEntry(savedEntry.statLine)
  }

  const handleUpdateSavedEntry = async (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => {
    if (!activePlayer || !editingSavedEntry) return

    setSaveError("")
    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: {
          team_id: Number(activePlayer.teamId),
          game_date: nextGameMeta.date,
          opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear,
          match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null,
          opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        battingStat: {
          player_id: Number(editingSavedEntry.playerId),
          batting_order: 1,
          ab: nextStatLine.AB,
          h: nextStatLine.H,
          double_hits: nextStatLine.doubles,
          triple_hits: nextStatLine.triples,
          hr: nextStatLine.HR,
          rbi: nextStatLine.RBI,
          bb: nextStatLine.BB,
          hbp: nextStatLine.HBP,
          so: nextStatLine.SO,
        },
      })

      if (teamId != null) {
        const refreshed = await fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear)
        setSavedEntriesByPlayer(refreshed)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
      }
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleUpdateSavedGameMeta = async (nextGameMeta: DraftGameMeta) => {
    if (!activePlayer || !editingSavedEntry) return

    setSaveError("")
    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        team_id: Number(activePlayer.teamId),
        game_date: nextGameMeta.date,
        opponent_name: nextGameMeta.opponent,
        season_year: nextGameMeta.seasonYear,
        match_number: nextGameMeta.matchNumber,
        location: nextGameMeta.location?.trim() || null,
        ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
        team_score: nextGameMeta.teamScore ?? null,
        opponent_score: nextGameMeta.opponentScore ?? null,
        result: nextGameMeta.result || null,
      })

      if (teamId != null) {
        const refreshed = await fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear)
        setSavedEntriesByPlayer(refreshed)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
      }
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleCancelEditSavedEntry = () => {
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setCurrentEntry(emptyBattingEntry)
  }

  const handleDeleteSavedEntry = async (savedEntry: SavedBattingGameEntry) => {
    if (!activePlayer) return
    if (!window.confirm("Delete this saved entry?")) return

    setSaveError("")
    try {
      await deleteBattingStatEntry(savedEntry.statId, savedEntry.gameId)
      if (teamId != null && activePlayer) {
        const refreshed = await fetchSavedEntriesByPlayer(teamId, seasonYear)
        setSavedEntriesByPlayer(refreshed)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
      }
      if (editingSavedEntryId === savedEntry.id) {
        setEditingSavedEntryId(null)
        setEditingSavedEntry(null)
        setCurrentEntry(emptyBattingEntry)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleSavePitchingGame = async (
    nextPitchingEntry = pitchingEntry,
    pitcherId = activePlayer?.id
  ) => {
    if (!activePlayer) return

    await createFullGame({
      game: {
        team_id: Number(activePlayer.teamId),
        game_date: gameMeta.date,
        opponent_name: gameMeta.opponent,
        season_year: gameMeta.seasonYear,
        match_number: gameMeta.matchNumber,
        location: gameMeta.location?.trim() || null,
        ...(gameMeta.memo !== undefined ? { memo: gameMeta.memo.trim() || null } : {}),
        team_score: gameMeta.teamScore ?? null,
        opponent_score: gameMeta.opponentScore ?? null,
        result: gameMeta.result || null,
      },
      battingStats: [],
      pitchingStats: [
        {
          player_id: Number(pitcherId),
          innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
          hits_allowed: nextPitchingEntry.hitsAllowed,
          runs_allowed: nextPitchingEntry.runsAllowed,
          earned_runs: nextPitchingEntry.earnedRuns,
          walks: nextPitchingEntry.walks,
          strikeouts: nextPitchingEntry.strikeouts,
          home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
        },
      ],
    })

    setPitchingEntry(emptyPitchingEntry)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 text-gray-600">
        Checking auth...
      </div>
    )
  }

  if (accessError || !activePlayer) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="border-b border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
          <div className="flex w-full items-center justify-between gap-3 sm:gap-4">
            <Link to="/stats" className="flex min-w-0 items-center gap-2 sm:gap-3">
              <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-12 sm:w-12" />
              <p className="truncate text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">Joji Stats</p>
            </Link>
            <button type="button" onClick={handleLogout} className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800">Logout</button>
          </div>
        </header>
        <main className="mx-auto max-w-2xl px-4 py-10">
          <div className="rounded-2xl bg-white p-6 text-gray-700 shadow-sm">
            <p>{accessError || "No GameRecord access has been assigned."}</p>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-4">
        <div className="flex w-full flex-wrap items-center justify-between gap-3 sm:flex-nowrap sm:gap-4">
          <Link to="/stats" className="flex min-w-0 items-center gap-2 sm:gap-3">
            <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-12 sm:w-12" />
            <p className="truncate text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">Joji Stats</p>
          </Link>
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <Link to="/stats" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50">Stats</Link>
            <button type="button" onClick={handleLogout} className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800">Logout</button>
            <button type="button" onClick={() => navigate("/profile")} className="h-9 w-9 overflow-hidden rounded-full border border-gray-200 sm:h-10 sm:w-10" aria-label="Open profile">
              <img src={avatarUrl || "/logo.png"} alt="avatar" className="h-full w-full object-cover" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <RecordGamePage
          activePlayer={activePlayer}
          allPlayers={allPlayers}
          onSelectPlayer={handleSelectPlayer}
          currentEntry={currentEntry}
          gameMeta={gameMeta}
          savedEntries={savedEntries}
          teamSavedEntries={teamSavedEntries}
          onGameMetaChange={setGameMeta}
          onEntryChange={setCurrentEntry}
          onSaveGame={handleSaveGame}
          teamName={teamName}
          seasonYear={activePlayer.seasonYear}
          isEditingSavedEntry={editingSavedEntryId !== null}
          editingSavedEntryId={editingSavedEntryId}
          onStartEditSavedEntry={handleStartEditSavedEntry}
          onUpdateSavedEntry={handleUpdateSavedEntry}
          onUpdateSavedGameMeta={handleUpdateSavedGameMeta}
          onCancelEditSavedEntry={handleCancelEditSavedEntry}
          onDeleteSavedEntry={handleDeleteSavedEntry}
          editingGamePositions={undefined}
          recordMode={recordMode}
          setRecordMode={setRecordMode}
          pitchingEntry={pitchingEntry}
          onPitchingEntryChange={setPitchingEntry}
          onSavePitchingGame={handleSavePitchingGame}
          isPitchingSaveDisabled={false}
          saveError={saveError}
          onClearSaveError={() => setSaveError("")}
        />
      </main>
    </div>
  )
}
