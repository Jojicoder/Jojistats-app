import type { Dispatch, SetStateAction } from "react"
import type {
  BasesState,
  GameHalf,
  LiveGameTab,
  LivePitchPlay,
  LivePitchResult,
  LivePlay,
  LivePlayResult,
} from "./RecordGamePage.types"
import { getActionTimeFromId, recomputeLiveGame } from "./RecordGamePage.utils"

type LivePitchingStats = ReturnType<typeof recomputeLiveGame>["livePitchingEntry"]

type Input = {
  livePlays: LivePlay[]
  setLivePlays: Dispatch<SetStateAction<LivePlay[]>>
  livePitchPlays: LivePitchPlay[]
  setLivePitchPlays: Dispatch<SetStateAction<LivePitchPlay[]>>
  lineupLength: number
  setCurrentBatterIndex: Dispatch<SetStateAction<number>>
  setLiveInning: Dispatch<SetStateAction<number>>
  setLiveHalf: Dispatch<SetStateAction<GameHalf>>
  setLiveOuts: Dispatch<SetStateAction<number>>
  setBases: Dispatch<SetStateAction<BasesState>>
  setLiveGameTab: Dispatch<SetStateAction<LiveGameTab>>
  setAwayScore: Dispatch<SetStateAction<number>>
  setHomeScore: Dispatch<SetStateAction<number>>
  setLivePitchingEntry: Dispatch<SetStateAction<LivePitchingStats>>
  editingLiveEventId: string | null
  setEditingLiveEventId: Dispatch<SetStateAction<string | null>>
  setExpandedLiveInningKey: Dispatch<SetStateAction<string>>
  clearRunnerHistory: () => void
}

export function useLivePlayEditor({
  livePlays,
  setLivePlays,
  livePitchPlays,
  setLivePitchPlays,
  lineupLength,
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
}: Input) {
  const getBatterIndexAfterPlay = (plays: LivePlay[], playId?: string) => {
    if (lineupLength === 0) return 0
    if (!playId) return plays.length % lineupLength
    const idx = plays.findIndex((p) => p.id === playId)
    return idx < 0 ? plays.length % lineupLength : (idx + 1) % lineupLength
  }

  const applyRecomputed = (r: ReturnType<typeof recomputeLiveGame>) => {
    setLivePlays(r.livePlays)
    setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore)
    setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    clearRunnerHistory()
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning)
    setLiveHalf(r.liveHalf)
    setLiveOuts(r.liveOuts)
    setBases(r.bases)
    setExpandedLiveInningKey(`${r.liveInning}-${r.liveHalf}`)

    // Sync the tab to match the current half-inning's play type.
    const frameHasBatting = r.livePlays.some((p) => p.inning === r.liveInning && p.half === r.liveHalf)
    const frameHasPitching = r.livePitchPlays.some((p) => p.inning === r.liveInning && p.half === r.liveHalf)
    if (frameHasBatting && !frameHasPitching) {
      setLiveGameTab("batting")
    } else if (frameHasPitching && !frameHasBatting) {
      setLiveGameTab("pitching")
    } else if (!frameHasBatting && !frameHasPitching) {
      // Current frame is empty (advanced past all plays). Infer from the last recorded play.
      const lastBattingTime = r.livePlays.length > 0 ? getActionTimeFromId(r.livePlays[r.livePlays.length - 1].id) : 0
      const lastPitchingTime = r.livePitchPlays.length > 0 ? getActionTimeFromId(r.livePitchPlays[r.livePitchPlays.length - 1].id) : 0
      if (lastBattingTime > lastPitchingTime) setLiveGameTab("pitching")
      else if (lastPitchingTime > lastBattingTime) setLiveGameTab("batting")
    }
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

  const handleUpdateLivePlay = (
    playId: string,
    nextResult: LivePlayResult,
    nextRbi: number,
    nextNote: string
  ) => {
    if (!livePlays.find((p) => p.id === playId)) return

    const edited = livePlays.map((p) =>
      p.id === playId ? { ...p, result: nextResult, rbi: Math.max(0, nextRbi), note: nextNote } : p
    )
    const r = recomputeLiveGame(edited, livePitchPlays)
    setLivePlays(r.livePlays)
    setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore)
    setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    clearRunnerHistory()
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning)
    setLiveHalf(r.liveHalf)
    setLiveOuts(r.liveOuts)
    setBases(r.bases)
    // expandedLiveInningKey is intentionally left unchanged so the edited inning stays visible
  }

  const handleUpdateLivePitchPlay = (playId: string, nextResult: LivePitchResult, nextNote: string) => {
    if (!livePitchPlays.find((p) => p.id === playId)) return

    const edited = livePitchPlays.map((p) => (p.id === playId ? { ...p, result: nextResult, note: nextNote } : p))
    const r = recomputeLiveGame(livePlays, edited)
    setLivePlays(r.livePlays)
    setLivePitchPlays(r.livePitchPlays)
    setAwayScore(r.awayScore)
    setHomeScore(r.homeScore)
    setLivePitchingEntry(r.livePitchingEntry)
    clearRunnerHistory()
    setCurrentBatterIndex(getBatterIndexAfterPlay(r.livePlays))
    setLiveInning(r.liveInning)
    setLiveHalf(r.liveHalf)
    setLiveOuts(r.liveOuts)
    setBases(r.bases)
    // expandedLiveInningKey is intentionally left unchanged so the edited inning stays visible
  }

  return {
    handleDeleteLivePlay,
    handleDeleteLivePitchPlay,
    handleUpdateLivePlay,
    handleUpdateLivePitchPlay,
  }
}
