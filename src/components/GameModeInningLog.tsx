import { useEffect, useRef } from "react"
import type {
  GameHalf,
  LiveInningSummary,
  LivePitchPlay,
  LivePitchResult,
  LivePlay,
  LivePlayResult,
} from "./RecordGamePage.types"
import { liveResultLabels, livePitchResultLabels } from "./gameConstants"
import { estimateRunsForPitching } from "./gameStatUtils"
import { battingResultBadge, pitchingResultBadge } from "./gameLiveUtils"

type Props = {
  awayScore: number
  homeScore: number
  liveHalf: GameHalf
  liveInning: number
  liveOuts: number
  liveInningSummaries: LiveInningSummary[]
  expandedLiveInningKey: string
  onExpandedLiveInningKeyChange: (key: string) => void
  editingLiveEventId: string | null
  onEditingLiveEventIdChange: (id: string | null) => void
  onDeleteLivePlay: (id: string) => void
  onDeleteLivePitchPlay: (id: string) => void
  onUpdateLivePlay: (id: string, result: LivePlayResult, rbi: number, note: string) => void
  onUpdateLivePitchPlay: (id: string, result: LivePitchResult, note: string) => void
}

export default function GameModeInningLog({
  awayScore,
  homeScore,
  liveHalf,
  liveInning,
  liveOuts,
  liveInningSummaries,
  expandedLiveInningKey,
  onExpandedLiveInningKeyChange,
  editingLiveEventId,
  onEditingLiveEventIdChange,
  onDeleteLivePlay,
  onDeleteLivePitchPlay,
  onUpdateLivePlay,
  onUpdateLivePitchPlay,
}: Props) {
  const rowRefs = useRef<Map<string, HTMLDivElement>>(new Map())

  useEffect(() => {
    if (!expandedLiveInningKey) return
    const el = rowRefs.current.get(expandedLiveInningKey)
    if (el) el.scrollIntoView({ behavior: "smooth", block: "nearest" })
  }, [expandedLiveInningKey])

  return (
    <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
      <h2 className="text-base font-bold text-gray-900">All Innings</h2>
      <p className="mt-1 text-sm text-gray-500">
        {awayScore}-{homeScore} · {liveHalf} {liveInning} · {liveOuts} outs
      </p>
      <div className="mt-4 space-y-3">
        {liveInningSummaries.map((summary) => {
          const battingRuns = summary.batting.reduce((total, play) => total + play.runs, 0)
          const battingHits = summary.batting.reduce((total, play) => total + play.statLine.H, 0)
          const pitchingRuns = summary.pitching.reduce(
            (total, play) => total + estimateRunsForPitching(play.basesBefore, play.result),
            0
          )
          const hasEvents = summary.batting.length > 0 || summary.pitching.length > 0
          const summaryKey = `${summary.inning}-${summary.half}`
          const isExpanded = expandedLiveInningKey === summaryKey

          return (
            <div key={summaryKey} ref={(el) => { if (el) rowRefs.current.set(summaryKey, el); else rowRefs.current.delete(summaryKey) }} className={`rounded-xl border bg-[#f7f8f3] transition ${isExpanded ? "border-green-900" : "border-gray-100"}`}>
              <button
                type="button"
                onClick={() => {
                  onExpandedLiveInningKeyChange(isExpanded ? "" : summaryKey)
                }}
                className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
              >
                <span>
                  <span className="block text-sm font-bold text-gray-900">{summary.half} {summary.inning}</span>
                  <span className="mt-0.5 block text-xs font-semibold text-gray-500">B R{battingRuns} H{battingHits} · P R{pitchingRuns}</span>
                </span>
                <span className="text-xs font-semibold text-green-900">{isExpanded ? "Close" : "Open"}</span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 px-3 pb-3 pt-3">
                  {!hasEvents && <p className="text-sm text-gray-500">No events yet.</p>}
                  {summary.batting.length > 0 && (
                    <BattingEvents
                      plays={summary.batting}
                      editingLiveEventId={editingLiveEventId}
                      onEditingLiveEventIdChange={onEditingLiveEventIdChange}
                      onDeleteLivePlay={onDeleteLivePlay}
                      onUpdateLivePlay={onUpdateLivePlay}
                    />
                  )}
                  {summary.pitching.length > 0 && (
                    <PitchingEvents
                      plays={summary.pitching}
                      editingLiveEventId={editingLiveEventId}
                      onEditingLiveEventIdChange={onEditingLiveEventIdChange}
                      onDeleteLivePitchPlay={onDeleteLivePitchPlay}
                      onUpdateLivePitchPlay={onUpdateLivePitchPlay}
                    />
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function BattingEvents({
  plays,
  editingLiveEventId,
  onEditingLiveEventIdChange,
  onDeleteLivePlay,
  onUpdateLivePlay,
}: {
  plays: LivePlay[]
  editingLiveEventId: string | null
  onEditingLiveEventIdChange: (id: string | null) => void
  onDeleteLivePlay: (id: string) => void
  onUpdateLivePlay: (id: string, result: LivePlayResult, rbi: number, note: string) => void
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Batting</p>
      {plays.map((play) => {
        const isEditing = editingLiveEventId === play.id
        return (
          <div key={play.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${battingResultBadge(play.result)}`}>{play.result}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{play.playerName}</p>
                  <p className="truncate text-xs text-gray-500">RBI {play.rbi} · Runs {play.runs}{play.note ? ` · ${play.note}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => onEditingLiveEventIdChange(play.id)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">Edit</button>
                  <button type="button" onClick={() => onDeleteLivePlay(play.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">Delete</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">{play.playerName}</span>
                  <button type="button" onClick={() => onEditingLiveEventIdChange(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">Close</button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px]">
                  <select value={play.result} onChange={(event) => onUpdateLivePlay(play.id, event.target.value as LivePlayResult, play.rbi, play.note)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm">
                    {liveResultLabels.map((item) => (<option key={item.result} value={item.result}>{item.label}</option>))}
                  </select>
                  <input type="number" min={0} value={play.rbi} onChange={(event) => onUpdateLivePlay(play.id, play.result, Number(event.target.value), play.note)} className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                  <input type="text" value={play.note} onChange={(event) => onUpdateLivePlay(play.id, play.result, play.rbi, event.target.value)} placeholder="Note" className="rounded-lg border border-gray-200 px-2 py-2 text-sm sm:col-span-2" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function PitchingEvents({
  plays,
  editingLiveEventId,
  onEditingLiveEventIdChange,
  onDeleteLivePitchPlay,
  onUpdateLivePitchPlay,
}: {
  plays: LivePitchPlay[]
  editingLiveEventId: string | null
  onEditingLiveEventIdChange: (id: string | null) => void
  onDeleteLivePitchPlay: (id: string) => void
  onUpdateLivePitchPlay: (id: string, result: LivePitchResult, note: string) => void
}) {
  return (
    <div className="mt-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Pitching</p>
      {plays.map((play) => {
        const isEditing = editingLiveEventId === play.id
        return (
          <div key={play.id} className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm">
            {!isEditing ? (
              <div className="flex items-center gap-2">
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${pitchingResultBadge(play.result)}`}>{play.result}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{play.pitcherName}</p>
                  <p className="truncate text-xs text-gray-500">Runs {estimateRunsForPitching(play.basesBefore, play.result)}{play.note ? ` · ${play.note}` : ""}</p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <button type="button" onClick={() => onEditingLiveEventIdChange(play.id)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">Edit</button>
                  <button type="button" onClick={() => onDeleteLivePitchPlay(play.id)} className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white">Delete</button>
                </div>
              </div>
            ) : (
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-600">{play.pitcherName}</span>
                  <button type="button" onClick={() => onEditingLiveEventIdChange(null)} className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">Close</button>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <select value={play.result} onChange={(event) => onUpdateLivePitchPlay(play.id, event.target.value as LivePitchResult, play.note)} className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm">
                    {[
                      ...livePitchResultLabels,
                      { result: "H" as LivePitchResult, label: "1B" },
                      { result: "2B" as LivePitchResult, label: "2B" },
                      { result: "3B" as LivePitchResult, label: "3B" },
                      { result: "R" as LivePitchResult, label: "Run" },
                      { result: "ER" as LivePitchResult, label: "ER" },
                      { result: "E" as LivePitchResult, label: "Error" },
                    ].map((item) => (<option key={item.result} value={item.result}>{item.label}</option>))}
                  </select>
                  <input type="text" value={play.note} onChange={(event) => onUpdateLivePitchPlay(play.id, play.result, event.target.value)} placeholder="Note" className="rounded-lg border border-gray-200 px-2 py-2 text-sm" />
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
