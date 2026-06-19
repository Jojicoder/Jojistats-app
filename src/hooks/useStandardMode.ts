import { useState, useEffect, useMemo } from "react"
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
import type { RecordGamePageProps } from "../components/RecordGamePage.types"
import { createEmptyPitchingLine } from "../components/gameConstants"
import { validateScore } from "../utils/scoreValidation"

type Input = {
  activePlayer: Player
  allPlayers: Player[]
  currentEntry: BattingEntryData
  onEntryChange: (entry: BattingEntryData) => void
  gameMeta: DraftGameMeta
  isMetaComplete: boolean
  isEditingSavedEntry: boolean
  isEditingSavedPitchingEntry: boolean
  editingGamePositions?: Position[]
  recordMode: "batting" | "pitching"
  setRecordMode: (mode: "batting" | "pitching") => void
  onSaveGame: RecordGamePageProps["onSaveGame"]
  onUpdateSavedEntry: RecordGamePageProps["onUpdateSavedEntry"]
  onUpdateSavedGame?: RecordGamePageProps["onUpdateSavedGame"]
  onCancelEditSavedEntry: RecordGamePageProps["onCancelEditSavedEntry"]
  gameEntriesForEditing?: SavedBattingGameEntry[]
  pitchingEntriesForEditing?: SavedPitchingGameEntry[]
  pitchingEntry: PitchingEntryData
  onPitchingEntryChange: (entry: PitchingEntryData) => void
  onUpdateSavedPitchingEntry?: RecordGamePageProps["onUpdateSavedPitchingEntry"]
  onNewGame?: () => void
}

