import { useState, useEffect, useRef } from "react"
import type {
  Player,
  Position,
  BattingEntryData,
  DraftGameMeta,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import type { EditGameTab, LivePlay, RecordGamePageProps } from "./RecordGamePage.types"
import { createEmptyBattingLine, createEmptyPitchingLine, gamePositionOptions } from "./RecordGamePage.utils"

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

  const prevBattingKeyRef = useRef<string | null>(null)
  const prevPitchingKeyRef = useRef<string | null>(null)

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
    const key = gameEntriesForEditing.map((e) => `${e.id}:${e.statId}`).join(",")
    const isNewGame = key !== prevBattingKeyRef.current
    if (!isNewGame) return
    prevBattingKeyRef.current = key

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
    if (isNewGame) {
      setSelectedEditPlayerId("")
      setEditAddPlayerId("")
    }
  }, [allPlayers, gameEntriesForEditing])

  useEffect(() => {
    const key = pitchingEntriesForEditing.map((e) => `${e.id}:${e.statId}`).join(",")
    const isNewGame = key !== prevPitchingKeyRef.current
    if (!isNewGame) return
    prevPitchingKeyRef.current = key

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
    if (isNewGame) {
      setSelectedEditPitcherId("")
      setEditAddPitcherId("")
    }
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

  const ensureEditGamePitchingEntry = (playerId: string) => {
    const player = allPlayers.find((p) => p.id === playerId)
    if (!player) return
    setEditGamePitchingEntries((prev) =>
      prev.some((entry) => entry.playerId === playerId)
        ? prev
        : [...prev, { ...createEmptyPitchingLine(), playerId: player.id, playerName: player.name }]
    )
    setSelectedEditPitcherId(playerId)
    setEditGameTab("pitching")
  }

  const handleAddEditGamePosition = (playerId: string, position?: Position) => {
    let addedPosition: Position | null = null
    setEditGameEntries((prev) =>
      prev.map((entry) => {
        if (entry.playerId !== playerId) return entry
        const addablePositions = position
          ? [position]
          : [
              ...gamePositionOptions.filter((option) => option !== "P"),
              "P" as Position,
            ]
        const nextPosition = addablePositions.find((option) => !entry.gamePositions.includes(option))
        if (!nextPosition || entry.gamePositions.includes(nextPosition)) return entry
        addedPosition = nextPosition
        return { ...entry, gamePositions: [...entry.gamePositions, nextPosition] }
      })
    )
    if (addedPosition === "P") ensureEditGamePitchingEntry(playerId)
  }

  const handleUpdateEditGamePosition = (playerId: string, index: number, position: Position = "P") => {
    setEditGameEntries((prev) =>
      prev.map((entry) => {
        if (entry.playerId !== playerId) return entry
        return {
          ...entry,
          gamePositions: entry.gamePositions.map((pos, i) => (i === index ? position : pos)),
        }
      })
    )
    if (position === "P") ensureEditGamePitchingEntry(playerId)
  }

  const handleRemoveEditGamePosition = (playerId: string, index: number) => {
    setEditGameEntries((prev) =>
      prev.map((entry) => {
        if (entry.playerId !== playerId || entry.gamePositions.length <= 1) return entry
        return { ...entry, gamePositions: entry.gamePositions.filter((_, i) => i !== index) }
      })
    )
  }

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
      { ...createEmptyPitchingLine(), playerId: player.id, playerName: player.name },
    ])
    setEditGameEntries((prev) =>
      prev.map((entry) =>
        entry.playerId === player.id && !entry.gamePositions.includes("P")
          ? { ...entry, gamePositions: [...entry.gamePositions, "P"] }
          : entry
      )
    )
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
    if (!window.confirm("Save this game with these records?")) return
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
    handleAddEditGamePosition,
    handleUpdateEditGamePosition,
    handleRemoveEditGamePosition,
    handleRemoveEditGameEntry,
    handleAddEditGameEntry,
    handleUpdateEditGamePitchingEntry,
    handleRemoveEditGamePitchingEntry,
    handleAddEditGamePitchingEntry,
    handleSaveEditedGame,
  }
}
