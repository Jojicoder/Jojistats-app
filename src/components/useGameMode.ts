import { useState, useEffect, useMemo } from "react"
import type { Player, DraftGameMeta } from "../types"
import type {
  GameHalf, BaseName, BasesState, LiveGameTab,
  LivePlay, LivePitchPlay, LivePlayResult, LivePitchResult,
  RunnerOutAction, RunnerRbiAction, RunnerRunAction, LiveInningSummary,
  RecordGamePageProps,
} from "./RecordGamePage.types"
import {
  emptyBases, buildLiveStatLine, isOutResult, isPitchOutResult,
  getNextHalfInning, nextBasesForBatting, nextBasesForPitching,
  estimateRunsForBatting, estimateRbiForBatting,
  estimateRunsForPitching, estimateEarnedRunsForPitching,
  buildPitchingEntryFromPlays, recomputeLiveGame,
  aggregateLivePlays, aggregateLivePitchingPlays, getActionTimeFromId,
} from "./RecordGamePage.utils"

type LivePitchingStats = {
  inningsPitchedOuts: number
  hitsAllowed: number
  runsAllowed: number
  earnedRuns: number
  walks: number
  hitBatters: number
  strikeouts: number
  homeRunsAllowed: number
}

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
  const [runnerOutHistory, setRunnerOutHistory] = useState<RunnerOutAction[]>([])
  const [runnerRbiHistory, setRunnerRbiHistory] = useState<RunnerRbiAction[]>([])
  const [runnerRunHistory, setRunnerRunHistory] = useState<RunnerRunAction[]>([])
  const [livePlays, setLivePlays] = useState<LivePlay[]>([])
  const [livePitchPlays, setLivePitchPlays] = useState<LivePitchPlay[]>([])
  const [livePitchingEntry, setLivePitchingEntry] = useState<LivePitchingStats>(emptyPitchingStats)
  const [livePitcherId, setLivePitcherId] = useState(
    allPlayers.find((p) => p.position === "P")?.id ?? activePlayer.id
  )
  const [lineupIds, setLineupIds] = useState<string[]>(() =>
    allPlayers.slice(0, Math.min(allPlayers.length, 9)).map((p) => p.id)
  )
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0)
  const [pinhitters, setPinhitters] = useState<Record<number, string>>({})
  const [replacedLineupIds, setReplacedLineupIds] = useState<Record<number, string>>({})
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null)
  const [pendingSyncConfirm, setPendingSyncConfirm] = useState(false)
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState("")
  const [editingLiveEventId, setEditingLiveEventId] = useState<string | null>(null)
  const [expandedLiveInningKey, setExpandedLiveInningKey] = useState("")
  const [dragLineupIndex, setDragLineupIndex] = useState<number | null>(null)
  const [dragOverLineupIndex, setDragOverLineupIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    setLineupIds((prev) => {
      const validIds = new Set(allPlayers.map((p) => p.id))
      const next = prev.filter((id) => validIds.has(id))
      const missing = allPlayers
        .map((p) => p.id)
        .filter((id) => !next.includes(id))
        .slice(0, Math.max(9 - next.length, 0))
      return [...next, ...missing].slice(0, Math.min(allPlayers.length, 9))
    })
  }, [allPlayers])

  useEffect(() => {
    const savedDraft = window.localStorage.getItem(localDraftKey)
    if (!savedDraft) return
    try {
      const draft = JSON.parse(savedDraft) as {
        lineupIds?: string[]
        currentBatterIndex?: number
        liveInning?: number
        liveHalf?: GameHalf
        liveOuts?: number
        bases?: BasesState
        awayScore?: number
        homeScore?: number
        quickPitchNote?: string
        selectedBase?: BaseName | null
        runnerOutHistory?: RunnerOutAction[]
        runnerRbiHistory?: RunnerRbiAction[]
        runnerRunHistory?: RunnerRunAction[]
        replacedLineupIds?: Record<number, string>
        livePlays?: LivePlay[]
        livePitcherId?: string
        livePitchingEntry?: LivePitchingStats
        livePitchPlays?: LivePitchPlay[]
      }
      if (draft.lineupIds?.length) setLineupIds(draft.lineupIds)
      if (typeof draft.currentBatterIndex === "number") setCurrentBatterIndex(draft.currentBatterIndex)
      if (typeof draft.liveInning === "number") setLiveInning(draft.liveInning)
      if (draft.liveHalf === "Top" || draft.liveHalf === "Bottom") setLiveHalf(draft.liveHalf)
      if (typeof draft.liveOuts === "number") setLiveOuts(draft.liveOuts)
      if (draft.bases) setBases(draft.bases)
      if (typeof draft.awayScore === "number") setAwayScore(draft.awayScore)
      if (typeof draft.homeScore === "number") setHomeScore(draft.homeScore)
      if (typeof draft.quickPitchNote === "string") setQuickPitchNote(draft.quickPitchNote)
      if (draft.selectedBase === "first" || draft.selectedBase === "second" || draft.selectedBase === "third")
        setSelectedBase(draft.selectedBase)
      if (Array.isArray(draft.runnerOutHistory)) setRunnerOutHistory(draft.runnerOutHistory)
      if (Array.isArray(draft.runnerRbiHistory)) setRunnerRbiHistory(draft.runnerRbiHistory)
      if (Array.isArray(draft.runnerRunHistory)) setRunnerRunHistory(draft.runnerRunHistory)
      if (draft.replacedLineupIds) setReplacedLineupIds(draft.replacedLineupIds)
      if (Array.isArray(draft.livePlays)) setLivePlays(draft.livePlays)
      if (draft.livePitcherId) setLivePitcherId(draft.livePitcherId)
      if (draft.livePitchingEntry)
        setLivePitchingEntry({ ...draft.livePitchingEntry, hitBatters: draft.livePitchingEntry.hitBatters ?? 0 })
      if (Array.isArray(draft.livePitchPlays)) setLivePitchPlays(draft.livePitchPlays)
    } catch (error) {
      console.error(error)
    }
  }, [localDraftKey])

  useEffect(() => {
    const draft = {
      lineupIds, currentBatterIndex, liveInning, liveHalf, liveOuts, bases,
      awayScore, homeScore, quickPitchNote, selectedBase,
      runnerOutHistory, runnerRbiHistory, runnerRunHistory,
      replacedLineupIds, livePlays, livePitcherId, livePitchingEntry, livePitchPlays,
    }
    window.localStorage.setItem(localDraftKey, JSON.stringify(draft))
    setLastLocalSaveAt(
      new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
    )
  }, [
    awayScore, bases, currentBatterIndex, homeScore, lineupIds, liveHalf, liveInning, liveOuts,
    livePitcherId, livePitchingEntry, livePitchPlays, livePlays, localDraftKey,
    quickPitchNote, runnerOutHistory, runnerRbiHistory, runnerRunHistory, replacedLineupIds, selectedBase,
  ])

  useEffect(() => {
    const key = `${liveInning}-${liveHalf}`
    if (!expandedLiveInningKey) setExpandedLiveInningKey(key)
  }, [liveInning, liveHalf, expandedLiveInningKey])

  /* ---------------- DERIVED ---------------- */

  const lineupPlayers = lineupIds
    .map((id) => allPlayers.find((p) => p.id === id))
    .filter((p): p is Player => Boolean(p))

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

  /* ---------------- LINEUP HANDLERS ---------------- */

  const handleLineupChange = (index: number, playerId: string) => {
    setLineupIds((prev) => prev.map((id, i) => (i === index ? playerId : id)))
    setReplacedLineupIds((prev) => { const next = { ...prev }; delete next[index]; return next })
  }

  const handleAddLineupSpot = () => {
    const next = allPlayers.find((p) => !lineupIds.includes(p.id))
    if (!next) return
    setLineupIds((prev) => [...prev, next.id])
  }

  const handleRemoveLineupSpot = (index: number) => {
    setLineupIds((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setReplacedLineupIds((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const i = Number(key)
        if (i < index) next[i] = value
        if (i > index) next[i - 1] = value
      })
      return next
    })
    setCurrentBatterIndex((prev) => Math.max(Math.min(prev, lineupIds.length - 2), 0))
  }

  const handleLineupDrop = (toIndex: number) => {
    if (dragLineupIndex === null || dragLineupIndex === toIndex) {
      setDragLineupIndex(null); setDragOverLineupIndex(null); return
    }
    setLineupIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragLineupIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setDragLineupIndex(null)
    setDragOverLineupIndex(null)
  }

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

  const handleRunnerOut = () => {
    if (!selectedBase || !bases[selectedBase]) return
    setRunnerOutHistory((prev) => [
      ...prev,
      { id: `${Date.now()}-runner-out`, inning: liveInning, half: liveHalf, outsBefore: liveOuts, basesBefore: bases, tabBefore: liveGameTab },
    ])
    const nextBases = { ...bases, [selectedBase]: false }
    const nextOuts = liveOuts + 1
    setSelectedBase(null)
    if (nextOuts < 3) { setBases(nextBases); setLiveOuts(nextOuts); return }
    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0); setBases(emptyBases)
    setLiveGameTab(liveGameTab === "batting" ? "pitching" : "batting")
    setLiveHalf(next.half); setLiveInning(next.inning)
  }

  const handleRunnerRbi = () => {
    if (!selectedBase || !bases[selectedBase]) return
    const lastPlay = livePlays[livePlays.length - 1]
    if (!lastPlay) return
    setRunnerRbiHistory((prev) => [
      ...prev,
      { id: `${Date.now()}-runner-rbi`, half: liveHalf, basesBefore: bases, playBefore: lastPlay },
    ])
    setBases((prev) => ({ ...prev, [selectedBase]: false }))
    setSelectedBase(null)
    setLivePlays((prev) =>
      prev.map((p) =>
        p.id === lastPlay.id
          ? { ...p, rbi: p.rbi + 1, runs: p.runs + 1, statLine: { ...p.statLine, RBI: p.statLine.RBI + 1 } }
          : p
      )
    )
    if (liveHalf === "Top") setAwayScore((prev) => prev + 1)
    else setHomeScore((prev) => prev + 1)
  }

  const handleRunnerRun = () => {
    if (!selectedBase || !bases[selectedBase]) return
    setRunnerRunHistory((prev) => [
      ...prev,
      { id: `${Date.now()}-runner-run`, half: liveHalf, basesBefore: bases },
    ])
    setBases((prev) => ({ ...prev, [selectedBase]: false }))
    setSelectedBase(null)
    if (liveHalf === "Top") setAwayScore((prev) => prev + 1)
    else setHomeScore((prev) => prev + 1)
  }

  const undoRunnerOut = () => {
    const last = runnerOutHistory[runnerOutHistory.length - 1]
    if (!last) return false
    setRunnerOutHistory((prev) => prev.slice(0, -1))
    setLiveInning(last.inning); setLiveHalf(last.half); setLiveOuts(last.outsBefore)
    setBases(last.basesBefore); setLiveGameTab(last.tabBefore)
    return true
  }

  const undoRunnerRbi = () => {
    const last = runnerRbiHistory[runnerRbiHistory.length - 1]
    if (!last?.playBefore) return false
    setRunnerRbiHistory((prev) => prev.slice(0, -1))
    setBases(last.basesBefore)
    setLivePlays((prev) => prev.map((p) => (p.id === last.playBefore.id ? last.playBefore : p)))
    if (last.half === "Top") setAwayScore((prev) => Math.max(prev - 1, 0))
    else setHomeScore((prev) => Math.max(prev - 1, 0))
    return true
  }

  const undoRunnerRun = () => {
    const last = runnerRunHistory[runnerRunHistory.length - 1]
    if (!last) return false
    setRunnerRunHistory((prev) => prev.slice(0, -1))
    setBases(last.basesBefore)
    if (last.half === "Top") setAwayScore((prev) => Math.max(prev - 1, 0))
    else setHomeScore((prev) => Math.max(prev - 1, 0))
    return true
  }

  const getActionTime = (id: string | undefined) => {
    if (!id) return 0
    const t = Number(id.split("-")[0])
    return Number.isFinite(t) ? t : 0
  }

  const handleUndoLiveAction = (tab: LiveGameTab) => {
    const lastOut = runnerOutHistory[runnerOutHistory.length - 1]
    const lastRbi = tab === "batting" ? runnerRbiHistory[runnerRbiHistory.length - 1] : undefined
    const lastRun = tab === "batting" ? runnerRunHistory[runnerRunHistory.length - 1] : undefined
    const lastPlay = tab === "batting" ? livePlays[livePlays.length - 1] : livePitchPlays[livePitchPlays.length - 1]

    if (
      lastRun &&
      getActionTime(lastRun.id) > getActionTime(lastRbi?.id) &&
      getActionTime(lastRun.id) > getActionTime(lastOut?.id) &&
      getActionTime(lastRun.id) > getActionTime(lastPlay?.id)
    ) { undoRunnerRun(); return }

    if (
      lastRbi &&
      getActionTime(lastRbi.id) > getActionTime(lastOut?.id) &&
      getActionTime(lastRbi.id) > getActionTime(lastPlay?.id)
    ) { undoRunnerRbi(); return }

    if (lastOut && getActionTime(lastOut.id) > getActionTime(lastPlay?.id)) { undoRunnerOut(); return }

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

  /* ---------------- EDIT / DELETE PLAY ---------------- */

  const getBatterIndexAfterPlay = (plays: LivePlay[], playId?: string) => {
    if (lineupPlayers.length === 0) return 0
    if (!playId) return plays.length % lineupPlayers.length
    const idx = plays.findIndex((p) => p.id === playId)
    return idx < 0 ? plays.length % lineupPlayers.length : (idx + 1) % lineupPlayers.length
  }

  const applyRecomputed = (r: ReturnType<typeof recomputeLiveGame>) => {
    setLivePlays(r.livePlays); setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore); setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    setRunnerOutHistory([]); setRunnerRbiHistory([]); setRunnerRunHistory([])
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning); setLiveHalf(r.liveHalf)
    setLiveOuts(r.liveOuts); setBases(r.bases)
    setExpandedLiveInningKey(`${r.liveInning}-${r.liveHalf}`)
  }

  const handleDeleteLivePlay = (playId: string) => {
    const next = livePlays.filter((p) => p.id !== playId)
    if (editingLiveEventId === playId) setEditingLiveEventId(null)
    applyRecomputed(recomputeLiveGame(next, livePitchPlays))
  }

  const handleDeleteLivePitchPlay = (playId: string) => {
    const next = livePitchPlays.filter((p) => p.id !== playId)
    if (editingLiveEventId === playId) setEditingLiveEventId(null)
    applyRecomputed(recomputeLiveGame(livePlays, next))
  }

  const handleUpdateLivePlay = (playId: string, nextResult: LivePlayResult, nextRbi: number, nextNote: string) => {
    const play = livePlays.find((p) => p.id === playId)
    if (!play) return
    const edited = livePlays.map((p) =>
      p.id === playId ? { ...p, result: nextResult, rbi: Math.max(0, nextRbi), note: nextNote } : p
    )
    const r = recomputeLiveGame(edited, livePitchPlays)
    const cursor = r.stateAfterEvent.get(playId)
    setLivePlays(r.livePlays); setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore); setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    setRunnerOutHistory([]); setRunnerRbiHistory([]); setRunnerRunHistory([])
    if (editingLiveEventId === playId && cursor) {
      setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays, playId))
      setLiveInning(cursor.inning); setLiveHalf(cursor.half); setLiveOuts(cursor.outs); setBases(cursor.bases)
      setLiveGameTab(cursor.inning !== play.inning || cursor.half !== play.half ? "pitching" : "batting")
      setExpandedLiveInningKey(`${cursor.inning}-${cursor.half}`)
      return
    }
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning); setLiveHalf(r.liveHalf); setLiveOuts(r.liveOuts); setBases(r.bases)
    setExpandedLiveInningKey(`${r.liveInning}-${r.liveHalf}`)
  }

  const handleUpdateLivePitchPlay = (playId: string, nextResult: LivePitchResult, nextNote: string) => {
    const play = livePitchPlays.find((p) => p.id === playId)
    if (!play) return
    const edited = livePitchPlays.map((p) => (p.id === playId ? { ...p, result: nextResult, note: nextNote } : p))
    const r = recomputeLiveGame(livePlays, edited)
    const cursor = r.stateAfterEvent.get(playId)
    setLivePlays(r.livePlays); setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore); setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    setRunnerOutHistory([]); setRunnerRbiHistory([]); setRunnerRunHistory([])
    if (editingLiveEventId === playId && cursor) {
      const pitchTime = getActionTimeFromId(playId)
      const battingBeforePitch = r.livePlays.filter((p) => getActionTimeFromId(p.id) < pitchTime)
      setCurrentBatterIndex(getBatterIndexAfterPlay(battingBeforePitch))
      setLiveInning(cursor.inning); setLiveHalf(cursor.half); setLiveOuts(cursor.outs); setBases(cursor.bases)
      setLiveGameTab(cursor.inning !== play.inning || cursor.half !== play.half ? "batting" : "pitching")
      setExpandedLiveInningKey(`${cursor.inning}-${cursor.half}`)
      return
    }
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning); setLiveHalf(r.liveHalf); setLiveOuts(r.liveOuts); setBases(r.bases)
    setExpandedLiveInningKey(`${r.liveInning}-${r.liveHalf}`)
  }

  /* ---------------- SYNC / RESET ---------------- */

  const resetLiveState = () => {
    setLivePlays([]); setCurrentBatterIndex(0); setLiveInning(1); setLiveHalf("Top"); setLiveOuts(0)
    setBases(emptyBases); setSelectedBase(null)
    setRunnerOutHistory([]); setRunnerRbiHistory([]); setRunnerRunHistory([])
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
      window.localStorage.removeItem(localDraftKey)
    } catch { /* error surfaced via saveError prop */ }
    finally { setIsSaving(false) }
  }

  const handleResetLiveGame = () => {
    if ((livePlays.length > 0 || livePitchPlays.length > 0) && !window.confirm("Clear this local game draft?")) return
    resetLiveState()
    setQuickRbi(0)
    window.localStorage.removeItem(localDraftKey)
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