export function useStandardMode({
  activePlayer,
  allPlayers,
  currentEntry,
  onEntryChange,
  gameMeta,
  isMetaComplete,
  isEditingSavedEntry,
  isEditingSavedPitchingEntry,
  editingGamePositions,
  recordMode,
  setRecordMode,
  onSaveGame,
  onUpdateSavedEntry,
  onUpdateSavedGame,
  onCancelEditSavedEntry,
  gameEntriesForEditing = [],
  pitchingEntriesForEditing = [],
  pitchingEntry,
  onPitchingEntryChange,
  onUpdateSavedPitchingEntry,
  onNewGame,
}: Input) {
  const defaultGamePositions = useMemo(() => {
    const base =
      isEditingSavedEntry && editingGamePositions?.length
        ? [...editingGamePositions]
        : [activePlayer.positions[0]]
    if (isEditingSavedPitchingEntry && !base.includes("P")) {
      return [...base, "P" as Position]
    }
    return [...base]
  }, [
    activePlayer.positions[0],
    editingGamePositions,
    isEditingSavedEntry,
    isEditingSavedPitchingEntry,
  ])

  const [gamePositions, setGamePositions] = useState<Position[]>(defaultGamePositions)

  const canRecordPitching = true

  useEffect(() => {
    if (!canRecordPitching && recordMode === "pitching") setRecordMode("batting")
  }, [canRecordPitching, recordMode, setRecordMode])

  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])
  const [pendingPitchingEntries, setPendingPitchingEntries] = useState<PendingPitchingEntry[]>([])
  const [editingPendingPlayerId, setEditingPendingPlayerId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const pendingDraftKey = `standard-pending-${activePlayer.teamId}-${activePlayer.seasonYear}`
  const pendingPitchingDraftKey = `standard-pending-pitching-${activePlayer.teamId}-${activePlayer.seasonYear}`

  useEffect(() => {
    const saved = localStorage.getItem(pendingDraftKey)
    if (!saved) return
    try {
      const pending = JSON.parse(saved) as PendingBattingEntry[]
      if (Array.isArray(pending) && pending.length > 0) setPendingEntries(pending)
    } catch {
      localStorage.removeItem(pendingDraftKey)
    }
  }, [pendingDraftKey])

  useEffect(() => {
    const saved = localStorage.getItem(pendingPitchingDraftKey)
    if (!saved) return
    try {
      const pending = JSON.parse(saved) as PendingPitchingEntry[]
      if (Array.isArray(pending) && pending.length > 0) setPendingPitchingEntries(pending)
    } catch {
      localStorage.removeItem(pendingPitchingDraftKey)
    }
  }, [pendingPitchingDraftKey])

  useEffect(() => {
    if (pendingEntries.length === 0) {
      localStorage.removeItem(pendingDraftKey)
    } else {
      localStorage.setItem(pendingDraftKey, JSON.stringify(pendingEntries))
    }
  }, [pendingEntries, pendingDraftKey])

  useEffect(() => {
    if (pendingPitchingEntries.length === 0) {
      localStorage.removeItem(pendingPitchingDraftKey)
    } else {
      localStorage.setItem(pendingPitchingDraftKey, JSON.stringify(pendingPitchingEntries))
    }
  }, [pendingPitchingEntries, pendingPitchingDraftKey])

  useEffect(() => {
    if (editingPendingPlayerId) return
    setGamePositions(defaultGamePositions)
  }, [activePlayer.id, defaultGamePositions, editingPendingPlayerId])

  useEffect(() => {
    if (isEditingSavedEntry || editingPendingPlayerId) return
    setGamePositions([activePlayer.positions[0]])
  }, [activePlayer.id, activePlayer.positions[0], editingPendingPlayerId, isEditingSavedEntry])

  const hasInvalidStats = currentEntry.H > currentEntry.AB
  const isEditingPendingEntry = editingPendingPlayerId != null
  const isPlayerAlreadyAdded = pendingEntries.some(
    (e) => e.playerId === activePlayer.id && e.playerId !== editingPendingPlayerId
  )
  const canAdd = isMetaComplete && !hasInvalidStats && !isPlayerAlreadyAdded
  const primaryActionDisabled =
    isSaving
      ? true
      : isEditingSavedEntry
      ? hasInvalidStats
      : isEditingPendingEntry
        ? !isMetaComplete || hasInvalidStats
        : !canAdd

  const addGamePosition = () => setGamePositions((prev) => [...prev, activePlayer.positions[0]])
  const updateGamePosition = (index: number, next: Position) =>
    setGamePositions((prev) => prev.map((pos, i) => (i === index ? next : pos)))
  const removeGamePosition = (index: number) =>
    setGamePositions((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  const handleSetRecordMode = (next: "batting" | "pitching") => {
    if (next === "pitching" && !gamePositions.includes("P")) {
      setGamePositions((prev) => (prev.includes("P") ? prev : [...prev, "P"]))
    }
    setRecordMode(next)
  }

  const handleAdd = () => {
    if (!canAdd) return
    setPendingEntries((prev) => [
      ...prev,
      { ...currentEntry, playerId: activePlayer.id, playerName: activePlayer.name, gamePositions },
    ])
    onEntryChange({ AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "" })
  }

  const resetPendingEdit = () => {
    setEditingPendingPlayerId(null)
    onEntryChange({ AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "" })
    setGamePositions(defaultGamePositions)
  }

  const handleStartEditPendingEntry = (entry: PendingBattingEntry) => {
    setEditingPendingPlayerId(entry.playerId)
    setGamePositions(entry.gamePositions.length ? entry.gamePositions : [activePlayer.positions[0]])
    onEntryChange({
      AB: entry.AB,
      H: entry.H,
      doubles: entry.doubles,
      triples: entry.triples,
      HR: entry.HR,
      RBI: entry.RBI,
      BB: entry.BB,
      HBP: entry.HBP,
      SF: entry.SF,
      SO: entry.SO,
      SB: entry.SB,
      CS: entry.CS,
      note: entry.note,
    })
    setRecordMode("batting")
  }

  const handleUpdatePendingEntry = () => {
    if (!editingPendingPlayerId || hasInvalidStats) return
    setPendingEntries((prev) =>
      prev.map((entry) =>
        entry.playerId === editingPendingPlayerId
          ? { ...entry, ...currentEntry, gamePositions }
          : entry
      )
    )
    resetPendingEdit()
  }

  const handleRemovePendingEntry = (playerId: string) => {
    setPendingEntries((prev) => prev.filter((entry) => entry.playerId !== playerId))
    if (editingPendingPlayerId === playerId) resetPendingEdit()
  }

  const handlePrimaryAction = async () => {
    if (isEditingSavedEntry) {
      try {
        setIsSaving(true)
        await onUpdateSavedEntry(gameMeta, currentEntry, gamePositions)
      } finally {
        setIsSaving(false)
      }
      return
    }
    if (isEditingPendingEntry) { handleUpdatePendingEntry(); return }
    handleAdd()
  }

  const handleCancelEditSavedEntry = () => {
    setGamePositions([activePlayer.positions[0]])
    setRecordMode("batting")
    onCancelEditSavedEntry()
  }

  const handlePitchingPrimaryAction = async () => {
    try {
      setIsSaving(true)
      if (isEditingSavedEntry && onUpdateSavedGame) {
        if (!window.confirm("Save this game with these records?")) return
        const battingByPlayer = new Map<string, PendingBattingEntry>()
        gameEntriesForEditing.forEach((entry) => {
          battingByPlayer.set(entry.playerId, {
            ...entry.statLine,
            playerId: entry.playerId,
            playerName: allPlayers.find((player) => player.id === entry.playerId)?.name ?? `Player ${entry.playerId}`,
            gamePositions: entry.playerId === activePlayer.id ? gamePositions : entry.gamePositions,
          })
        })
        battingByPlayer.set(activePlayer.id, {
          ...currentEntry,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
          gamePositions,
        })
        const nextBattingEntries = Array.from(battingByPlayer.values())

        const pitchingByPlayer = new Map<string, PendingPitchingEntry>()
        pitchingEntriesForEditing.forEach((entry) => {
          pitchingByPlayer.set(entry.playerId, {
            ...entry.statLine,
            playerId: entry.playerId,
            playerName: allPlayers.find((player) => player.id === entry.playerId)?.name ?? `Player ${entry.playerId}`,
          })
        })
        const nextPitchingEntry: PendingPitchingEntry = {
          ...pitchingEntry,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
        }
        pitchingByPlayer.set(activePlayer.id, nextPitchingEntry)
        const nextPitchingEntries = Array.from(pitchingByPlayer.values())

        await onUpdateSavedGame(gameMeta, nextBattingEntries, nextPitchingEntries)
        return
      }
      if (isEditingSavedPitchingEntry && onUpdateSavedPitchingEntry) {
        await onUpdateSavedPitchingEntry(gameMeta, pitchingEntry)
        return
      }
      if (pendingPitchingEntries.some((entry) => entry.playerId === activePlayer.id)) return
      setPendingPitchingEntries((prev) => [
        ...prev,
        {
          ...pitchingEntry,
          playerId: activePlayer.id,
          playerName: activePlayer.name,
        },
      ])
      onPitchingEntryChange(createEmptyPitchingLine())
    } catch {
      // Parent save handlers surface the message through saveError.
    } finally {
      setIsSaving(false)
    }
  }

  const handleRemovePendingPitchingEntry = (playerId: string) => {
    setPendingPitchingEntries((prev) => prev.filter((entry) => entry.playerId !== playerId))
  }

  const handleSave = async () => {
    if (
      isEditingSavedEntry ||
      !isMetaComplete ||
      (pendingEntries.length === 0 && pendingPitchingEntries.length === 0) ||
      (pendingEntries.length > 0 && !validateScore(gameMeta, pendingEntries))
    ) return
    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, pendingEntries, pendingPitchingEntries)
      setPendingEntries([])
      setPendingPitchingEntries([])
      setEditingPendingPlayerId(null)
    } catch {
      // Parent save handlers surface the message through saveError.
    } finally {
      setIsSaving(false)
    }
  }

  const resetStandardDraft = (resetParent = true) => {
    setPendingEntries([])
    setPendingPitchingEntries([])
    setEditingPendingPlayerId(null)
    setGamePositions([activePlayer.positions[0]])
    setRecordMode("batting")
    localStorage.removeItem(pendingDraftKey)
    localStorage.removeItem(pendingPitchingDraftKey)
    if (resetParent) onNewGame?.()
  }

  const handleNewGame = async () => {
    if (isSaving) return
    if (isEditingSavedEntry || isEditingSavedPitchingEntry || !isMetaComplete) {
      resetStandardDraft()
      return
    }
    if (pendingEntries.length > 0 && !validateScore(gameMeta, pendingEntries)) return

    try {
      setIsSaving(true)
      if (pendingEntries.length > 0 || pendingPitchingEntries.length > 0) {
        await onSaveGame(gameMeta, pendingEntries, pendingPitchingEntries)
      }
      resetStandardDraft(false)
    } catch {
      // Parent save handlers surface the message through saveError.
    } finally {
      setIsSaving(false)
    }
  }

  return {
    gamePositions,
    canRecordPitching,
    pendingEntries,
    pendingPitchingEntries,
    editingPendingPlayerId,
    isEditingPendingEntry,
    isSaving,
    primaryActionDisabled,
    addGamePosition,
    updateGamePosition,
    removeGamePosition,
    handleSetRecordMode,
    handlePrimaryAction,
    handleCancelEditSavedEntry,
    handleStartEditPendingEntry,
    handleRemovePendingEntry,
    handleRemovePendingPitchingEntry,
    resetPendingEdit,
    handlePitchingPrimaryAction,
    handleSave,
    handleNewGame,
  }
}
