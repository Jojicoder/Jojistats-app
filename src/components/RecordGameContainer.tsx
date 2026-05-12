import { useEffect, useState } from "react"
import {
  fetchGamesBySeason,
  fetchPitchingEntriesByPlayer,
  fetchSavedEntriesByPlayer,
} from "../api/supabase-api"
import type { GameRow } from "../api/supabase-api"
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
import RecordGamePage from "./RecordGamePage"
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

const emptyBattingEntry: BattingEntryData = {
  AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, note: "",
}

const emptyPitchingEntry: PitchingEntryData = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0,
}

function getNextMatchNumber(games: GameRow[]) {
  return games.reduce((max, g) => Math.max(max, Number(g.match_number) || 0), 0) + 1
}

type Props = {
  initialPlayer: Player
  allPlayers: Player[]
  teamName: string
  teamId: number
  seasonYear: number
  initialSavedEntriesByPlayer?: Record<string, SavedBattingGameEntry[]>
  initialPitchingEntriesByPlayer?: Record<string, SavedPitchingGameEntry[]>
  showRosterPanel?: boolean
}

export default function RecordGameContainer({
  initialPlayer,
  allPlayers,
  teamName,
  teamId,
  seasonYear,
  initialSavedEntriesByPlayer = {},
  initialPitchingEntriesByPlayer = {},
  showRosterPanel = true,
}: Props) {
  const [activePlayer, setActivePlayer] = useState(initialPlayer)
  const [currentEntry, setCurrentEntry] = useState<BattingEntryData>(emptyBattingEntry)
  const [pitchingEntry, setPitchingEntry] = useState<PitchingEntryData>(emptyPitchingEntry)
  const [gameMeta, setGameMeta] = useState<DraftGameMeta>({
    date: "", opponent: "", location: "", seasonYear, matchNumber: 1,
  })
  const [savedEntriesByPlayer, setSavedEntriesByPlayer] = useState(initialSavedEntriesByPlayer)
  const [pitchingEntriesByPlayer, setPitchingEntriesByPlayer] = useState(initialPitchingEntriesByPlayer)
  const [seasonGames, setSeasonGames] = useState<GameRow[]>([])
  const [editingSavedEntryId, setEditingSavedEntryId] = useState<string | null>(null)
  const [editingSavedEntry, setEditingSavedEntry] = useState<SavedBattingGameEntry | null>(null)
  const [editingSavedPitchingEntry, setEditingSavedPitchingEntry] = useState<SavedPitchingGameEntry | null>(null)
  const [recordMode, setRecordMode] = useState<"batting" | "pitching">("batting")
  const [saveError, setSaveError] = useState("")

  const savedEntries = savedEntriesByPlayer[activePlayer.id] ?? []
  const savedPitchingEntries = pitchingEntriesByPlayer[activePlayer.id] ?? []
  const teamSavedEntries = Object.values(savedEntriesByPlayer).flat()
  const teamSavedPitchingEntries = Object.values(pitchingEntriesByPlayer).flat()

  useEffect(() => {
    fetchGamesBySeason(teamId, seasonYear)
      .then((games) => {
        setSeasonGames(games)
        setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
      })
      .catch(console.error)
  }, [teamId, seasonYear])

  const refreshAll = async (nextSeasonYear = seasonYear) => {
    const [batting, pitching, games] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, nextSeasonYear),
      fetchPitchingEntriesByPlayer(teamId, nextSeasonYear),
      fetchGamesBySeason(teamId, nextSeasonYear),
    ])
    setSavedEntriesByPlayer(batting)
    setPitchingEntriesByPlayer(pitching)
    setSeasonGames(games)
    return { batting, pitching, games }
  }

  const handleSelectPlayer = async (player: Player) => {
    if (player.id === activePlayer.id) return
    setActivePlayer(player)
    const [batting, pitching] = await Promise.all([
      fetchSavedEntriesByPlayer(teamId, seasonYear),
      fetchPitchingEntriesByPlayer(teamId, seasonYear),
    ])
    setSavedEntriesByPlayer(batting)
    setPitchingEntriesByPlayer(pitching)
  }

  const handleSaveGame = async (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries: PendingPitchingEntry[] = []
  ) => {
    setSaveError("")
    const payload = {
      game: {
        team_id: teamId,
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
      battingStats: entries.map((entry, i) => ({
        player_id: Number(entry.playerId),
        batting_order: i + 1,
        game_positions: entry.gamePositions,
        ab: entry.AB, h: entry.H, double_hits: entry.doubles, triple_hits: entry.triples,
        hr: entry.HR, rbi: entry.RBI, bb: entry.BB, hbp: entry.HBP, sf: entry.SF, so: entry.SO,
      })),
      pitchingStats: pitchingEntries.map((entry) => ({
        player_id: Number(entry.playerId),
        innings_pitched_outs: entry.inningsPitchedOuts, hits_allowed: entry.hitsAllowed,
        runs_allowed: entry.runsAllowed, earned_runs: entry.earnedRuns,
        walks: entry.walks, hbp: entry.hitBatters, strikeouts: entry.strikeouts,
        home_runs_allowed: entry.homeRunsAllowed,
      })),
    }

    try {
      if (editingSavedEntryId) {
        const gameId = editingSavedEntry?.gameId ?? Number(editingSavedEntryId.replace("db-", ""))
        await updateFullGame(gameId, payload)
      } else {
        await createFullGame(payload)
      }
      const { batting, games } = await refreshAll(nextGameMeta.seasonYear)
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
      setSavedEntriesByPlayer(batting)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Save failed"
      setSaveError(message)
      throw err
    }
  }

  const handleStartEditSavedEntry = (entry: SavedBattingGameEntry) => {
    setEditingSavedEntryId(entry.id)
    setEditingSavedEntry(entry)
    setGameMeta(entry.gameMeta)
    setCurrentEntry(entry.statLine)
  }

  const handleUpdateSavedEntry = async (nextGameMeta: DraftGameMeta, nextStatLine: BattingEntryData) => {
    if (!editingSavedEntry) return
    setSaveError("")
    try {
      await updateBattingStatEntry(editingSavedEntry.statId, editingSavedEntry.gameId, {
        game: {
          team_id: teamId,
          game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null, opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        battingStat: {
          player_id: Number(editingSavedEntry.playerId), batting_order: 1,
          game_positions: editingSavedEntry.gamePositions,
          ab: nextStatLine.AB, h: nextStatLine.H, double_hits: nextStatLine.doubles,
          triple_hits: nextStatLine.triples, hr: nextStatLine.HR, rbi: nextStatLine.RBI,
          bb: nextStatLine.BB, hbp: nextStatLine.HBP, sf: nextStatLine.SF, so: nextStatLine.SO,
        },
      })
      await refreshAll(nextGameMeta.seasonYear)
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
    if (!editingSavedEntry) return
    setSaveError("")
    try {
      await updateGameInfo(editingSavedEntry.gameId, {
        team_id: teamId,
        game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
        season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
        location: nextGameMeta.location?.trim() || null,
        ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
        team_score: nextGameMeta.teamScore ?? null, opponent_score: nextGameMeta.opponentScore ?? null,
        result: nextGameMeta.result || null,
      })
      await refreshAll(nextGameMeta.seasonYear)
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

  const handleDeleteSavedEntry = async (entry: SavedBattingGameEntry) => {
    if (!window.confirm("Delete this saved entry?")) return
    setSaveError("")
    try {
      await deleteBattingStatEntry(entry.statId, entry.gameId)
      const { games } = await refreshAll()
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
      if (editingSavedEntryId === entry.id) {
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
    if (!editingSavedEntry) return
    if (!window.confirm("Delete this entire game? This cannot be undone.")) return
    setSaveError("")
    try {
      await deleteGame(editingSavedEntry.gameId)
      setEditingSavedEntryId(null)
      setEditingSavedEntry(null)
      setCurrentEntry(emptyBattingEntry)
      const { games } = await refreshAll()
      setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Delete failed"
      setSaveError(message)
      window.alert(`Delete failed: ${message}`)
    }
  }

  const handleStartEditSavedPitchingEntry = (entry: SavedPitchingGameEntry) => {
    setEditingSavedPitchingEntry(entry)
    setEditingSavedEntryId(null)
    setEditingSavedEntry(null)
    setGameMeta(entry.gameMeta)
    setPitchingEntry(entry.statLine)
    setRecordMode("pitching")
  }

  const handleUpdateSavedPitchingEntry = async (nextGameMeta: DraftGameMeta, nextPitchingEntry: PitchingEntryData) => {
    if (!editingSavedPitchingEntry) return
    setSaveError("")
    try {
      await updatePitchingStatEntry(editingSavedPitchingEntry.statId, editingSavedPitchingEntry.gameId, {
        game: {
          team_id: teamId,
          game_date: nextGameMeta.date, opponent_name: nextGameMeta.opponent,
          season_year: nextGameMeta.seasonYear, match_number: nextGameMeta.matchNumber,
          location: nextGameMeta.location?.trim() || null,
          ...(nextGameMeta.memo !== undefined ? { memo: nextGameMeta.memo.trim() || null } : {}),
          team_score: nextGameMeta.teamScore ?? null, opponent_score: nextGameMeta.opponentScore ?? null,
          result: nextGameMeta.result || null,
        },
        pitchingStat: {
          player_id: Number(editingSavedPitchingEntry.playerId),
          innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
          hits_allowed: nextPitchingEntry.hitsAllowed, runs_allowed: nextPitchingEntry.runsAllowed,
          earned_runs: nextPitchingEntry.earnedRuns, walks: nextPitchingEntry.walks,
          hbp: nextPitchingEntry.hitBatters, strikeouts: nextPitchingEntry.strikeouts,
          home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
        },
      })
      await refreshAll(nextGameMeta.seasonYear)
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

  const handleDeleteSavedPitchingEntry = async (entry: SavedPitchingGameEntry) => {
    if (!window.confirm("Delete this pitching entry?")) return
    setSaveError("")
    try {
      await deletePitchingStatEntry(entry.statId, entry.gameId)
      await refreshAll()
      if (editingSavedPitchingEntry?.id === entry.id) {
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
    pitcherId = activePlayer.id
  ) => {
    await createFullGame({
      game: {
        team_id: teamId,
        game_date: gameMeta.date, opponent_name: gameMeta.opponent,
        season_year: gameMeta.seasonYear, match_number: gameMeta.matchNumber,
        location: gameMeta.location?.trim() || null,
        ...(gameMeta.memo !== undefined ? { memo: gameMeta.memo.trim() || null } : {}),
        team_score: gameMeta.teamScore ?? null, opponent_score: gameMeta.opponentScore ?? null,
        result: gameMeta.result || null,
      },
      battingStats: [],
      pitchingStats: [{
        player_id: Number(pitcherId),
        innings_pitched_outs: nextPitchingEntry.inningsPitchedOuts,
        hits_allowed: nextPitchingEntry.hitsAllowed, runs_allowed: nextPitchingEntry.runsAllowed,
        earned_runs: nextPitchingEntry.earnedRuns, walks: nextPitchingEntry.walks,
        hbp: nextPitchingEntry.hitBatters, strikeouts: nextPitchingEntry.strikeouts,
        home_runs_allowed: nextPitchingEntry.homeRunsAllowed,
      }],
    })
    setPitchingEntry(emptyPitchingEntry)
    const { games } = await refreshAll(gameMeta.seasonYear)
    setGameMeta((prev) => ({ ...prev, matchNumber: getNextMatchNumber(games) }))
  }

  return (
    <RecordGamePage
      activePlayer={activePlayer}
      allPlayers={allPlayers}
      onSelectPlayer={handleSelectPlayer}
      showRosterPanel={showRosterPanel}
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
      seasonYear={seasonYear}
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
  )
}
