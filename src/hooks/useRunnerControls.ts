import { useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  BaseName,
  BasesState,
  GameHalf,
  LiveGameTab,
  LivePlay,
  RunnerOutAction,
  RunnerRbiAction,
  RunnerRunAction,
} from "../components/RecordGamePage.types"
import { emptyBases } from "../components/gameConstants"
import { getNextHalfInning } from "../components/gameStatUtils"

type Input = {
  liveInning: number
  setLiveInning: Dispatch<SetStateAction<number>>
  liveHalf: GameHalf
  setLiveHalf: Dispatch<SetStateAction<GameHalf>>
  liveOuts: number
  setLiveOuts: Dispatch<SetStateAction<number>>
  bases: BasesState
  setBases: Dispatch<SetStateAction<BasesState>>
  selectedBase: BaseName | null
  setSelectedBase: Dispatch<SetStateAction<BaseName | null>>
  liveGameTab: LiveGameTab
  setLiveGameTab: Dispatch<SetStateAction<LiveGameTab>>
  livePlays: LivePlay[]
  setLivePlays: Dispatch<SetStateAction<LivePlay[]>>
  latestLivePitchPlayId?: string
  setAwayScore: Dispatch<SetStateAction<number>>
  setHomeScore: Dispatch<SetStateAction<number>>
}

const getActionTime = (id: string | undefined) => {
  if (!id) return 0
  const t = Number(id.split("-")[0])
  return Number.isFinite(t) ? t : 0
}

export function useRunnerControls({
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
  latestLivePitchPlayId,
  setAwayScore,
  setHomeScore,
}: Input) {
  const [runnerOutHistory, setRunnerOutHistory] = useState<RunnerOutAction[]>([])
  const [runnerRbiHistory, setRunnerRbiHistory] = useState<RunnerRbiAction[]>([])
  const [runnerRunHistory, setRunnerRunHistory] = useState<RunnerRunAction[]>([])

  const handleRunnerOut = () => {
    if (!selectedBase || !bases[selectedBase]) return
    setRunnerOutHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-runner-out`,
        inning: liveInning,
        half: liveHalf,
        outsBefore: liveOuts,
        basesBefore: bases,
        tabBefore: liveGameTab,
      },
    ])

    const nextBases = { ...bases, [selectedBase]: false }
    const nextOuts = liveOuts + 1
    setSelectedBase(null)
    if (nextOuts < 3) {
      setBases(nextBases)
      setLiveOuts(nextOuts)
      return
    }

    const next = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0)
    setBases(emptyBases)
    setLiveGameTab(liveGameTab === "batting" ? "pitching" : "batting")
    setLiveHalf(next.half)
    setLiveInning(next.inning)
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
    setLiveInning(last.inning)
    setLiveHalf(last.half)
    setLiveOuts(last.outsBefore)
    setBases(last.basesBefore)
    setLiveGameTab(last.tabBefore)
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

  const getLatestRunnerAction = (tab: LiveGameTab) => {
    const lastOut = runnerOutHistory[runnerOutHistory.length - 1]
    const lastRbi = tab === "batting" ? runnerRbiHistory[runnerRbiHistory.length - 1] : undefined
    const lastRun = tab === "batting" ? runnerRunHistory[runnerRunHistory.length - 1] : undefined
    const lastPlayTime = tab === "batting"
      ? getActionTime(livePlays[livePlays.length - 1]?.id)
      : getActionTime(latestLivePitchPlayId)
    const runnerActions = [
      lastRun ? { type: "run" as const, time: getActionTime(lastRun.id) } : null,
      lastRbi ? { type: "rbi" as const, time: getActionTime(lastRbi.id) } : null,
      lastOut ? { type: "out" as const, time: getActionTime(lastOut.id) } : null,
    ].filter((action): action is { type: "run" | "rbi" | "out"; time: number } => Boolean(action))
      .sort((a, b) => b.time - a.time)

    const latest = runnerActions[0]
    if (!latest || latest.time <= lastPlayTime) return null
    return latest.type
  }

  const undoLatestRunnerAction = (tab: LiveGameTab) => {
    const latest = getLatestRunnerAction(tab)
    if (latest === "run") return undoRunnerRun()
    if (latest === "rbi") return undoRunnerRbi()
    if (latest === "out") return undoRunnerOut()
    return false
  }

  const clearRunnerHistory = () => {
    setRunnerOutHistory([])
    setRunnerRbiHistory([])
    setRunnerRunHistory([])
  }

  return {
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
  }
}
