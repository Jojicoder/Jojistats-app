import { useState, useEffect } from "react"
import type {
  Player,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import type { EditGameTab, LivePlay, RecordGamePageProps } from "./RecordGamePage.types"
import { createEmptyBattingLine } from "./RecordGamePage.utils"

type Input = {
  allPlayers: Player[]
  gameMeta: DraftGameMeta
  isMetaComplete: boolean
  gameEntriesForEditing: SavedBattingGameEntry[]
  pitchingEntriesForEditing: SavedPitchingGameEntry[]
  onUpdateSavedGame?: RecordGamePageProps["onUpdateSavedGame"]
  livePlays: LivePlay[]
}

export function useEditMode({
  allPlayers,
  gameMeta,
  isMetaComplete,
  gameEntriesForEditing,
  pitchingEntriesForEditing,
  onUpdateSavedGame,
  livePlays,
}: Input) {
  const [editGameTab, setEditGameTab] = useState<EditGameTab>("batting")
  const [editGameEntries, setEditGameEntries] = useState<PendingBattingEntry[]>([])
  const [editGamePitchingEntries, setEditGamePitchingEntries] = useState<PendingPitchingEntry[]>([])
  const [editAddPlayerId, setEditAddPlayerId] = useState("")
  const [editAddPitcherId, setEditAddPitcherId] = useState("")
  const [selectedEditPlayerId, setSelectedEditPlayerId] = useState("")
  const [selectedEditPitcherId, setSelectedEditPitcherId] = useState("")
  const [hoveredEditPlayerId, setHoveredEditPlayerId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const editAvailablePlayers = allPlayers.filter((p) => !editGameEntries.some((e) => e.playerId === p.id))
  const editAvailablePitchers = allPlayers.filter((p) => !editGamePitchingEntries.some((e) => e.playerId === p.id))
  const selectedEditAddPlayerId = editAddPlayerId || editAvailablePlayers[0]?.id || ""
  const selectedEditAddPitcherId = editAddPitcherId || editAvailablePitchers[0]?.id || ""
  const selectedEditGameEntry = selectedEditPlayerId
    ? (editGameEntries.find((e) => e.playerId === selectedEditPlayerId) ?? null)
    : null
  const selectedEditPitchingEntry = selectedEditPitcherId
    ? (editGamePitchingEntries.find((e) => e.playerId === selectedEditPitcherId) ?? null)
    : null
  const hasInvalidEditGameStats = editGameEntries.some(
    (e) => e.H > e.AB || e.doubles + e.triples + e.HR > e.H
  )
  const hasInvalidEditPitchingStats = editGamePitchingEntries.some((e) => e.earnedRuns > e.runsAllowed)
  const hoveredEditPlayerEvents = hoveredEditPlayerId
    ? livePlays.filter((p) => p.playerId === hoveredEditPlayerId)
    : []

  // Runs whenever a different saved game is selected for editing, not just on mount
  useEffect(() => {
    setEditGameEntries(
      gameEntriesForEditing.map((entry) => {
        const player = allPlayers.find((p) => p.id === entry.playerId)
        return {
          ...entry.statLine,
          playerId: entry.playerId,
          playerName: player?.name ?? `Player ${entry.playerId}`,
          gamePositions: entry.gamePositions.length
            ? entry.gamePositions
            : player
              ? [...player.positions]
              : ["UTIL"],
        }
      })
    )
    setSelectedEditPlayerId("")
    setEditAddPlayerId("")
  }, [allPlayers, gameEntriesForEditing])

  useEffect(() => {
    setEditGamePitchingEntries(
      pitchingEntriesForEditing.map((entry) => {
        const player = allPlayers.find((p) => p.id === entry.playerId)
        return {
          ...entry.statLine,
          playerId: entry.playerId,
          playerName: player?.name ?? `Player ${entry.playerId}`,
        }
      })
    )
    setSelectedEditPitcherId("")
    setEditAddPitcherId("")
  }, [allPlayers, pitchingEntriesForEditing])

  // Clear stale dropdown selection if that player was just added to the game (no longer in available list)
  useEffect(() => {
    if (editAddPlayerId && !editAvailablePlayers.some((p) => p.id === editAddPlayerId)) {
      setEditAddPlayerId("")
    }
  }, [editAddPlayerId, editAvailablePlayers])

  useEffect(() => {
    if (editAddPitcherId && !editAvailablePitchers.some((p) => p.id === editAddPitcherId)) {
      setEditAddPitcherId("")
    }
  }, [editAddPitcherId, editAvailablePitchers])

  useEffect(() => {
    if (selectedEditPlayerId && !editGameEntries.some((e) => e.playerId === selectedEditPlayerId)) {
      setSelectedEditPlayerId("")
    }
  }, [editGameEntries, selectedEditPlayerId])

  useEffect(() => {
    if (selectedEditPitcherId && !editGamePitchingEntries.some((e) => e.playerId === selectedEditPitcherId)) {
      setSelectedEditPitcherId("")
    }
  }, [editGamePitchingEntries, selectedEditPitcherId])

  const handleUpdateEditGameEntry = (playerId: string, nextStatLine: BattingEntryData) =>
    setEditGameEntries((prev) => prev.map((e) => (e.playerId === playerId ? { ...e, ...nextStatLine } : e)))

  const handleRemoveEditGameEntry = (playerId: string) => {
    setEditGameEntries((prev) => prev.filter((e) => e.playerId !== playerId))
    if (selectedEditPlayerId === playerId) setSelectedEditPlayerId("")
  }

  const handleAddEditGameEntry = () => {
    const player = allPlayers.find((p) => p.id === selectedEditAddPlayerId)
    if (!player) return
    setEditGameEntries((prev) => [
      ...prev,
      { ...createEmptyBattingLine(), playerId: player.id, playerName: player.name, gamePositions: [...player.positions] },
    ])
    setSelectedEditPlayerId(player.id)
    setEditAddPlayerId("")
  }

  const handleUpdateEditGamePitchingEntry = (playerId: string, next: PitchingEntryData) =>
    setEditGamePitchingEntries((prev) => prev.map((e) => (e.playerId === playerId ? { ...e, ...next } : e)))

  const handleRemoveEditGamePitchingEntry = (playerId: string) => {
    setEditGamePitchingEntries((prev) => prev.filter((e) => e.playerId !== playerId))
    if (selectedEditPitcherId === playerId) setSelectedEditPitcherId("")
  }

  const handleAddEditGamePitchingEntry = () => {
    const player = allPlayers.find((p) => p.id === selectedEditAddPitcherId)
    if (!player) return
    setEditGamePitchingEntries((prev) => [
      ...prev,
      {
        inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
        walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0,
        playerId: player.id, playerName: player.name,
      },
    ])
    setSelectedEditPitcherId(player.id)
    setEditAddPitcherId("")
  }

  const validateScore = (entries: { RBI: number }[]): boolean => {
    if (gameMeta.teamScore == null) return true
    const totalRbi = entries.reduce((sum, e) => sum + e.RBI, 0)
    const errorRuns = gameMeta.errorRuns ?? 0
    const expected = totalRbi + errorRuns
    if (gameMeta.teamScore !== expected) {
      window.alert(
        `Score mismatch!\n\nTeam Score entered: ${gameMeta.teamScore}\nTotal RBI: ${totalRbi}${errorRuns > 0 ? ` + Error Runs: ${errorRuns}` : ""} = ${expected}\n\nPlease fix the score, RBI totals, or Error Runs before saving.`
      )
      return false
    }
    return true
  }

  const handleSaveEditedGame = async () => {
    if (
      !onUpdateSavedGame ||
      !isMetaComplete ||
      (editGameEntries.length === 0 && editGamePitchingEntries.length === 0) ||
      hasInvalidEditGameStats ||
      hasInvalidEditPitchingStats
    ) return
    if (editGameEntries.length > 0 && !validateScore(editGameEntries)) return
    try {
      setIsSaving(true)
      await onUpdateSavedGame(gameMeta, editGameEntries, editGamePitchingEntries)
    } finally {
      setIsSaving(false)
    }
  }

  return {
    editGameTab, setEditGameTab,
    editGameEntries,
    editGamePitchingEntries,
    editAvailablePlayers,
    editAvailablePitchers,
    selectedEditAddPlayerId,
    setEditAddPlayerId,
    selectedEditAddPitcherId,
    setEditAddPitcherId,
    selectedEditGameEntry,
    setSelectedEditPlayerId,
    selectedEditPitchingEntry,
    setSelectedEditPitcherId,
    hoveredEditPlayerId,
    setHoveredEditPlayerId,
    hoveredEditPlayerEvents,
    hasInvalidEditGameStats,
    hasInvalidEditPitchingStats,
    isSaving,
    handleUpdateEditGameEntry,
    handleRemoveEditGameEntry,
    handleAddEditGameEntry,
    handleUpdateEditGamePitchingEntry,
    handleRemoveEditGamePitchingEntry,
    handleAddEditGamePitchingEntry,
    handleSaveEditedGame,
  }
}
