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
  useEffect(() => { setGamePositions(defaultGamePositions) }, [defaultGamePositions])

  const canRecordPitching = gamePositions.includes("P")

  useEffect(() => {
    if (!canRecordPitching && recordMode === "pitching") setRecordMode("batting")
  }, [canRecordPitching, recordMode, setRecordMode])

  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])
  const [isSaving, setIsSaving] = useState(false)

  const hasInvalidStats =
    currentEntry.H > currentEntry.AB ||
    currentEntry.doubles + currentEntry.triples + currentEntry.HR > currentEntry.H
  const isPlayerAlreadyAdded = pendingEntries.some((e) => e.playerId === activePlayer.id)
  const canAdd = isMetaComplete && !hasInvalidStats && !isPlayerAlreadyAdded
  const primaryActionDisabled = isEditingSavedEntry ? !isMetaComplete || hasInvalidStats : !canAdd

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

  const handlePrimaryAction = () => {
    if (isEditingSavedEntry) { onUpdateSavedEntry(gameMeta, currentEntry); return }
    handleAdd()
  }

  const handlePitchingPrimaryAction = () => {
    if (isEditingSavedPitchingEntry && onUpdateSavedPitchingEntry) {
      onUpdateSavedPitchingEntry(gameMeta, pitchingEntry)
      return
    }
    onSavePitchingGame()
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
    if (!isMetaComplete || pendingEntries.length === 0 || !validateScore(pendingEntries)) return
    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, pendingEntries)
      setPendingEntries([])
    } finally {
      setIsSaving(false)
    }
  }

  return {
    gamePositions,
    canRecordPitching,
    pendingEntries,
    isSaving,
    primaryActionDisabled,
    addGamePosition,
    updateGamePosition,
    removeGamePosition,
    handleSetRecordMode,
    handlePrimaryAction,
    handlePitchingPrimaryAction,
    handleSave,
  }
}
