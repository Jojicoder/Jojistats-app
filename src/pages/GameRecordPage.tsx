import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import {
  fetchGamesBySeason,
  fetchPlayers,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
  fetchTeamById,
  fetchUserAccessByEmail,
} from "../api/supabase-api"
import {
  createFullGame,
  deleteBattingStatEntry,
  deleteGame,
  deletePitchingStatEntry,
  updateBattingStatEntry,
  updateFullGame,
  updateGameInfo,
  updatePitchingStatEntry,
} from "../api/api"

import RecordGamePage from "../components/RecordGamePage"

import type {
  Player,
  DraftGameMeta,
  BattingEntryData,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
} from "../types"
import type { GameRow } from "../api/supabase-api"

const OFFLINE_CACHE_KEY = "jojistats-game-cache"
const OFFLINE_QUEUE_KEY = "jojistats-game-queue"

const emptyBattingEntry: BattingEntryData = {
  AB: 0,
  H: 0,
  doubles: 0,
  triples: 0,
  HR: 0,
  RBI: 0,
  BB: 0,
  HBP: 0,
  SF: 0,
  SO: 0,
  note: "",
}

const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walks: 0,
  hitBatters: 0,
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

function getNextMatchNumber(games: GameRow[]) {
  const maxMatchNumber = games.reduce(
    (max, game) => Math.max(max, Number(game.match_number) || 0),
    0
  )

  return maxMatchNumber + 1
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
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState<Record<string, SavedPitchingGameEntry[]>>({})
  const [seasonGames, setSeasonGames] = useState<GameRow[]>([])
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)
  const [editingSavedPitchingEntry, setEditingSavedPitchingEntry] =
    useState<SavedPitchingGameEntry | null>(null)

  const [recordMode, setRecordMode] = useState<"batting" | "pitching">(
    "batting"
  )
  const teamSavedEntries = Object.values(savedEntriesByPlayer).flat()
  const teamSavedPitchingEntries = Object.values(pitchingEntriesByPlayer).flat()
  const savedPitchingEntries = activePlayer
    ? pitchingEntriesByPlayer[activePlayer.id] ?? []
    : []

  const [pitchingEntry, setPitchingEntry] =
    useState<PitchingEntryData>(emptyPitchingEntry)

  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueueSize, setOfflineQueueSize] = useState(() => {
    try { return (JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]") as unknown[]).length } catch { return 0 }
  })

  useEffect(() => {
    const checkUser = async () => {
      try {
        if (!navigator.onLine) {
          const { data: sessionData } = await supabase.auth.getSession()
          if (!sessionData.session) { navigate("/login", { replace: true }); return }
          let cached: null | {
            team: { id: number; name: string; current_season_year: number }
            players: Player[]
            savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
            preferredPlayerId?: string
          } = null
          try { cached = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) ?? "null") } catch { /* ignore */ }
          if (!cached) {
            setAccessError("You're offline and no local cache was found. Please launch the app online first.")
            return
          }
          const preferred = cached.preferredPlayerId
          const first = (preferred && cached.players.find((p) => p.id === preferred)) ?? cached.players[0]
          if (!first) { setAccessError("No player data found in cache."); return }
          setTeamName(cached.team.name)
          setTeamId(cached.team.id)
          setSeasonYear(cached.team.current_season_year)
          setAllPlayers(cached.players)
          setActivePlayer(first)
          setGameMeta((prev) => ({ ...prev, seasonYear: cached!.team.current_season_year }))
          setSavedEntriesByPlayer(cached.savedEntriesByPlayer)
          setSavedEntries(cached.savedEntriesByPlayer[first.id] ?? [])
          return
        }

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

    const [entries, pitchingEntries, games] = await Promise.all([
      fetchSavedEntriesByPlayer(team.id, team.current_season_year),
      fetchPitchingEntriesByPlayer(team.id, team.current_season_year),
      fetchGamesBySeason(team.id, team.current_season_year),
    ])
    setSavedEntriesByPlayer(entries)
    setPitchingEntriesByPlayer(pitchingEntries)
    setSavedEntries(entries[first.id] ?? [])
    setSeasonGames(games)
    setGameMeta((prev) => ({
      ...prev,
      seasonYear: team.current_season_year,
      matchNumber: getNextMatchNumber(games),
    }))

    try {
      localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify({
        team,
        players: mapped,
        savedEntriesByPlayer: entries,
        preferredPlayerId: first.id,
      }))
    } catch { /* storage full — skip */ }
  }

  const flushOfflineQueue = async (currentTeamId: number, currentSeasonYear: number, currentPlayerId: string) => {
    let queue: { payload: Parameters<typeof createFullGame>[0] }[] = []
    try { queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]") } catch { return }
    if (queue.length === 0) return
    for (const item of queue) {
      try { await createFullGame(item.payload) } catch { return }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY)
    setOfflineQueueSize(0)
    const refreshed = await fetchSavedEntriesByPlayer(currentTeamId, currentSeasonYear)
    setSavedEntriesByPlayer(refreshed)
    setSavedEntries(refreshed[currentPlayerId] ?? [])
  }

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      if (teamId != null && activePlayer) {
        flushOfflineQueue(teamId, seasonYear, activePlayer.id)
      }
    }
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [teamId, seasonYear, activePlayer])

  const handleSelectPlayer = async (player: Player) => {
    if (player.id === activePlayer?.id) return
    setActivePlayer(player)
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

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
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
          game_positions: entry.gamePositions,
          ab: entry.AB,
          h: entry.H,
          double_hits: entry.doubles,
          triple_hits: entry.triples,
          hr: entry.HR,
          rbi: entry.RBI,
          bb: entry.BB,
          hbp: entry.HBP,
          sf: entry.SF,
          so: entry.SO,
        })),
        pitchingStats: pitchingEntries.map((entry) => ({
          player_id: Number(entry.playerId),
          innings_pitched_outs: entry.inningsPitchedOuts,
          hits_allowed: entry.hitsAllowed,
          runs_allowed: entry.runsAllowed,
          earned_runs: entry.earnedRuns,
          walks: entry.walks,
          hbp: entry.hitBatters,
          strikeouts: entry.strikeouts,
          home_runs_allowed: entry.homeRunsAllowed,
        })),
      }

      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else if (!navigator.onLine) {
        const queue: { payload: typeof payload }[] = []
        try { queue.push(...JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]")) } catch { /* ignore */ }
        queue.push({ payload })
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
        setOfflineQueueSize(queue.length)
        return
      } else {
        await createFullGame(payload)
      }

      if (teamId != null) {
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchPitchingEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchGamesBySeason(teamId, nextGameMeta.seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
        setGameMeta((prev) => ({
          ...prev,
          matchNumber: getNextMatchNumber(refreshedGames),
        }))
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
          game_positions: editingSavedEntry.gamePositions,
          ab: nextStatLine.AB,
          h: nextStatLine.H,
          double_hits: nextStatLine.doubles,
          triple_hits: nextStatLine.triples,
          hr: nextStatLine.HR,
          rbi: nextStatLine.RBI,
          bb: nextStatLine.BB,
          hbp: nextStatLine.HBP,
          sf: nextStatLine.SF,
          so: nextStatLine.SO,
        },
      })

      if (teamId != null) {
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchPitchingEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchGamesBySeason(teamId, nextGameMeta.seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
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
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchPitchingEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchGamesBySeason(teamId, nextGameMeta.seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
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
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, seasonYear),
          fetchPitchingEntriesByPlayer(teamId, seasonYear),
          fetchGamesBySeason(teamId, seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
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

  const handleDeleteSavedGame = async () => {
    if (!activePlayer || !editingSavedEntry) return
    if (!window.confirm("Delete this entire game? This cannot be undone.")) return

    setSaveError("")
    try {
      await deleteGame(editingSavedEntry.gameId)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
      if (teamId != null) {
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, seasonYear),
          fetchPitchingEntriesByPlayer(teamId, seasonYear),
          fetchGamesBySeason(teamId, seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
        setGameMeta((prev) => ({
          ...prev,
          matchNumber: getNextMatchNumber(refreshedGames),
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleStartEditSavedPitchingEntry = (savedEntry: SavedPitchingGameEntry) => {
    setEditingSavedPitchingEntry(savedEntry)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setGameMeta(savedEntry.gameMeta)
    setPitchingEntry(savedEntry.statLine)
    setRecordMode("pitching")
  }

  const handleUpdateSavedPitchingEntry = async (
    nextGameMeta: DraftGameMeta,
    nextPitchingEntry: PitchingEntryData
  ) => {
    if (!activePlayer || !editingSavedPitchingEntry) return

    setSaveError("")
    try {
      await updatePitchingStatEntry(
        editingSavedPitchingEntry.statId,
        editingSavedPitchingEntry.gameId,
        {
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
          pitchingStat: {
            player_id: Number(editingSavedPitchingEntry.playerId),
            innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
            hits_allowed: nextPitchingEntry.hitsAllowed,
            runs_allowed: nextPitchingEntry.runsAllowed,
            earned_runs: nextPitchingEntry.earnedRuns,
            walks: nextPitchingEntry.walks,
            hbp: nextPitchingEntry.hitBatters,
            strikeouts: nextPitchingEntry.strikeouts,
            home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
          },
        }
      )

      if (teamId != null) {
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchPitchingEntriesByPlayer(teamId, nextGameMeta.seasonYear),
          fetchGamesBySeason(teamId, nextGameMeta.seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
      }

      setEditingSavedPitchingEntry(null)
      setPitchingEntry(emptyPitchingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching update failed"
      setSaveError(message)
      throw err
    }
  }

  const handleCancelEditSavedPitchingEntry = () => {
    setEditingSavedPitchingEntry(null)
    setPitchingEntry(emptyPitchingEntry)
  }

  const handleDeleteSavedPitchingEntry = async (savedEntry: SavedPitchingGameEntry) => {
    if (!activePlayer) return
    if (!window.confirm("Delete this pitching entry?")) return

    setSaveError("")
    try {
      await deletePitchingStatEntry(savedEntry.statId, savedEntry.gameId)
      if (teamId != null) {
        const [refreshed, refreshedPitching, refreshedGames] = await Promise.all([
          fetchSavedEntriesByPlayer(teamId, seasonYear),
          fetchPitchingEntriesByPlayer(teamId, seasonYear),
          fetchGamesBySeason(teamId, seasonYear),
        ])
        setSavedEntriesByPlayer(refreshed)
        setPitchingEntriesByPlayer(refreshedPitching)
        setSavedEntries(refreshed[activePlayer.id] ?? [])
        setSeasonGames(refreshedGames)
      }
      if (editingSavedPitchingEntry?.id === savedEntry.id) {
        setEditingSavedPitchingEntry(null)
        setPitchingEntry(emptyPitchingEntry)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Pitching delete failed"
      setSaveError(message)
      window.alert(`Pitching delete failed: ${message}`)
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
          hbp: nextPitchingEntry.hitBatters,
          strikeouts: nextPitchingEntry.strikeouts,
          home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
        },
      ],
    })

    setPitchingEntry(emptyPitchingEntry)

    if (teamId != null) {
      const [refreshedPitching, refreshedGames] = await Promise.all([
        fetchPitchingEntriesByPlayer(teamId, gameMeta.seasonYear),
        fetchGamesBySeason(teamId, gameMeta.seasonYear),
      ])
      setPitchingEntriesByPlayer(refreshedPitching)
      setSeasonGames(refreshedGames)
      setGameMeta((prev) => ({
        ...prev,
        matchNumber: getNextMatchNumber(refreshedGames),
      }))
    } else {
      setGameMeta((prev) => ({
        ...prev,
        matchNumber: Math.max(prev.matchNumber + 1, getNextMatchNumber(seasonGames)),
      }))
    }
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
          onSaveGame={handleSaveGame}
          teamName={teamName}
          seasonYear={activePlayer.seasonYear}
          isEditingSavedEntry={editingSavedEntryId !== null}
          isEditingSavedPitchingEntry={editingSavedPitchingEntry !== null}
          editingSavedEntryId={editingSavedEntryId}
          onStartEditSavedEntry={handleStartEditSavedEntry}
          onUpdateSavedEntry={handleUpdateSavedEntry}
          onUpdateSavedGame={handleSaveGame}
          onUpdateSavedGameMeta={handleUpdateSavedGameMeta}
          onCancelEditSavedEntry={handleCancelEditSavedEntry}
          onDeleteSavedEntry={handleDeleteSavedEntry}
          onDeleteSavedGame={handleDeleteSavedGame}
          onStartEditSavedPitchingEntry={handleStartEditSavedPitchingEntry}
          onUpdateSavedPitchingEntry={handleUpdateSavedPitchingEntry}
          onCancelEditSavedPitchingEntry={handleCancelEditSavedPitchingEntry}
          onDeleteSavedPitchingEntry={handleDeleteSavedPitchingEntry}
          editingGamePositions={undefined}
          recordMode={recordMode}
          setRecordMode={setRecordMode}
          pitchingEntry={pitchingEntry}
          onPitchingEntryChange={setPitchingEntry}
          onSavePitchingGame={handleSavePitchingGame}
          isPitchingSaveDisabled={pitchingEntry.earnedRuns > pitchingEntry.runsAllowed}
          saveError={saveError}
          onClearSaveError={() => setSaveError("")}
        />
      </main>
    </div>
  )
}
