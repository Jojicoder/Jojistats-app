import { useEffect, useRef, useSyncExternalStore } from "react"
import type { Dispatch, SetStateAction } from "react"
import type {
  BaseName,
  BasesState,
  GameHalf,
  LivePitchingStats,
  LivePitchPlay,
  LivePlay,
  RunnerOutAction,
  RunnerRbiAction,
  RunnerRunAction,
} from "./RecordGamePage.types"

type DraftState = {
  lineupIds: string[]
  currentBatterIndex: number
  liveInning: number
  liveHalf: GameHalf
  liveOuts: number
  bases: BasesState
  awayScore: number
  homeScore: number
  quickPitchNote: string
  selectedBase: BaseName | null
  runnerOutHistory: RunnerOutAction[]
  runnerRbiHistory: RunnerRbiAction[]
  runnerRunHistory: RunnerRunAction[]
  replacedLineupIds: Record<number, string>
  livePlays: LivePlay[]
  livePitcherId: string
  livePitchingEntry: LivePitchingStats
  livePitchPlays: LivePitchPlay[]
}

type DraftSnapshot = Partial<DraftState>

type Input = DraftState & {
  localDraftKey: string
  setLineupIds: Dispatch<SetStateAction<string[]>>
  setCurrentBatterIndex: Dispatch<SetStateAction<number>>
  setLiveInning: Dispatch<SetStateAction<number>>
  setLiveHalf: Dispatch<SetStateAction<GameHalf>>
  setLiveOuts: Dispatch<SetStateAction<number>>
  setBases: Dispatch<SetStateAction<BasesState>>
  setAwayScore: Dispatch<SetStateAction<number>>
  setHomeScore: Dispatch<SetStateAction<number>>
  setQuickPitchNote: Dispatch<SetStateAction<string>>
  setSelectedBase: Dispatch<SetStateAction<BaseName | null>>
  setRunnerOutHistory: Dispatch<SetStateAction<RunnerOutAction[]>>
  setRunnerRbiHistory: Dispatch<SetStateAction<RunnerRbiAction[]>>
  setRunnerRunHistory: Dispatch<SetStateAction<RunnerRunAction[]>>
  setReplacedLineupIds: Dispatch<SetStateAction<Record<number, string>>>
  setLivePlays: Dispatch<SetStateAction<LivePlay[]>>
  setLivePitcherId: Dispatch<SetStateAction<string>>
  setLivePitchingEntry: Dispatch<SetStateAction<LivePitchingStats>>
  setLivePitchPlays: Dispatch<SetStateAction<LivePitchPlay[]>>
}

function readDraft(localDraftKey: string): DraftSnapshot | null {
  try {
    const savedDraft = window.localStorage.getItem(localDraftKey)
    return savedDraft ? (JSON.parse(savedDraft) as DraftSnapshot) : null
  } catch (error) {
    console.error(error)
    return null
  }
}

function formatLocalSaveTime() {
  return new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
}

const localSaveTimes = new Map<string, string>()
const localSaveListeners = new Set<() => void>()

function subscribeToLocalSaveTime(listener: () => void) {
  localSaveListeners.add(listener)
  return () => localSaveListeners.delete(listener)
}

function getLocalSaveTime(localDraftKey: string) {
  return localSaveTimes.get(localDraftKey) ?? ""
}

function publishLocalSaveTime(localDraftKey: string) {
  localSaveTimes.set(localDraftKey, formatLocalSaveTime())
  localSaveListeners.forEach((listener) => listener())
}

export function useLiveGameDraft({
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
}: Input) {
  const skipNextSaveRef = useRef(true)
  const lastLocalSaveAt = useSyncExternalStore(
    subscribeToLocalSaveTime,
    () => getLocalSaveTime(localDraftKey),
    () => ""
  )

  useEffect(() => {
    const draft = readDraft(localDraftKey)
    skipNextSaveRef.current = true
    if (!draft) return

    if (draft.lineupIds?.length) setLineupIds(draft.lineupIds)
    if (typeof draft.currentBatterIndex === "number") setCurrentBatterIndex(draft.currentBatterIndex)
    if (typeof draft.liveInning === "number") setLiveInning(draft.liveInning)
    if (draft.liveHalf === "Top" || draft.liveHalf === "Bottom") setLiveHalf(draft.liveHalf)
    if (typeof draft.liveOuts === "number") setLiveOuts(draft.liveOuts)
    if (draft.bases) setBases(draft.bases)
    if (typeof draft.awayScore === "number") setAwayScore(draft.awayScore)
    if (typeof draft.homeScore === "number") setHomeScore(draft.homeScore)
    if (typeof draft.quickPitchNote === "string") setQuickPitchNote(draft.quickPitchNote)
    if (draft.selectedBase === "first" || draft.selectedBase === "second" || draft.selectedBase === "third") {
      setSelectedBase(draft.selectedBase)
    }
    if (Array.isArray(draft.runnerOutHistory)) setRunnerOutHistory(draft.runnerOutHistory)
    if (Array.isArray(draft.runnerRbiHistory)) setRunnerRbiHistory(draft.runnerRbiHistory)
    if (Array.isArray(draft.runnerRunHistory)) setRunnerRunHistory(draft.runnerRunHistory)
    if (draft.replacedLineupIds) setReplacedLineupIds(draft.replacedLineupIds)
    if (Array.isArray(draft.livePlays)) setLivePlays(draft.livePlays)
    if (draft.livePitcherId) setLivePitcherId(draft.livePitcherId)
    if (draft.livePitchingEntry) {
      setLivePitchingEntry({ ...draft.livePitchingEntry, hitBatters: draft.livePitchingEntry.hitBatters ?? 0 })
    }
    if (Array.isArray(draft.livePitchPlays)) setLivePitchPlays(draft.livePitchPlays)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localDraftKey])

  useEffect(() => {
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false
      return
    }

    const draft: DraftState = {
      lineupIds,
      currentBatterIndex,
      liveInning,
      liveHalf,
      liveOuts,
      bases,
      awayScore,
      homeScore,
      quickPitchNote,
      selectedBase,
      runnerOutHistory,
      runnerRbiHistory,
      runnerRunHistory,
      replacedLineupIds,
      livePlays,
      livePitcherId,
      livePitchingEntry,
      livePitchPlays,
    }
    window.localStorage.setItem(localDraftKey, JSON.stringify(draft))
    publishLocalSaveTime(localDraftKey)
  }, [
    awayScore,
    bases,
    currentBatterIndex,
    homeScore,
    lineupIds,
    liveHalf,
    liveInning,
    liveOuts,
    livePitcherId,
    livePitchPlays,
    livePitchingEntry,
    livePlays,
    localDraftKey,
    quickPitchNote,
    replacedLineupIds,
    runnerOutHistory,
    runnerRbiHistory,
    runnerRunHistory,
    selectedBase,
  ])

  const clearLocalDraft = () => {
    window.localStorage.removeItem(localDraftKey)
  }

  return { lastLocalSaveAt, clearLocalDraft }
}
