import { useState, useEffect, useMemo } from "react"
import type { Player, DraftGameMeta } from "../types"
import type {
  GameHalf, BaseName, BasesState, LiveGameTab,
  LivePlay, LivePitchPlay, LivePlayResult, LivePitchResult,
  LiveInningSummary, LivePitchingStats,
  RecordGamePageProps,
} from "./RecordGamePage.types"
import {
  emptyBases, buildLiveStatLine, isOutResult, isPitchOutResult,
  getNextHalfInning, nextBasesForBatting, nextBasesForPitching,
  estimateRunsForBatting, estimateRbiForBatting,
  estimateRunsForPitching, estimateEarnedRunsForPitching,
  buildPitchingEntryFromPlays,
  aggregateLivePlays, aggregateLivePitchingPlays,
} from "./RecordGamePage.utils"
import { useLiveLineup } from "./useLiveLineup"
import { useLiveGameDraft } from "./useLiveGameDraft"
import { useLivePlayEditor } from "./useLivePlayEditor"
import { useRunnerControls } from "./useRunnerControls"

const emptyPitchingStats: LivePitchingStats = {
  inningsPitchedOuts: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
  walks: 0, hitBatters: 0, strikeouts: 0, homeRunsAllowed: 0,
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
  const [quickRbi, setQuickRbi] = useState(0)
  const [quickNote, setQuickNote] = useState("")
  const [quickPitchNote, setQuickPitchNote] = useState("")
  const [livePlays, setLivePlays] = useState<LivePlay[]>([])
  const [livePitchPlays, setLivePitchPlays] = useState<LivePitchPlay[]>([])
  const [livePitchingEntry, setLivePitchingEntry] = useState<LivePitchingStats>(emptyPitchingStats)
  const [livePitcherId, setLivePitcherId] = useState(
    allPlayers.find((p) => p.position === "P")?.id ?? activePlayer.id
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
    allPlayers.find((p) => p.position === "P") ??
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
  const isLiveBattingBlocked = currentFrameLocksRecordMode === "pitching"
  const isLivePitchingBlocked = currentFrameLocksRecordMode === "batting"

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
    ensure(liveInning, liveHalf)
    livePlays.forEach((p) => ensure(p.inning, p.half).batting.push(p))
    livePitchPlays.forEach((p) => ensure(p.inning, p.half).pitching.push(p))
    return Array.from(summaries.values()).sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      return a.half === b.half ? 0 : a.half === "Top" ? -1 : 1
    })
  }, [liveHalf, liveInning, livePitchPlays, livePlays])

  /* ---------------- GAME STATE ADVANCE ---------------- */

  const advanceGameState = (result: LivePlayResult) => {
    const nextOuts = liveOuts + (isOutResult(result) ? 1 : 0)
    if (nextOuts < 3) { setLiveOuts(nextOuts); return }
    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0); setBases(emptyBases); setLiveGameTab("pitching")
    setLiveHalf(next.half); setLiveInning(next.inning)
  }

  const advancePitchGameState = (result: LivePitchResult) => {
    const nextOuts = liveOuts + (isPitchOutResult(result) ? 1 : 0)
    if (nextOuts < 3) { setLiveOuts(nextOuts); return }
    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0); setBases(emptyBases); setLiveGameTab("batting")
    setLiveHalf(next.half); setLiveInning(next.inning)
  }

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

  /* ---------------- LIVE PLAY HANDLERS ---------------- */

  const handleRecordLivePlay = (result: LivePlayResult) => {
    if (liveGameTab !== "batting" || !isMetaComplete || !currentLiveBatter || lineupPlayers.length === 0 || isLiveBattingBlocked) return
    const autoRbi = estimateRbiForBatting(bases, result)
    const rbi = quickRbi > 0 ? quickRbi : autoRbi
    const runs = estimateRunsForBatting(bases, result, rbi)
    const statLine = buildLiveStatLine(result, rbi)
    const play: LivePlay = {
      id: `${Date.now()}-${currentLiveBatter.id}`,
      playerId: currentLiveBatter.id, playerName: currentLiveBatter.name,
      result, inning: liveInning, half: liveHalf, outsBefore: liveOuts,
      basesBefore: bases, rbi, runs, note: quickNote, statLine,
    }
    setLivePlays((prev) => [...prev, play])
    setBases(nextBasesForBatting(bases, result, rbi))
    if (runs > 0) {
      if (liveHalf === "Top") setAwayScore((prev) => prev + runs)
      else setHomeScore((prev) => prev + runs)
    }
    advanceGameState(result)
    if (phPlayerId) {
      const replacedId = lineupIds[currentBatterSlotIndex]
      if (replacedId && replacedId !== phPlayerId)
        setReplacedLineupIds((prev) => ({ ...prev, [currentBatterSlotIndex]: replacedId }))
      setLineupIds((prev) => prev.map((id, i) => (i === currentBatterSlotIndex ? phPlayerId : id)))
      setPinhitters((prev) => { const next = { ...prev }; delete next[currentBatterSlotIndex]; return next })
    }
    setCurrentBatterIndex((prev) => (prev + 1) % lineupPlayers.length)
    setQuickRbi(0)
    setQuickNote("")
  }

  const handleUndoLivePlay = () => {
    const last = livePlays[livePlays.length - 1]
    if (!last) return
    setLivePlays((prev) => prev.slice(0, -1))
    setCurrentBatterIndex((prev) =>
      lineupPlayers.length === 0 ? 0 : (prev - 1 + lineupPlayers.length) % lineupPlayers.length
    )
    setLiveInning(last.inning); setLiveHalf(last.half); setLiveOuts(last.outsBefore)
    setBases(last.basesBefore ?? emptyBases)
    if (last.half === "Top") setAwayScore((prev) => Math.max(prev - last.runs, 0))
    else setHomeScore((prev) => Math.max(prev - last.runs, 0))
  }

  const handleRecordLivePitch = (result: LivePitchResult) => {
    if (liveGameTab !== "pitching" || !isMetaComplete || !livePitcher || isLivePitchingBlocked) return
    const basesBefore = bases
    const scoreSelectedRunner = (result === "R" || result === "ER") && selectedBase && bases[selectedBase]
    const pitchPlay: LivePitchPlay = {
      id: `${Date.now()}-${livePitcher.id}`,
      pitcherId: livePitcher.id, pitcherName: livePitcher.name,
      result, inning: liveInning, half: liveHalf, outsBefore: liveOuts,
      basesBefore, note: quickPitchNote,
    }
    setLivePitchPlays((prev) => [...prev, pitchPlay])
    setBases(scoreSelectedRunner && selectedBase ? { ...bases, [selectedBase]: false } : nextBasesForPitching(bases, result))
    if (scoreSelectedRunner) setSelectedBase(null)
    const pitchingRuns = estimateRunsForPitching(basesBefore, result)
    if (pitchingRuns > 0) {
      if (liveHalf === "Top") setAwayScore((prev) => prev + pitchingRuns)
      else setHomeScore((prev) => prev + pitchingRuns)
    }
    setLivePitchingEntry((prev) => ({
      inningsPitchedOuts: prev.inningsPitchedOuts + (isPitchOutResult(result) ? 1 : 0),
      hitsAllowed: prev.hitsAllowed + (result === "H" || result === "2B" || result === "3B" || result === "HR" ? 1 : 0),
      runsAllowed: prev.runsAllowed + pitchingRuns,
      earnedRuns: prev.earnedRuns + estimateEarnedRunsForPitching(basesBefore, result),
      walks: prev.walks + (result === "BB" ? 1 : 0),
      hitBatters: prev.hitBatters + (result === "HBP" ? 1 : 0),
      strikeouts: prev.strikeouts + (result === "SO" ? 1 : 0),
      homeRunsAllowed: prev.homeRunsAllowed + (result === "HR" ? 1 : 0),
    }))
    setQuickPitchNote("")
    advancePitchGameState(result)
  }

  const handleUndoLivePitch = () => {
    const last = livePitchPlays[livePitchPlays.length - 1]
    if (!last) return
    setLivePitchPlays((prev) => prev.slice(0, -1))
    setLiveInning(last.inning); setLiveHalf(last.half); setLiveOuts(last.outsBefore)
    setBases(last.basesBefore ?? emptyBases)
    const pitchingRuns = estimateRunsForPitching(last.basesBefore ?? emptyBases, last.result)
    if (pitchingRuns > 0) {
      if (last.half === "Top") setAwayScore((prev) => Math.max(prev - pitchingRuns, 0))
      else setHomeScore((prev) => Math.max(prev - pitchingRuns, 0))
    }
    setLivePitchingEntry((prev) => ({
      inningsPitchedOuts: Math.max(prev.inningsPitchedOuts - (isPitchOutResult(last.result) ? 1 : 0), 0),
      hitsAllowed: Math.max(prev.hitsAllowed - (last.result === "H" || last.result === "2B" || last.result === "3B" || last.result === "HR" ? 1 : 0), 0),
      runsAllowed: Math.max(prev.runsAllowed - pitchingRuns, 0),
      earnedRuns: Math.max(prev.earnedRuns - estimateEarnedRunsForPitching(last.basesBefore ?? emptyBases, last.result), 0),
      walks: Math.max(prev.walks - (last.result === "BB" ? 1 : 0), 0),
      hitBatters: Math.max(prev.hitBatters - (last.result === "HBP" ? 1 : 0), 0),
      strikeouts: Math.max(prev.strikeouts - (last.result === "SO" ? 1 : 0), 0),
      homeRunsAllowed: Math.max(prev.homeRunsAllowed - (last.result === "HR" ? 1 : 0), 0),
    }))
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
    const liveGameMeta: DraftGameMeta = {
      ...gameMeta,
      teamScore: awayScore,
      opponentScore: homeScore,
      result: awayScore > homeScore ? "W" : awayScore < homeScore ? "L" : "T",
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
    setQuickRbi(0)
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
