import type { Dispatch, SetStateAction } from "react"
import type { Player } from "../types"
import type {
  GameHalf,
  BaseName,
  BasesState,
  LiveGameTab,
  LivePlay,
  LivePitchPlay,
  LivePlayResult,
  LivePitchResult,
  LivePitchingStats,
} from "../components/RecordGamePage.types"
import { emptyBases } from "../components/gameConstants"
import {
  buildLiveStatLine,
  isOutResult,
  isPitchOutResult,
  getNextHalfInning,
  nextBasesForBatting,
  nextBasesForPitching,
  estimateRunsForBatting,
  estimateRbiForBatting,
  estimateRunsForPitching,
  estimateEarnedRunsForPitching,
} from "../components/gameStatUtils"

type Input = {
  liveGameTab: LiveGameTab
  isMetaComplete: boolean
  currentLiveBatter: Player | null
  lineupPlayers: Player[]
  lineupIds: string[]
  currentBatterSlotIndex: number
  phPlayerId: string | undefined
  isLiveBattingBlocked: boolean
  isLivePitchingBlocked: boolean
  livePitcher: Player
  liveOuts: number
  setLiveOuts: Dispatch<SetStateAction<number>>
  liveInning: number
  setLiveInning: Dispatch<SetStateAction<number>>
  liveHalf: GameHalf
  setLiveHalf: Dispatch<SetStateAction<GameHalf>>
  bases: BasesState
  setBases: Dispatch<SetStateAction<BasesState>>
  selectedBase: BaseName | null
  setSelectedBase: Dispatch<SetStateAction<BaseName | null>>
  setAwayScore: Dispatch<SetStateAction<number>>
  setHomeScore: Dispatch<SetStateAction<number>>
  quickRbi: number | null
  setQuickRbi: Dispatch<SetStateAction<number | null>>
  quickNote: string
  setQuickNote: Dispatch<SetStateAction<string>>
  quickPitchNote: string
  setQuickPitchNote: Dispatch<SetStateAction<string>>
  livePlays: LivePlay[]
  setLivePlays: Dispatch<SetStateAction<LivePlay[]>>
  livePitchPlays: LivePitchPlay[]
  setLivePitchPlays: Dispatch<SetStateAction<LivePitchPlay[]>>
  setLineupIds: Dispatch<SetStateAction<string[]>>
  setPinhitters: Dispatch<SetStateAction<Record<number, string>>>
  setReplacedLineupIds: Dispatch<SetStateAction<Record<number, string>>>
  setCurrentBatterIndex: Dispatch<SetStateAction<number>>
  setLivePitchingEntry: Dispatch<SetStateAction<LivePitchingStats>>
  setExpandedLiveInningKey: Dispatch<SetStateAction<string>>
  setLiveGameTab: Dispatch<SetStateAction<LiveGameTab>>
}

export function useLivePlayRecorder({
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
}: Input) {

  /* ---------------- GAME STATE ADVANCE ---------------- */

  const advanceGameState = (result: LivePlayResult) => {
    const nextOuts = liveOuts + (isOutResult(result) ? 1 : 0)
    if (nextOuts < 3) { setLiveOuts(nextOuts); return }
    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0); setBases(emptyBases); setLiveGameTab("pitching")
    setLiveHalf(next.half); setLiveInning(next.inning)
    setExpandedLiveInningKey(`${next.inning}-${next.half}`)
  }

  const advancePitchGameState = (result: LivePitchResult) => {
    const nextOuts = liveOuts + (isPitchOutResult(result) ? 1 : 0)
    if (nextOuts < 3) { setLiveOuts(nextOuts); return }
    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0); setBases(emptyBases); setLiveGameTab("batting")
    setLiveHalf(next.half); setLiveInning(next.inning)
    setExpandedLiveInningKey(`${next.inning}-${next.half}`)
  }

  /* ---------------- BATTING ---------------- */

  const handleRecordLivePlay = (result: LivePlayResult) => {
    if (liveGameTab !== "batting" || !isMetaComplete || !currentLiveBatter || lineupPlayers.length === 0 || isLiveBattingBlocked) return
    const autoRbi = estimateRbiForBatting(bases, result)
    const rbi = quickRbi != null ? quickRbi : autoRbi
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
    setQuickRbi(null)
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

  /* ---------------- PITCHING ---------------- */

  const handleRecordLivePitch = (result: LivePitchResult) => {
    if (liveGameTab !== "pitching" || !isMetaComplete || !livePitcher || isLivePitchingBlocked) return
    const basesBefore = bases
    const scoreSelectedRunner = (result === "R" || result === "ER") && selectedBase && bases[selectedBase]
    const pitchPlay: LivePitchPlay = {
      id: `${Date.now()}-${livePitcher.id}`,
      pitcherId: livePitcher.id, pitcherName: livePitcher.name,
      result, inning: liveInning, half: liveHalf, outsBefore: liveOuts,
      basesBefore, note: quickPitchNote,
      scoredBase: scoreSelectedRunner && selectedBase ? selectedBase : null,
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
      note: prev.note,
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
      note: prev.note,
    }))
  }

  return {
    handleRecordLivePlay,
    handleUndoLivePlay,
    handleRecordLivePitch,
    handleUndoLivePitch,
  }
}
