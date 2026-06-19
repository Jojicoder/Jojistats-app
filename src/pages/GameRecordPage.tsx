import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import { withAvatarCacheBust } from "../utils/avatar"
import {
  fetchGamesBySeason,
  fetchPlayers,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import RecordGamePage from "../components/RecordGamePage"
import {
  withLoadTimeout,
  readOfflineCache,
  writeOfflineCache,
  useOfflineGameCache,
} from "../hooks/useOfflineGameCache"
import type { TeamSnapshot } from "../hooks/useOfflineGameCache"
import { useGameRecordCRUD } from "../hooks/useGameRecordCRUD"

import type {
  Player,
  DraftGameMeta,
  BattingEntryData,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  PitchingEntryData,
} from "../types"
import type { GameRow } from "../api/supabase-api"

function getPreferredPlayer(players: Player[], preferredPlayerId?: string) {
  return (preferredPlayerId && players.find((p) => p.id === preferredPlayerId)) || players[0] || null
}

const emptyBattingEntry: BattingEntryData = {
  AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
  BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "",
}
const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0, note: "",
}

function mapPlayer(row: {
  id: number; team_id: number; name: string; position: string
  jersey_number: number | null; season_year: number; is_archived: boolean | number | null
}): Player {
  return {
    id: String(row.id), teamId: String(row.team_id), name: row.name,
    positions: [row.position as import("../types").Position],
    jerseyNumber: row.jersey_number, seasonYear: row.season_year,
    isArchived: Boolean(row.is_archived),
  }
}

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, game) => Math.max(max, Number(game.match_number) || 0), 0) + 1
}

