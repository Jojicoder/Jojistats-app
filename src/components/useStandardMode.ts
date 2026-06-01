import { useState, useEffect, useMemo } from "react"
import type { Player, Position, BattingEntryData, DraftGameMeta, PendingBattingEntry, PitchingEntryData } from "../types"
import type { RecordGamePageProps } from "./RecordGamePage.types"

type Input = {
  activePlayer: Player
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
  pitchingEntry: PitchingEntryData
  onSavePitchingGame: RecordGamePageProps["onSavePitchingGame"]
  onUpdateSavedPitchingEntry?: RecordGamePageProps["onUpdateSavedPitchingEntry"]
  onNewGame?: () => void
}

export function useStandardMode({
  activePlayer,
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
  pitchingEntry,
  onSavePitchingGame,
  onUpdateSavedPitchingEntry,
  onNewGame,
}: Input) {
  const defaultGamePositions = useMemo(() => {
    const base =
      isEditingSavedEntry && editingGamePositions?.length
        ? editingGamePositions
        : [activePlayer.position]
    if (isEditingSavedPitchingEntry && !base.includes("P")) {
      return [...base, "P" as Position]
    }
    return base
  }, [activePlayer.position, editingGamePositions, isEditingSavedEntry, isEditingSavedPitchingEntry])

  const [gamePositions, setGamePositions] = useState<Position[]>(defaultGamePositions)

  const canRecordPitching = gamePositions.includes("P")

  useEffect(() => {
    if (!canRecordPitching && recordMode === "pitching") setRecordMode("batting")
  }, [canRecordPitching, recordMode, setRecordMode])

  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])
  const [editingPendingPlayerId, setEditingPendingPlayerId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const pendingDraftKey = `standard-pending-${activePlayer.teamId}-${activePlayer.seasonYear}`

  useEffect(() => {
    const saved = localStorage.getItem(pendingDraftKey)
    if (!saved) return
    try {
      const pending = JSON.parse(saved) as PendingBattingEntry[]
      if (Array.isArray(pending) && pending.length > 0) setPendingEntries(pending)
    } catch {}
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingDraftKey])

  useEffect(() => {
    if (pendingEntries.length === 0) {
      localStorage.removeItem(pendingDraftKey)
    } else {
      localStorage.setItem(pendingDraftKey, JSON.stringify(pendingEntries))
    }
  }, [pendingEntries, pendingDraftKey])

  useEffect(() => {
    if (editingPendingPlayerId) return
    setGamePositions(defaultGamePositions)
  }, [defaultGamePositions, editingPendingPlayerId])

  const hasInvalidStats =
    currentEntry.H > currentEntry.AB ||
    currentEntry.doubles + currentEntry.triples + currentEntry.HR > currentEntry.H
  const isEditingPendingEntry = editingPendingPlayerId != null
  const isPlayerAlreadyAdded = pendingEntries.some(
    (e) => e.playerId === activePlayer.id && e.playerId !== editingPendingPlayerId
  )
  const canAdd = isMetaComplete && !hasInvalidStats && !isPlayerAlreadyAdded
  const primaryActionDisabled =
    isEditingSavedEntry || isEditingPendingEntry
      ? !isMetaComplete || hasInvalidStats
      : !canAdd

  const addGamePosition = () => setGamePositions((prev) => [...prev, activePlayer.position])
  const updateGamePosition = (index: number, next: Position) =>
    setGamePositions((prev) => prev.map((pos, i) => (i === index ? next : pos)))
  const removeGamePosition = (index: number) =>
    setGamePositions((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)))

  const handleSetRecordMode = (next: "batting" | "pitching") => {
    if (next === "pitching" && !canRecordPitching) return
    setRecordMode(next)
  }

  const handleAdd = () => {
    if (!canAdd) return
    setPendingEntries((prev) => [
      ...prev,
      { ...currentEntry, playerId: activePlayer.id, playerName: activePlayer.name, gamePositions },
    ])
    onEntryChange({ AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, note: "" })
  }

  const resetPendingEdit = () => {
    setEditingPendingPlayerId(null)
    onEntryChange({ AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, note: "" })
    setGamePositions(defaultGamePositions)
  }

  const handleStartEditPendingEntry = (entry: PendingBattingEntry) => {
    setEditingPendingPlayerId(entry.playerId)
    setGamePositions(entry.gamePositions.length ? entry.gamePositions : [activePlayer.position])
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

  const handlePrimaryAction = () => {
    if (isEditingSavedEntry) { onUpdateSavedEntry(gameMeta, currentEntry, gamePositions); return }
    if (isEditingPendingEntry) { handleUpdatePendingEntry(); return }
    handleAdd()
  }

  const handlePitchingPrimaryAction = async () => {
    try {
      setIsSaving(true)
      if (isEditingSavedPitchingEntry && onUpdateSavedPitchingEntry) {
        await onUpdateSavedPitchingEntry(gameMeta, pitchingEntry)
        return
      }
      await onSavePitchingGame()
    } catch {
      // Parent save handlers surface the message through saveError.
    } finally {
      setIsSaving(false)
    }
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

  const handleSave = async () => {
    if (isEditingSavedEntry || !isMetaComplete || pendingEntries.length === 0 || !validateScore(pendingEntries)) return
    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, pendingEntries)
      setPendingEntries([])
      setEditingPendingPlayerId(null)
    } catch {
      // Parent save handlers surface the message through saveError.
    } finally {
      setIsSaving(false)
    }
  }

  const handleNewGame = () => {
    setPendingEntries([])
    setEditingPendingPlayerId(null)
    localStorage.removeItem(pendingDraftKey)
    onNewGame?.()
  }

  return {
    gamePositions,
    canRecordPitching,
    pendingEntries,
    editingPendingPlayerId,
    isEditingPendingEntry,
    isSaving,
    primaryActionDisabled,
    addGamePosition,
    updateGamePosition,
    removeGamePosition,
    handleSetRecordMode,
    handlePrimaryAction,
    handleStartEditPendingEntry,
    handleRemovePendingEntry,
    resetPendingEdit,
    handlePitchingPrimaryAction,
    handleSave,
    handleNewGame,
  }
}
