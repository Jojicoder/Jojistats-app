import { useState, useEffect, useMemo } from "react"
import type { Player, DraftGameMeta } from "../types"
import type {
  GameHalf, BaseName, BasesState, LiveGameTab,
  LivePlay, LivePitchPlay, LiveInningSummary, LivePitchingStats,
  RecordGamePageProps,
} from "../components/RecordGamePage.types"
import { emptyBases } from "../components/gameConstants"
import { buildPitchingEntryFromPlays } from "../components/gameStatUtils"
import { aggregateLivePlays, aggregateLivePitchingPlays } from "../components/gameLiveUtils"
import { useLiveLineup } from "./useLiveLineup"
import { useLiveGameDraft } from "./useLiveGameDraft"
import { useLivePlayEditor } from "./useLivePlayEditor"
import { useRunnerControls } from "./useRunnerControls"
import { useLivePlayRecorder } from "./useLivePlayRecorder"

const emptyPitchingStats: LivePitchingStats = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0, note: "",
}

type Input = {
  allPlayers: Player[]
  activePlayer: Player
  gameMeta: DraftGameMeta
  isMetaComplete: boolean
  onSaveGame: RecordGamePageProps["onSaveGame"]
  localDraftKey: string
}

export function useGameMode({ allPlayers, activePlayer, gameMeta, isMetaComplete, onSaveGame, localDraftKey }: Input) {
  const [liveGameTab, setLiveGameTab] = useState<LiveGameTab>("batting")
  const [liveInning, setLiveInning] = useState(1)
  const [liveHalf, setLiveHalf] = useState<GameHalf>("Top")
  const [liveOuts, setLiveOuts] = useState(0)
  const [bases, setBases] = useState<BasesState>(emptyBases)
  const [selectedBase, setSelectedBase] = useState<BaseName | null>(null)
  const [awayScore, setAwayScore] = useState(0)
  const [homeScore, setHomeScore] = useState(0)
  const [quickRbi, setQuickRbi] = useState<number | null>(null)
  const [quickNote, setQuickNote] = useState("")
  const [quickPitchNote, setQuickPitchNote] = useState("")
  const [livePlays, setLivePlays] = useState<LivePlay[]>([])
  const [livePitchPlays, setLivePitchPlays] = useState<LivePitchPlay[]>([])
  const [livePitchingEntry, setLivePitchingEntry] = useState<LivePitchingStats>(emptyPitchingStats)
  const [livePitcherId, setLivePitcherId] = useState(
    allPlayers.find((p) => p.positions.includes("P"))?.id ?? activePlayer.id
  )
  const [pendingSyncConfirm, setPendingSyncConfirm] = useState(false)
  const [editingLiveEventId, setEditingLiveEventId] = useState<string | null>(null)
  const [expandedLiveInningKey, setExpandedLiveInningKey] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  const {
    lineupIds,
    setLineupIds,
    lineupPlayers,
    currentBatterIndex,
    setCurrentBatterIndex,
    pinhitters,
    setPinhitters,
    replacedLineupIds,
    setReplacedLineupIds,
    pendingRemoveIndex,
    setPendingRemoveIndex,
    dragLineupIndex,
    setDragLineupIndex,
    dragOverLineupIndex,
    setDragOverLineupIndex,
    handleLineupChange,
    handleAddLineupSpot,
    handleRemoveLineupSpot,
    handleLineupDrop,
  } = useLiveLineup({ allPlayers })

  const {
    runnerOutHistory,
    setRunnerOutHistory,
    runnerRbiHistory,
    setRunnerRbiHistory,
    runnerRunHistory,
    setRunnerRunHistory,
    clearRunnerHistory,
    handleRunnerOut,
    handleRunnerRbi,
    handleRunnerRun,
    undoLatestRunnerAction,
  } = useRunnerControls({
    liveInning,
    setLiveInning,
    liveHalf,
    setLiveHalf,
    liveOuts,
    setLiveOuts,
    bases,
    setBases,
    selectedBase,
    setSelectedBase,
    liveGameTab,
    setLiveGameTab,
    livePlays,
    setLivePlays,
    latestLivePitchPlayId: livePitchPlays[livePitchPlays.length - 1]?.id,
    setAwayScore,
    setHomeScore,
  })

  const {
    handleDeleteLivePlay,
    handleDeleteLivePitchPlay,
    handleUpdateLivePlay,
    handleUpdateLivePitchPlay,
  } = useLivePlayEditor({
    livePlays,
    setLivePlays,
    livePitchPlays,
    setLivePitchPlays,
    lineupLength: lineupPlayers.length,
    setCurrentBatterIndex,
    setLiveInning,
    setLiveHalf,
    setLiveOuts,
    setBases,
    setLiveGameTab,
    setAwayScore,
    setHomeScore,
    setLivePitchingEntry,
    editingLiveEventId,
    setEditingLiveEventId,
    setExpandedLiveInningKey,
    clearRunnerHistory,
  })

  const { lastLocalSaveAt, clearLocalDraft } = useLiveGameDraft({
    localDraftKey,
    lineupIds,
    setLineupIds,
    currentBatterIndex,
    setCurrentBatterIndex,
    liveInning,
    setLiveInning,
    liveHalf,
    setLiveHalf,
    liveOuts,
    setLiveOuts,
    bases,
    setBases,
    awayScore,
    setAwayScore,
    homeScore,
    setHomeScore,
    quickPitchNote,
    setQuickPitchNote,
    selectedBase,
    setSelectedBase,
    runnerOutHistory,
    setRunnerOutHistory,
    runnerRbiHistory,
    setRunnerRbiHistory,
    runnerRunHistory,
    setRunnerRunHistory,
    replacedLineupIds,
    setReplacedLineupIds,
    livePlays,
    setLivePlays,
    livePitcherId,
    setLivePitcherId,
    livePitchingEntry,
    setLivePitchingEntry,
    livePitchPlays,
    setLivePitchPlays,
  })

  /* ---------------- EFFECTS ---------------- */

  // Auto-switch tab to match game batting half when the half changes (including manual changes).
  // Skips until gameBattingHalf is established so the user can freely pick batting or pitching first.
  useEffect(() => {
    const battingHalf: GameHalf | null =
      livePlays.length > 0 ? livePlays[0].half
      : livePitchPlays.length > 0 ? (livePitchPlays[0].half === "Top" ? "Bottom" : "Top")
      : null
    if (battingHalf === null) return
    setLiveGameTab(liveHalf === battingHalf ? "batting" : "pitching")
  }, [liveHalf, livePlays, livePitchPlays])

  // Only set once so the user's manually expanded inning isn't overridden when the inning advances
  useEffect(() => {
    const key = `${liveInning}-${liveHalf}`
    if (!expandedLiveInningKey) setExpandedLiveInningKey(key)
  }, [liveInning, liveHalf, expandedLiveInningKey])

  /* ---------------- DERIVED ---------------- */

  const currentBatterSlotIndex = currentBatterIndex % Math.max(lineupPlayers.length, 1)
  const phPlayerId = pinhitters[currentBatterSlotIndex]
  const currentLiveBatter = phPlayerId
    ? (allPlayers.find((p) => p.id === phPlayerId) ?? lineupPlayers[currentBatterSlotIndex] ?? null)
    : (lineupPlayers[currentBatterSlotIndex] ?? null)

  const livePitcher =
    allPlayers.find((p) => p.id === livePitcherId) ??
    allPlayers.find((p) => p.positions.includes("P")) ??
    activePlayer

  const currentLivePitchPlays = useMemo(
    () => livePitchPlays.filter((p) => p.pitcherId === livePitcher.id),
    [livePitchPlays, livePitcher.id]
  )
  const currentLivePitchingEntry = useMemo(
    () => buildPitchingEntryFromPlays(currentLivePitchPlays),
    [currentLivePitchPlays]
  )

  const currentInningPlays = livePlays.filter((p) => p.inning === liveInning && p.half === liveHalf)
  const currentInningRuns = currentInningPlays.reduce((t, p) => t + p.runs, 0)
  const currentInningHits = currentInningPlays.reduce((t, p) => t + p.statLine.H, 0)

  const currentFrameBattingPlays = livePlays.filter((p) => p.inning === liveInning && p.half === liveHalf)
  const currentFramePitchingPlays = livePitchPlays.filter((p) => p.inning === liveInning && p.half === liveHalf)
  // Once any play is recorded in a half-inning, the mode locks for that frame to prevent mixed batting/pitching data
  const currentFrameLocksRecordMode: LiveGameTab | null =
    currentFrameBattingPlays.length > 0 ? "batting"
    : currentFramePitchingPlays.length > 0 ? "pitching"
    : null

  // Game-level lock: once batting half is established, the other half is pitching-only.
  // Mirrors handleSyncLiveGame's teamBattingHalf logic to keep scores consistent.
  const gameBattingHalf: GameHalf | null =
    livePlays.length > 0 ? livePlays[0].half
    : livePitchPlays.length > 0 ? (livePitchPlays[0].half === "Top" ? "Bottom" : "Top")
    : null
  const isLiveBattingBlocked =
    currentFrameLocksRecordMode === "pitching" ||
    (gameBattingHalf !== null && liveHalf !== gameBattingHalf)
  const isLivePitchingBlocked =
    currentFrameLocksRecordMode === "batting" ||
    (gameBattingHalf !== null && liveHalf === gameBattingHalf)

  const liveInningSummaries = useMemo((): LiveInningSummary[] => {
    const summaries = new Map<string, LiveInningSummary>()
    const ensure = (inning: number, half: GameHalf) => {
      const key = `${inning}-${half}`
      const existing = summaries.get(key)
      if (existing) return existing
      const next: LiveInningSummary = { inning, half, batting: [], pitching: [] }
      summaries.set(key, next)
      return next
    }
    // Fill every frame from Top 1 through the current half-inning so gaps don't appear
    const halves: GameHalf[] = ["Top", "Bottom"]
    outer: for (let i = 1; i <= liveInning; i++) {
      for (const h of halves) {
        ensure(i, h)
        if (i === liveInning && h === liveHalf) break outer
      }
    }
    livePlays.forEach((p) => ensure(p.inning, p.half).batting.push(p))
    livePitchPlays.forEach((p) => ensure(p.inning, p.half).pitching.push(p))
    return Array.from(summaries.values()).sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      return a.half === b.half ? 0 : a.half === "Top" ? -1 : 1
    })
  }, [liveHalf, liveInning, livePitchPlays, livePlays])

  /* ---------------- PLAY RECORDER ---------------- */

  const {
    handleRecordLivePlay,
    handleUndoLivePlay,
    handleRecordLivePitch,
    handleUndoLivePitch,
  } = useLivePlayRecorder({
    liveGameTab,
    isMetaComplete,
    currentLiveBatter,
    lineupPlayers,
    lineupIds,
    currentBatterSlotIndex,
    phPlayerId,
    isLiveBattingBlocked,
    isLivePitchingBlocked,
    livePitcher,
    liveOuts,
    setLiveOuts,
    liveInning,
    setLiveInning,
    liveHalf,
    setLiveHalf,
    bases,
    setBases,
    selectedBase,
    setSelectedBase,
    setAwayScore,
    setHomeScore,
    quickRbi,
    setQuickRbi,
    quickNote,
    setQuickNote,
    quickPitchNote,
    setQuickPitchNote,
    livePlays,
    setLivePlays,
    livePitchPlays,
    setLivePitchPlays,
    setLineupIds,
    setPinhitters,
    setReplacedLineupIds,
    setCurrentBatterIndex,
    setLivePitchingEntry,
    setExpandedLiveInningKey,
    setLiveGameTab,
  })

  /* ---------------- RUNNER HANDLERS ---------------- */

  const handleSetLiveGameTab = (next: LiveGameTab) => {
    if (next === "batting" && isLiveBattingBlocked) return
    if (next === "pitching" && isLivePitchingBlocked) return
    setLiveGameTab(next)
  }

  const handleUndoLiveAction = (tab: LiveGameTab) => {
    if (undoLatestRunnerAction(tab)) return
    if (tab === "batting") handleUndoLivePlay()
    else handleUndoLivePitch()
  }

  /* ---------------- CURSOR SYNC ---------------- */

  const syncMainCursorToLivePlay = (play: LivePlay) => {
    const lineupIndex = lineupIds.findIndex((id) => id === play.playerId)
    setLiveGameTab("batting"); setLiveInning(play.inning); setLiveHalf(play.half)
    setLiveOuts(play.outsBefore); setBases(play.basesBefore ?? emptyBases); setSelectedBase(null)
    setExpandedLiveInningKey(`${play.inning}-${play.half}`)
    if (lineupIndex >= 0) setCurrentBatterIndex(lineupIndex)
  }

  const syncMainCursorToLivePitchPlay = (play: LivePitchPlay) => {
    setLiveGameTab("pitching"); setLiveInning(play.inning); setLiveHalf(play.half)
    setLiveOuts(play.outsBefore); setBases(play.basesBefore ?? emptyBases); setSelectedBase(null)
    setExpandedLiveInningKey(`${play.inning}-${play.half}`)
    setLivePitcherId(play.pitcherId)
  }

  /* ---------------- SYNC / RESET ---------------- */

  const resetLiveState = () => {
    setLivePlays([]); setCurrentBatterIndex(0); setLiveInning(1); setLiveHalf("Top"); setLiveOuts(0)
    setBases(emptyBases); setSelectedBase(null)
    clearRunnerHistory()
    setReplacedLineupIds({}); setAwayScore(0); setHomeScore(0)
    setLivePitchPlays([]); setQuickPitchNote(""); setLivePitchingEntry(emptyPitchingStats)
  }

  const handleSyncLiveGame = async () => {
    if (!isMetaComplete || (livePlays.length === 0 && livePitchPlays.length === 0)) return
    // Determine which half the team bats in from recorded plays.
    // Batting plays → team's half. Pitching plays → opponent's half (so team is the other).
    // Defaults to "Top" (away) if no plays exist to infer from.
    const teamBattingHalf =
      livePlays.length > 0
        ? livePlays[0].half
        : livePitchPlays.length > 0
          ? (livePitchPlays[0].half === "Top" ? "Bottom" : "Top")
          : "Top"
    const teamScore = teamBattingHalf === "Top" ? awayScore : homeScore
    const opponentScore = teamBattingHalf === "Top" ? homeScore : awayScore
    const liveGameMeta: DraftGameMeta = {
      ...gameMeta,
      teamScore,
      opponentScore,
      result: teamScore > opponentScore ? "W" : teamScore < opponentScore ? "L" : "T",
    }
    try {
      setIsSaving(true)
      await onSaveGame(
        liveGameMeta,
        aggregateLivePlays(livePlays, allPlayers, livePitchPlays),
        aggregateLivePitchingPlays(livePitchPlays, allPlayers)
      )
      resetLiveState()
      clearLocalDraft()
    } catch { /* error surfaced via saveError prop */ }
    finally { setIsSaving(false) }
  }

  const handleResetLiveGame = () => {
    if ((livePlays.length > 0 || livePitchPlays.length > 0) && !window.confirm("Clear this local game draft?")) return
    resetLiveState()
    setQuickRbi(null)
    clearLocalDraft()
  }

  return {
    // state
    liveGameTab, awayScore, setAwayScore, homeScore, setHomeScore,
    liveInning, setLiveInning, liveHalf, setLiveHalf, liveOuts, setLiveOuts,
    bases, setBases, selectedBase, setSelectedBase,
    lineupIds, lineupPlayers, currentBatterIndex, setCurrentBatterIndex,
    pinhitters, setPinhitters, replacedLineupIds,
    pendingRemoveIndex, setPendingRemoveIndex,
    pendingSyncConfirm, setPendingSyncConfirm,
    livePitcherId, setLivePitcherId, livePitcher,
    livePlays, livePitchPlays,
    currentLiveBatter, currentLivePitchPlays, currentLivePitchingEntry,
    currentInningPlays, currentInningRuns, currentInningHits,
    currentFrameLocksRecordMode, isLiveBattingBlocked, isLivePitchingBlocked,
    liveInningSummaries,
    expandedLiveInningKey, setExpandedLiveInningKey,
    editingLiveEventId, setEditingLiveEventId,
    runnerOutHistory, runnerRbiHistory, runnerRunHistory,
    quickRbi, setQuickRbi, quickNote, setQuickNote, quickPitchNote, setQuickPitchNote,
    dragLineupIndex, setDragLineupIndex, dragOverLineupIndex, setDragOverLineupIndex,
    lastLocalSaveAt, isSaving,
    // handlers
    handleSetLiveGameTab,
    handleLineupChange, handleAddLineupSpot, handleRemoveLineupSpot, handleLineupDrop,
    handleRunnerOut, handleRunnerRbi, handleRunnerRun,
    handleUndoLiveAction,
    handleRecordLivePlay, handleUndoLivePlay,
    handleRecordLivePitch, handleUndoLivePitch,
    syncMainCursorToLivePlay, syncMainCursorToLivePitchPlay,
    handleDeleteLivePlay, handleDeleteLivePitchPlay,
    handleUpdateLivePlay, handleUpdateLivePitchPlay,
    handleSyncLiveGame, handleResetLiveGame,
  }
}