export default function GameRecordPage() {
  const navigate = useNavigate()

  const [isLoading, setIsLoading] = useState(true)
  const [accessError, setAccessError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [saveSuccess, setSaveSuccess] = useState("")
  const [activePlayer, setActivePlayer] = useState<Player | null>(null)
  const [allPlayers, setAllPlayers] = useState<Player[]>([])
  const [teamName, setTeamName] = useState("")
  const [teamId, setTeamId] = useState<number | null>(null)
  const [seasonYear, setSeasonYear] = useState(new Date().getFullYear())
  const [avatarUrl, setAvatarUrl] = useState("")
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({ date: "", opponent: "", location: "", seasonYear: new Date().getFullYear(), matchNumber: 1 })
  const [currentEntry, setCurrentEntry] = useState<BattingEntryData>(emptyBattingEntry)
  const [savedEntries, setSavedEntries] = useState<SavedBattingGameEntry[]>([])
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState<Record<string, SavedBattingGameEntry[]>>({})
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<Record<string, SavedPitchingGameEntry[]>>({})
  const [seasonGames, setSeasonGames] = useState<GameRow[]>([])
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)
  const [preEditSnapshot, setPreEditSnapshot] = useState<{ gameMeta: DraftGameMeta; currentEntry: BattingEntryData } | null>(null)
  const [editingSavedPitchingEntry, setEditingSavedPitchingEntry] = useState<SavedPitchingGameEntry | null>(null)
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>(emptyPitchingEntry)

  const teamSavedEntries = useMemo(() => Object.values(savedEntriesByPlayer).flat(), [savedEntriesByPlayer])
  const teamSavedPitchingEntries = useMemo(() => Object.values(pitchingEntriesByPlayer).flat(), [pitchingEntriesByPlayer])
  const savedPitchingEntries = useMemo(
    () => (activePlayer ? pitchingEntriesByPlayer[activePlayer.id] : undefined) ?? [],
    [activePlayer, pitchingEntriesByPlayer]
  )

  const { isOnline, offlineQueueSize, enqueueOfflineGame, handleOnline, handleOffline } =
    useOfflineGameCache((refreshed, playerId) => {
      setSavedEntriesByPlayer(refreshed)
      setSavedEntries(refreshed[playerId] ?? [])
    })

  const crudHandlers = useGameRecordCRUD({
    activePlayer,
    allPlayers,
    teamId,
    seasonYear,
    gameMeta,
    pitchingEntry,
    editingSavedEntry,
    editingSavedEntryId,
    editingSavedPitchingEntry,
    preEditSnapshot,
    seasonGames,
    setSaveError,
    setSaveSuccess,
    setCurrentEntry,
    setPitchingEntry,
    setSavedEntriesByPlayer,
    setPitchingEntriesByPlayer,
    setSavedEntries,
    setSeasonGames,
    setGameMeta,
    setEditingSavedEntryId,
    setEditingSavedEntry,
    setEditingSavedPitchingEntry,
    setPreEditSnapshot,
    setRecordMode,
    enqueueOfflineGame,
  })

  const applyTeamShell = useCallback((team: TeamSnapshot, mappedPlayers: Player[], firstPlayer: Player) => {
    setTeamName(team.name)
    setTeamId(team.id)
    setSeasonYear(team.current_season_year)
    setAllPlayers(mappedPlayers)
    setActivePlayer(firstPlayer)
    setGameMeta((prev) => ({ ...prev, seasonYear: team.current_season_year }))
  }, [])

  const loadProfileAvatar = useCallback((userId: string) => {
    withLoadTimeout(supabase.from("profiles").select("avatar_url").eq("id", userId).maybeSingle(), "Profile load")
      .then(({ data: profile }) => setAvatarUrl(profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : ""))
      .catch((error) => console.error(error))
  }, [])

  const loadSeasonDataInBackground = useCallback((team: TeamSnapshot, mappedPlayers: Player[], firstPlayer: Player) => {
    withLoadTimeout(
      Promise.all([
        fetchSavedEntriesByPlayer(team.id, team.current_season_year),
        fetchPitchingEntriesByPlayer(team.id, team.current_season_year),
        fetchGamesBySeason(team.id, team.current_season_year),
      ]),
      "Game data load"
    )
      .then(([entries, pitchingEntries, games]) => {
        setSavedEntriesByPlayer(entries)
        setPitchingEntriesByPlayer(pitchingEntries)
        setSavedEntries(entries[firstPlayer.id] ?? [])
        setSeasonGames(games)
        setGameMeta((prev) => ({ ...prev, seasonYear: team.current_season_year, matchNumber: getNextMatchNumber(games) }))
        writeOfflineCache({ team, players: mappedPlayers, savedEntriesByPlayer: entries, preferredPlayerId: firstPlayer.id })
      })
      .catch((error) => {
        console.error(error)
        setSaveError(error instanceof Error ? error.message : "Saved game data could not be loaded.")
      })
  }, [])

  const loadTeam = useCallback(async (team: TeamSnapshot, preferredPlayerId?: string) => {
    const playerRows = await withLoadTimeout(fetchPlayers(team.id, team.current_season_year), "Players load")
    const mapped = playerRows.map(mapPlayer).filter((p) => !p.isArchived)
    const first = getPreferredPlayer(mapped, preferredPlayerId)
    if (!first) { setAccessError("No players found for this season."); return }
    applyTeamShell(team, mapped, first)
    loadSeasonDataInBackground(team, mapped, first)
  }, [applyTeamShell, loadSeasonDataInBackground])

  useEffect(() => {
    const checkUser = async () => {
      try {
        if (!navigator.onLine) {
          const { data: sessionData } = await supabase.auth.getSession()
          if (!sessionData.session) { navigate("/login", { replace: true }); return }
          const cached = readOfflineCache()
          if (!cached) { setAccessError("You're offline and no local cache was found. Please launch the app online first."); return }
          const first = getPreferredPlayer(cached.players, cached.preferredPlayerId)
          if (!first) { setAccessError("No player data found in cache."); return }
          applyTeamShell(cached.team, cached.players, first)
          setSavedEntriesByPlayer(cached.savedEntriesByPlayer)
          setSavedEntries(cached.savedEntriesByPlayer[first.id] ?? [])
          return
        }
        const { data } = await withLoadTimeout(supabase.auth.getUser(), "Auth check")
        if (!data.user) { navigate("/login", { replace: true }); return }
        const email = data.user.email?.trim().toLowerCase()
        if (!email) { setAccessError("No email address found for this account."); return }
        if (email === "admin@jojistats.com") { navigate("/admin", { replace: true }); return }
        loadProfileAvatar(data.user.id)
        const access = await withLoadTimeout(fetchUserAccessByEmail(email), "User access load")
        if (!access || (access.role !== "recorder" && access.role !== "manager")) { setAccessError("No GameRecord access has been assigned."); return }
        const team = await withLoadTimeout(fetchTeamById(access.team_id), "Team load")
        await loadTeam(team, String(access.player_id))
      } catch (error) {
        console.error(error)
        setAccessError(error instanceof Error ? `Failed to load: ${error.message}` : "Failed to load GameRecord access.")
      } finally {
        setIsLoading(false)
      }
    }
    checkUser()
  }, [applyTeamShell, loadProfileAvatar, loadTeam, navigate])

  useEffect(() => {
    const onOnline = () => handleOnline(teamId, seasonYear, activePlayer?.id ?? "")
    window.addEventListener("online", onOnline)
    window.addEventListener("offline", handleOffline)
    return () => { window.removeEventListener("online", onOnline); window.removeEventListener("offline", handleOffline) }
  }, [teamId, seasonYear, activePlayer, handleOnline, handleOffline])

  const handleSelectPlayer = async (player: Player) => {
    if (player.id === activePlayer?.id) return
    setActivePlayer(player)
    setGameMeta(preEditSnapshot?.gameMeta ?? { date: "", opponent: "", location: "", seasonYear, matchNumber: gameMeta.matchNumber })
    setPreEditSnapshot(null)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setEditingSavedPitchingEntry(null)
    setCurrentEntry(emptyBattingEntry)
    setPitchingEntry(emptyPitchingEntry)
    setSaveError("")
    setRecordMode("batting")
    if (teamId == null) return
    const [refreshed, refreshedPitching] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, seasonYear),
      fetchPitchingEntriesByPlayer(teamId, seasonYear),
    ])
    setSavedEntriesByPlayer(refreshed)
    setPitchingEntriesByPlayer(refreshedPitching)
    setSavedEntries(refreshed[player.id] ?? [])
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  if (isLoading) return <div className="flex flex-1 bg-gray-50 p-6 text-gray-600">Checking auth...</div>

  if (accessError || !activePlayer) {
    return (
      <div className="flex flex-1 flex-col bg-gray-50">
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
    <div className="flex flex-1 flex-col bg-gray-50">
      {!isOnline && (
        <div className="flex items-center justify-between bg-amber-500 px-4 py-2 text-sm font-medium text-white">
          <span>Offline{offlineQueueSize > 0 ? ` — ${offlineQueueSize} game(s) pending sync` : ""}</span>
          <span className="text-xs opacity-80">Will sync automatically when back online</span>
        </div>
      )}
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

      {saveSuccess && (
        <div className="fixed bottom-5 right-5 z-50 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-800 shadow-lg">
          {saveSuccess}
        </div>
      )}

      <main className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
        <RecordGamePage
          activePlayer={activePlayer}
          allPlayers={allPlayers}
          onSelectPlayer={handleSelectPlayer}
          currentEntry={currentEntry}
          gameMeta={gameMeta}
          savedEntries={savedEntries}
          savedPitchingEntries={savedPitchingEntries}
          teamSavedEntries={teamSavedEntries}
          teamSavedPitchingEntries={teamSavedPitchingEntries}
          savedGames={seasonGames}
          onGameMetaChange={setGameMeta}
          onEntryChange={setCurrentEntry}
          onSaveGame={crudHandlers.handleSaveGame}
          teamName={teamName}
          seasonYear={activePlayer.seasonYear}
          isEditingSavedEntry={editingSavedEntryId !== null}
          isEditingSavedPitchingEntry={editingSavedPitchingEntry !== null}
          editingSavedEntryId={editingSavedEntryId}
          onStartEditSavedEntry={crudHandlers.handleStartEditSavedEntry}
          onUpdateSavedEntry={crudHandlers.handleUpdateSavedEntry}
          onUpdateSavedGame={crudHandlers.handleSaveGame}
          onUpdateSavedGameMeta={crudHandlers.handleUpdateSavedGameMeta}
          onCancelEditSavedEntry={crudHandlers.handleCancelEditSavedEntry}
          onDeleteSavedEntry={crudHandlers.handleDeleteSavedEntry}
          onDeleteSavedGame={crudHandlers.handleDeleteSavedGame}
          onStartEditSavedPitchingEntry={crudHandlers.handleStartEditSavedPitchingEntry}
          onUpdateSavedPitchingEntry={crudHandlers.handleUpdateSavedPitchingEntry}
          onCancelEditSavedPitchingEntry={crudHandlers.handleCancelEditSavedPitchingEntry}
          onDeleteSavedPitchingEntry={crudHandlers.handleDeleteSavedPitchingEntry}
          editingGamePositions={editingSavedEntry?.gamePositions}
          recordMode={recordMode}
          setRecordMode={setRecordMode}
          pitchingEntry={pitchingEntry}
          onPitchingEntryChange={setPitchingEntry}
          onSavePitchingGame={crudHandlers.handleSavePitchingGame}
          isPitchingSaveDisabled={
            !gameMeta.date.trim() || !gameMeta.opponent.trim() ||
            pitchingEntry.earnedRuns > pitchingEntry.runsAllowed
          }
          saveError={saveError}
          saveSuccess={saveSuccess}
          onClearSaveError={() => setSaveError("")}
          onNewGame={crudHandlers.handleNewGame}
        />
      </main>
    </div>
  )
}
