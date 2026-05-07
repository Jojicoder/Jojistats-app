import { useEffect, useMemo, useState } from "react"
import type { CSSProperties, PointerEvent } from "react"
import type {
  Player,
  Position,
  BattingEntryData,
  PitchingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  PendingBattingEntry,
} from "../types"
import ScoreEntryPanel from "./ScoreEntryPanel"
import PitchingEntryPanel from "./PitchingEntryPanel"
import SavedEntriesList from "./SavedEntriesList"
import GameMetaFields from "./GameMetaFields"
import BattingStatFields from "./BattingStatFields"

type RecordGamePageProps = {
  activePlayer: Player
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
  showRosterPanel?: boolean
  currentEntry: BattingEntryData
  gameMeta: DraftGameMeta
  savedEntries: SavedBattingGameEntry[]
  teamSavedEntries?: SavedBattingGameEntry[]
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSaveGame: (
    gameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => Promise<void>
  teamName: string
  seasonYear: number
  isEditingSavedEntry: boolean
  editingSavedEntryId: string | null
  onStartEditSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  onUpdateSavedEntry: (
    nextGameMeta: DraftGameMeta,
    nextStatLine: BattingEntryData
  ) => void
  onUpdateSavedGame?: (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[]
  ) => void | Promise<void>
  onUpdateSavedGameMeta?: (nextGameMeta: DraftGameMeta) => void
  onCancelEditSavedEntry: () => void
  onDeleteSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  onDeleteSavedGame?: () => void | Promise<void>
  editingGamePositions?: Position[]
  recordMode: "batting" | "pitching"
  setRecordMode: (mode: "batting" | "pitching") => void
  pitchingEntry: PitchingEntryData
  onPitchingEntryChange: (nextEntry: PitchingEntryData) => void
  onSavePitchingGame: (entry?: PitchingEntryData, playerId?: string) => void | Promise<void>
  isPitchingSaveDisabled: boolean
  saveError?: string
  onClearSaveError?: () => void
}

type GameHalf = "Top" | "Bottom"
type LivePlayResult = "1B" | "2B" | "3B" | "HR" | "BB" | "SO" | "OUT" | "E"
type LiveGameTab = "batting" | "pitching"
type InputStyle = "standard" | "game" | "edit"
type LivePitchResult = "OUT" | "SO" | "BB" | "H" | "2B" | "3B" | "R" | "ER" | "HR" | "E"
type BaseName = "first" | "second" | "third"
type BasesState = {
  first: boolean
  second: boolean
  third: boolean
}

type LivePlay = {
  id: string
  playerId: string
  playerName: string
  result: LivePlayResult
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  rbi: number
  runs: number
  note: string
  statLine: BattingEntryData
}

type LivePitchPlay = {
  id: string
  pitcherId: string
  pitcherName: string
  result: LivePitchResult
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  note: string
}

type RunnerOutAction = {
  id: string
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  tabBefore: LiveGameTab
}

type RunnerRbiAction = {
  id: string
  half: GameHalf
  basesBefore: BasesState
  playBefore: LivePlay
}

const emptyBases: BasesState = {
  first: false,
  second: false,
  third: false,
}

const gamePositionOptions: Position[] = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","DH","UTIL",
]

const liveResultLabels: { result: LivePlayResult; label: string }[] = [
  { result: "1B", label: "Single" },
  { result: "2B", label: "Double" },
  { result: "3B", label: "Triple" },
  { result: "HR", label: "HR" },
  { result: "BB", label: "Walk" },
  { result: "SO", label: "Strikeout" },
  { result: "OUT", label: "Out" },
  { result: "E", label: "Error" },
]

const livePitchResultLabels: { result: LivePitchResult; label: string }[] = [
  { result: "OUT", label: "Out" },
  { result: "SO", label: "Strikeout" },
  { result: "BB", label: "Walk" },
  { result: "HR", label: "HR Allowed" },
]

function createEmptyBattingLine(): BattingEntryData {
  return {
    AB: 0,
    H: 0,
    doubles: 0,
    triples: 0,
    HR: 0,
    RBI: 0,
    BB: 0,
    SO: 0,
    note: "",
  }
}

function buildLiveStatLine(result: LivePlayResult, rbi: number): BattingEntryData {
  const statLine = createEmptyBattingLine()
  statLine.RBI = rbi

  if (result === "BB") {
    statLine.BB = 1
    return statLine
  }

  statLine.AB = 1

  if (result === "SO") {
    statLine.SO = 1
    return statLine
  }

  if (result === "1B") statLine.H = 1
  if (result === "2B") {
    statLine.H = 1
    statLine.doubles = 1
  }
  if (result === "3B") {
    statLine.H = 1
    statLine.triples = 1
  }
  if (result === "HR") {
    statLine.H = 1
    statLine.HR = 1
  }

  return statLine
}

function isOutResult(result: LivePlayResult) {
  return result === "SO" || result === "OUT"
}

function isPitchOutResult(result: LivePitchResult) {
  return result === "OUT" || result === "SO"
}

function getNextHalfInning(inning: number, half: GameHalf) {
  if (half === "Top") {
    return { inning, half: "Bottom" as GameHalf }
  }

  return { inning: inning + 1, half: "Top" as GameHalf }
}

function countBases(bases: BasesState) {
  return Number(bases.first) + Number(bases.second) + Number(bases.third)
}

function isBasesLoaded(bases: BasesState) {
  return bases.first && bases.second && bases.third
}

function removeScoredRunners(bases: BasesState, runs: number): BasesState {
  const next = { ...bases }
  let remaining = Math.max(0, runs)

  if (remaining > 0 && next.third) {
    next.third = false
    remaining -= 1
  }
  if (remaining > 0 && next.second) {
    next.second = false
    remaining -= 1
  }
  if (remaining > 0 && next.first) {
    next.first = false
  }

  return next
}

function advanceBasesByHit(
  bases: BasesState,
  basesTaken: 1 | 2 | 3 | 4,
  runsDrivenIn: number
): BasesState {
  if (basesTaken === 4) return { ...emptyBases }

  const occupiedBases = [
    bases.third ? 3 : null,
    bases.second ? 2 : null,
    bases.first ? 1 : null,
  ].filter((base): base is 1 | 2 | 3 => base != null)
  const scoredBases = new Set(occupiedBases.slice(0, Math.min(runsDrivenIn, occupiedBases.length)))
  const next = { ...emptyBases }

  occupiedBases.forEach((base) => {
    if (scoredBases.has(base)) return

    const destination = Math.min(base + basesTaken, 3)
    if (destination === 1) next.first = true
    if (destination === 2) next.second = true
    if (destination === 3) next.third = true
  })

  if (basesTaken === 1) next.first = true
  if (basesTaken === 2) next.second = true
  if (basesTaken === 3) next.third = true

  return next
}

function advanceBasesByWalk(bases: BasesState): BasesState {
  return {
    first: true,
    second: bases.first ? true : bases.second,
    third: bases.first && bases.second ? true : bases.third,
  }
}

function nextBasesForBatting(
  bases: BasesState,
  result: LivePlayResult,
  rbi: number
): BasesState {
  if (result === "1B") return advanceBasesByHit(bases, 1, rbi)
  if (result === "2B") return advanceBasesByHit(bases, 2, rbi)
  if (result === "3B") return advanceBasesByHit(bases, 3, rbi)
  if (result === "HR") return { ...emptyBases }
  if (result === "BB") return advanceBasesByWalk(bases)
  if (result === "E") {
    return {
      ...removeScoredRunners(bases, bases.third ? 1 : 0),
      first: true,
    }
  }

  return removeScoredRunners(bases, rbi)
}

function estimateRunsForBatting(bases: BasesState, result: LivePlayResult, rbi: number) {
  if (result === "E") return bases.third ? 1 : 0
  if (result === "HR") return countBases(bases) + 1
  if (result === "BB") return isBasesLoaded(bases) ? 1 : 0
  return rbi
}

function estimateRbiForBatting(bases: BasesState, result: LivePlayResult) {
  if (result === "HR") return countBases(bases) + 1
  if (result === "3B") return countBases(bases)
  if (result === "2B") return Number(bases.second) + Number(bases.third)
  if (result === "1B") return Number(bases.third)
  if (result === "BB") {
    return isBasesLoaded(bases) ? 1 : 0
  }

  return 0
}

function nextBasesForPitching(
  bases: BasesState,
  result: LivePitchResult
): BasesState {
  if (result === "H") return advanceBasesByHit(bases, 1, 0)
  if (result === "2B") return advanceBasesByHit(bases, 2, 0)
  if (result === "3B") return advanceBasesByHit(bases, 3, countBases(bases))
  if (result === "BB") return advanceBasesByWalk(bases)
  if (result === "E") return advanceBasesByHit(bases, 1, 0)
  if (result === "HR") return { ...emptyBases }
  if (result === "R" || result === "ER") return bases

  return bases
}

function estimateRunsForPitching(bases: BasesState, result: LivePitchResult) {
  if (result === "R" || result === "ER") return 1
  if (result === "HR") return countBases(bases) + 1
  if (result === "3B") return countBases(bases)
  if (result === "BB") return isBasesLoaded(bases) ? 1 : 0
  return 0
}

function estimateEarnedRunsForPitching(
  bases: BasesState,
  result: LivePitchResult
) {
  if (result === "ER") return 1
  if (result === "HR") return estimateRunsForPitching(bases, result)
  if (result === "BB" && isBasesLoaded(bases)) return 1
  return 0
}

function buildPitchingEntryFromPlays(plays: LivePitchPlay[]): PitchingEntryData {
  return plays.reduce(
    (entry, play) => {
      const runs = estimateRunsForPitching(play.basesBefore ?? emptyBases, play.result)
      entry.inningsPitchedOuts += isPitchOutResult(play.result) ? 1 : 0
      entry.hitsAllowed +=
        play.result === "H" ||
        play.result === "2B" ||
        play.result === "3B" ||
        play.result === "HR"
          ? 1
          : 0
      entry.runsAllowed += runs
      entry.earnedRuns += estimateEarnedRunsForPitching(
        play.basesBefore ?? emptyBases,
        play.result
      )
      entry.walks += play.result === "BB" ? 1 : 0
      entry.strikeouts += play.result === "SO" ? 1 : 0
      entry.homeRunsAllowed += play.result === "HR" ? 1 : 0
      return entry
    },
    {
      inningsPitchedOuts: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
    }
  )
}

function getActionTimeFromId(id: string) {
  const time = Number(id.split("-")[0])
  return Number.isFinite(time) ? time : 0
}

function recomputeLiveGame(
  battingPlays: LivePlay[],
  pitchingPlays: LivePitchPlay[]
) {
  let inning = 1
  let half: GameHalf = "Top"
  let outs = 0
  let bases: BasesState = emptyBases
  let away = 0
  let home = 0

  const nextBattingPlays: LivePlay[] = []
  const nextPitchingPlays: LivePitchPlay[] = []
  const stateAfterEvent = new Map<
    string,
    { inning: number; half: GameHalf; outs: number; bases: BasesState }
  >()

  const events = [
    ...battingPlays.map((play) => ({ type: "batting" as const, play })),
    ...pitchingPlays.map((play) => ({ type: "pitching" as const, play })),
  ].sort((a, b) => getActionTimeFromId(a.play.id) - getActionTimeFromId(b.play.id))

  events.forEach((event) => {
    if (event.type === "batting") {
      const play = event.play
      const rbi = Math.max(0, play.rbi)
      const runs = estimateRunsForBatting(bases, play.result, rbi)
      const statLine = buildLiveStatLine(play.result, rbi)
      const recomputedPlay: LivePlay = {
        ...play,
        inning,
        half,
        outsBefore: outs,
        basesBefore: bases,
        rbi,
        runs,
        statLine,
      }

      nextBattingPlays.push(recomputedPlay)
      if (half === "Top") away += runs
      else home += runs

      const nextOuts = outs + (isOutResult(play.result) ? 1 : 0)
      if (nextOuts >= 3) {
        const nextFrame = getNextHalfInning(inning, half)
        inning = nextFrame.inning
        half = nextFrame.half
        outs = 0
        bases = emptyBases
      } else {
        outs = nextOuts
        bases = nextBasesForBatting(bases, play.result, rbi)
      }

      stateAfterEvent.set(play.id, { inning, half, outs, bases })
      return
    }

    const play = event.play
    const runs = estimateRunsForPitching(bases, play.result)
    const recomputedPlay: LivePitchPlay = {
      ...play,
      inning,
      half,
      outsBefore: outs,
      basesBefore: bases,
    }

    nextPitchingPlays.push(recomputedPlay)
    if (half === "Top") away += runs
    else home += runs

    const nextOuts = outs + (isPitchOutResult(play.result) ? 1 : 0)
    if (nextOuts >= 3) {
      const nextFrame = getNextHalfInning(inning, half)
      inning = nextFrame.inning
      half = nextFrame.half
      outs = 0
      bases = emptyBases
    } else {
      outs = nextOuts
      bases =
        play.result === "R" || play.result === "ER"
          ? removeScoredRunners(bases, 1)
          : nextBasesForPitching(bases, play.result)
    }

    stateAfterEvent.set(play.id, { inning, half, outs, bases })
  })

  return {
    livePlays: nextBattingPlays,
    livePitchPlays: nextPitchingPlays,
    awayScore: away,
    homeScore: home,
    liveInning: inning,
    liveHalf: half,
    liveOuts: outs,
    bases,
    livePitchingEntry: buildPitchingEntryFromPlays(nextPitchingPlays),
    stateAfterEvent,
  }
}

function getPlayerLabel(player: Player) {
  return player.jerseyNumber != null
    ? `#${player.jerseyNumber} ${player.name}`
    : player.name
}

function aggregateLivePlays(
  plays: LivePlay[],
  players: Player[]
): PendingBattingEntry[] {
  const byPlayer = new Map<string, PendingBattingEntry>()

  plays.forEach((play) => {
    const player = players.find((item) => item.id === play.playerId)
    const existing = byPlayer.get(play.playerId)

    if (!existing) {
      byPlayer.set(play.playerId, {
        ...createEmptyBattingLine(),
        ...play.statLine,
        playerId: play.playerId,
        playerName: play.playerName,
        gamePositions: player ? [player.position] : ["UTIL"],
      })
      return
    }

    existing.AB += play.statLine.AB
    existing.H += play.statLine.H
    existing.doubles += play.statLine.doubles
    existing.triples += play.statLine.triples
    existing.HR += play.statLine.HR
    existing.RBI += play.statLine.RBI
    existing.BB += play.statLine.BB
    existing.SO += play.statLine.SO
  })

  return Array.from(byPlayer.values())
}

function formatLiveInnings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

function getGameResult(meta: DraftGameMeta): "W" | "L" | "T" | "" {
  if (meta.result === "W" || meta.result === "L" || meta.result === "T") {
    return meta.result
  }
  if (meta.teamScore == null || meta.opponentScore == null) return ""
  if (meta.teamScore > meta.opponentScore) return "W"
  if (meta.teamScore < meta.opponentScore) return "L"
  return "T"
}

function getGameScore(meta: DraftGameMeta) {
  if (meta.teamScore == null || meta.opponentScore == null) return "-"
  return `${meta.teamScore}-${meta.opponentScore}`
}

function battingResultClass(result: LivePlayResult): string {
  switch (result) {
    case "HR":  return "bg-green-800 text-white hover:bg-green-700"
    case "3B":  return "bg-emerald-600 text-white hover:bg-emerald-500"
    case "2B":  return "bg-emerald-500 text-white hover:bg-emerald-400"
    case "1B":  return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
    case "BB":  return "bg-sky-100 text-sky-900 hover:bg-sky-200"
    case "SO":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "OUT": return "bg-gray-800 text-white hover:bg-gray-700"
    case "E":   return "bg-amber-100 text-amber-900 hover:bg-amber-200"
  }
}

function pitchingResultClass(result: LivePitchResult): string {
  switch (result) {
    case "OUT": return "bg-green-800 text-white hover:bg-green-700"
    case "SO":  return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
    case "BB":  return "bg-amber-100 text-amber-900 hover:bg-amber-200"
    case "H":   return "bg-red-100 text-red-900 hover:bg-red-200"
    case "2B":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "3B":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "E":   return "bg-amber-100 text-amber-900 hover:bg-amber-200"
    case "R":   return "bg-orange-100 text-orange-900 hover:bg-orange-200"
    case "ER":  return "bg-red-200 text-red-900 hover:bg-red-300"
    case "HR":  return "bg-red-800 text-white hover:bg-red-700"
  }
}

function battingResultBadge(result: LivePlayResult): string {
  switch (result) {
    case "HR":  return "bg-green-800 text-white"
    case "3B":  return "bg-emerald-600 text-white"
    case "2B":  return "bg-emerald-500 text-white"
    case "1B":  return "bg-emerald-100 text-emerald-900"
    case "BB":  return "bg-sky-100 text-sky-900"
    case "SO":  return "bg-red-100 text-red-900"
    case "OUT": return "bg-gray-200 text-gray-700"
    case "E":   return "bg-amber-100 text-amber-900"
  }
}

function pitchingResultBadge(result: LivePitchResult): string {
  switch (result) {
    case "OUT": return "bg-green-100 text-green-900"
    case "SO":  return "bg-emerald-100 text-emerald-900"
    case "BB":  return "bg-amber-100 text-amber-900"
    case "H":   return "bg-red-100 text-red-900"
    case "2B":  return "bg-red-100 text-red-900"
    case "3B":  return "bg-red-100 text-red-900"
    case "E":   return "bg-amber-100 text-amber-900"
    case "R":   return "bg-orange-100 text-orange-900"
    case "ER":  return "bg-red-200 text-red-900"
    case "HR":  return "bg-red-800 text-white"
  }
}

function BaseDiamond({
  bases,
  onBasesChange,
  selectedBase,
  onSelectBase,
}: {
  bases: BasesState
  onBasesChange?: (nextBases: BasesState) => void
  selectedBase?: BaseName | null
  onSelectBase?: (base: BaseName | null) => void
}) {
  const [draggingBase, setDraggingBase] = useState<BaseName | null>(null)
  const baseClass = (base: BaseName, occupied: boolean) =>
    `absolute h-5 w-5 rotate-45 rounded-[4px] border-2 transition-colors ${
      occupied
        ? "cursor-grab border-green-900 bg-green-700 shadow-sm active:cursor-grabbing"
        : "border-gray-300 bg-white"
    } ${selectedBase === base ? "ring-4 ring-amber-300 ring-offset-2" : ""}`

  const handleRelease = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingBase || !onBasesChange) return

    const rect = event.currentTarget.getBoundingClientRect()
    const point = {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    }
    const targets: Array<{ base: BaseName | "home"; x: number; y: number }> = [
      { base: "first", x: 78, y: 44 },
      { base: "second", x: 48, y: 18 },
      { base: "third", x: 24, y: 44 },
      { base: "home", x: 48, y: 70 },
    ]
    const target = targets.reduce((closest, candidate) => {
      const closestDistance = Math.hypot(point.x - closest.x, point.y - closest.y)
      const candidateDistance = Math.hypot(point.x - candidate.x, point.y - candidate.y)
      return candidateDistance < closestDistance ? candidate : closest
    })

    onBasesChange({
      ...bases,
      [draggingBase]: false,
      ...(target.base === "home" ? {} : { [target.base]: true }),
    })
    onSelectBase?.(target.base === "home" ? null : target.base)
    setDraggingBase(null)
  }

  const renderBase = (
    base: BaseName,
    occupied: boolean,
    style: CSSProperties
  ) => (
    <button
      type="button"
      aria-label={`${base} base ${occupied ? "occupied" : "empty"}`}
      onPointerDown={(event) => {
        if (!occupied) return
        event.preventDefault()
        onSelectBase?.(base)
        setDraggingBase(base)
      }}
      className={baseClass(base, occupied)}
      style={style}
    />
  )

  return (
    <div
      className="relative h-20 w-24 shrink-0 touch-none select-none"
      aria-label="Runner diamond"
      onPointerUp={handleRelease}
      onPointerCancel={() => setDraggingBase(null)}
      onPointerLeave={() => setDraggingBase(null)}
    >
      <div className="absolute left-1/2 top-8 h-12 w-12 -translate-x-1/2 rotate-45 rounded-sm border border-gray-200 bg-gray-50" />
      {renderBase("first", bases.first, { right: 14, top: 34 })}
      {renderBase("second", bases.second, { left: 38, top: 8 })}
      {renderBase("third", bases.third, { left: 14, top: 34 })}
      <div className="absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[3px] border border-gray-300 bg-white" />
      {draggingBase && (
        <p className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-green-900">
          drop to move
        </p>
      )}
    </div>
  )
}

export default function RecordGamePage({
  activePlayer,
  allPlayers,
  onSelectPlayer,
  showRosterPanel = true,
  currentEntry,
  gameMeta,
  savedEntries,
  teamSavedEntries,
  onGameMetaChange,
  onEntryChange,
  onSaveGame,
  teamName,
  seasonYear,
  isEditingSavedEntry,
  editingSavedEntryId,
  onStartEditSavedEntry,
  onUpdateSavedEntry,
  onUpdateSavedGame,
  onUpdateSavedGameMeta,
  onCancelEditSavedEntry,
  onDeleteSavedEntry,
  onDeleteSavedGame,
  editingGamePositions,
  recordMode,
  setRecordMode,
  pitchingEntry,
  onPitchingEntryChange,
  onSavePitchingGame,
  isPitchingSaveDisabled,
  saveError = "",
  onClearSaveError,
}: RecordGamePageProps) {

  const [inputStyle, setInputStyle] = useState<InputStyle>("standard")
  const [hoveredEditPlayerId, setHoveredEditPlayerId] = useState<string | null>(null)
  const [liveGameTab, setLiveGameTab] = useState<LiveGameTab>("batting")
  const [pendingEntries, setPendingEntries] = useState<PendingBattingEntry[]>([])
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [lineupIds, setLineupIds] = useState<string[]>(() =>
    allPlayers.slice(0, Math.min(allPlayers.length, 9)).map((player) => player.id)
  )
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0)
  const [liveInning, setLiveInning] = useState(1)
  const [liveHalf, setLiveHalf] = useState<GameHalf>("Top")
  const [liveOuts, setLiveOuts] = useState(0)
  const [bases, setBases] = useState<BasesState>(emptyBases)
  const [selectedBase, setSelectedBase] = useState<BaseName | null>(null)
  const [runnerOutHistory, setRunnerOutHistory] = useState<RunnerOutAction[]>([])
  const [runnerRbiHistory, setRunnerRbiHistory] = useState<RunnerRbiAction[]>([])
  const [awayScore, setAwayScore] = useState(0)
  const [homeScore, setHomeScore] = useState(0)
  const [quickRbi, setQuickRbi] = useState(0)
  const [quickNote, setQuickNote] = useState("")
  const [quickPitchNote, setQuickPitchNote] = useState("")
  const [pinhitters, setPinhitters] = useState<Record<number, string>>({})
  const [replacedLineupIds, setReplacedLineupIds] = useState<Record<number, string>>({})
  const [pendingSyncConfirm, setPendingSyncConfirm] = useState(false)
  const [livePlays, setLivePlays] = useState<LivePlay[]>([])
  const [livePitcherId, setLivePitcherId] = useState(
    allPlayers.find((player) => player.position === "P")?.id ?? activePlayer.id
  )
  const [livePitchingEntry, setLivePitchingEntry] =
    useState<PitchingEntryData>({
      inningsPitchedOuts: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
    })
  const [livePitchPlays, setLivePitchPlays] = useState<LivePitchPlay[]>([])
  const [lastLocalSaveAt, setLastLocalSaveAt] = useState("")
  const [editingLiveEventId, setEditingLiveEventId] = useState<string | null>(null)
  const [expandedLiveInningKey, setExpandedLiveInningKey] = useState("")
  const [editGameEntries, setEditGameEntries] = useState<PendingBattingEntry[]>([])
  const [editAddPlayerId, setEditAddPlayerId] = useState("")
  const [selectedEditPlayerId, setSelectedEditPlayerId] = useState("")

  const localDraftKey = `jojistats-live-game-${activePlayer.teamId}-${seasonYear}`

  useEffect(() => {
    setLineupIds((prev) => {
      const validIds = new Set(allPlayers.map((player) => player.id))
      const next = prev.filter((id) => validIds.has(id))
      const missing = allPlayers
        .map((player) => player.id)
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
        replacedLineupIds?: Record<number, string>
        livePlays?: LivePlay[]
        livePitcherId?: string
        livePitchingEntry?: PitchingEntryData
        livePitchPlays?: LivePitchPlay[]
      }

      if (draft.lineupIds?.length) setLineupIds(draft.lineupIds)
      if (typeof draft.currentBatterIndex === "number") {
        setCurrentBatterIndex(draft.currentBatterIndex)
      }
      if (typeof draft.liveInning === "number") setLiveInning(draft.liveInning)
      if (draft.liveHalf === "Top" || draft.liveHalf === "Bottom") {
        setLiveHalf(draft.liveHalf)
      }
      if (typeof draft.liveOuts === "number") setLiveOuts(draft.liveOuts)
      if (draft.bases) setBases(draft.bases)
      if (typeof draft.awayScore === "number") setAwayScore(draft.awayScore)
      if (typeof draft.homeScore === "number") setHomeScore(draft.homeScore)
      if (typeof draft.quickPitchNote === "string") setQuickPitchNote(draft.quickPitchNote)
      if (draft.selectedBase === "first" || draft.selectedBase === "second" || draft.selectedBase === "third") {
        setSelectedBase(draft.selectedBase)
      }
      if (Array.isArray(draft.runnerOutHistory)) {
        setRunnerOutHistory(draft.runnerOutHistory)
      }
      if (Array.isArray(draft.runnerRbiHistory)) {
        setRunnerRbiHistory(draft.runnerRbiHistory)
      }
      if (draft.replacedLineupIds) setReplacedLineupIds(draft.replacedLineupIds)
      if (Array.isArray(draft.livePlays)) setLivePlays(draft.livePlays)
      if (draft.livePitcherId) setLivePitcherId(draft.livePitcherId)
      if (draft.livePitchingEntry) setLivePitchingEntry(draft.livePitchingEntry)
      if (Array.isArray(draft.livePitchPlays)) setLivePitchPlays(draft.livePitchPlays)
    } catch (error) {
      console.error(error)
    }
  }, [localDraftKey])

  useEffect(() => {
    const draft = {
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
      replacedLineupIds,
      livePlays,
      livePitcherId,
      livePitchingEntry,
      livePitchPlays,
    }
    window.localStorage.setItem(localDraftKey, JSON.stringify(draft))
    setLastLocalSaveAt(new Date().toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
    }))
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
    livePitchingEntry,
    livePitchPlays,
    livePlays,
    localDraftKey,
    quickPitchNote,
    runnerOutHistory,
    runnerRbiHistory,
    replacedLineupIds,
    selectedBase,
  ])

  /* ---------------- POSITION ---------------- */

  const defaultGamePositions = useMemo(
    () =>
      isEditingSavedEntry && editingGamePositions?.length
        ? editingGamePositions
        : [activePlayer.position],
    [activePlayer.position, editingGamePositions, isEditingSavedEntry]
  )

  const [gamePositions, setGamePositions] = useState<Position[]>(defaultGamePositions)
  const canRecordPitching = gamePositions.includes("P")
  const lineupPlayers = lineupIds
    .map((id) => allPlayers.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player))
  const currentBatterSlotIndex = currentBatterIndex % Math.max(lineupPlayers.length, 1)
  const phPlayerId = pinhitters[currentBatterSlotIndex]
  const currentLiveBatter = phPlayerId
    ? (allPlayers.find((p) => p.id === phPlayerId) ?? lineupPlayers[currentBatterSlotIndex] ?? null)
    : (lineupPlayers[currentBatterSlotIndex] ?? null)
  const livePitcher =
    allPlayers.find((player) => player.id === livePitcherId) ??
    allPlayers.find((player) => player.position === "P") ??
    activePlayer
  const currentInningPlays = livePlays.filter(
    (play) => play.inning === liveInning && play.half === liveHalf
  )
  const currentInningRuns = currentInningPlays.reduce(
    (total, play) => total + play.runs,
    0
  )
  const currentInningHits = currentInningPlays.reduce(
    (total, play) => total + play.statLine.H,
    0
  )
  const currentFrameBattingPlays = livePlays.filter(
    (play) => play.inning === liveInning && play.half === liveHalf
  )
  const currentFramePitchingPlays = livePitchPlays.filter(
    (play) => play.inning === liveInning && play.half === liveHalf
  )
  const currentFrameLocksRecordMode =
    currentFrameBattingPlays.length > 0
      ? "batting"
      : currentFramePitchingPlays.length > 0
        ? "pitching"
        : null
  const isLiveBattingBlocked = currentFrameLocksRecordMode === "pitching"
  const isLivePitchingBlocked = currentFrameLocksRecordMode === "batting"
  const liveInningSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      {
        inning: number
        half: GameHalf
        batting: LivePlay[]
        pitching: LivePitchPlay[]
      }
    >()

    const ensureSummary = (inning: number, half: GameHalf) => {
      const key = `${inning}-${half}`
      const existing = summaries.get(key)
      if (existing) return existing

      const next = { inning, half, batting: [], pitching: [] }
      summaries.set(key, next)
      return next
    }

    ensureSummary(liveInning, liveHalf)
    livePlays.forEach((play) => ensureSummary(play.inning, play.half).batting.push(play))
    livePitchPlays.forEach((play) =>
      ensureSummary(play.inning, play.half).pitching.push(play)
    )

    return Array.from(summaries.values()).sort((a, b) => {
      if (a.inning !== b.inning) return a.inning - b.inning
      if (a.half === b.half) return 0
      return a.half === "Top" ? -1 : 1
    })
  }, [liveHalf, liveInning, livePitchPlays, livePlays])
  const currentLiveInningKey = `${liveInning}-${liveHalf}`

  useEffect(() => {
    if (!expandedLiveInningKey) {
      setExpandedLiveInningKey(currentLiveInningKey)
    }
  }, [currentLiveInningKey, expandedLiveInningKey])

  const selectedGameEntry =
    (teamSavedEntries ?? savedEntries).find((entry) => entry.id === editingSavedEntryId) ??
    savedEntries.find((entry) => entry.id === editingSavedEntryId) ??
    null
  const gameEntriesForEditing = useMemo(
    () =>
      selectedGameEntry
        ? (teamSavedEntries ?? savedEntries)
            .filter((entry) => entry.gameId === selectedGameEntry.gameId)
            .sort((a, b) => {
              const playerA = allPlayers.find((player) => player.id === a.playerId)
              const playerB = allPlayers.find((player) => player.id === b.playerId)
              return (playerA?.jerseyNumber ?? 999) - (playerB?.jerseyNumber ?? 999)
            })
        : [],
    [allPlayers, savedEntries, selectedGameEntry, teamSavedEntries]
  )
  const teamGameEntries = useMemo(() => {
    const entries = teamSavedEntries ?? savedEntries
    const byGame = new Map<number, SavedBattingGameEntry>()

    entries.forEach((entry) => {
      const existing = byGame.get(entry.gameId)
      if (!existing || entry.statId < existing.statId) {
        byGame.set(entry.gameId, entry)
      }
    })

    return Array.from(byGame.values()).sort((a, b) => {
      const dateCompare = b.gameMeta.date.localeCompare(a.gameMeta.date)
      if (dateCompare !== 0) return dateCompare
      return b.gameMeta.matchNumber - a.gameMeta.matchNumber
    })
  }, [savedEntries, teamSavedEntries])
  const teamRecord = useMemo(
    () =>
      teamGameEntries.reduce(
        (record, entry) => {
          const result = getGameResult(entry.gameMeta)
          if (result === "W") record.wins += 1
          if (result === "L") record.losses += 1
          if (result === "T") record.ties += 1
          return record
        },
        { wins: 0, losses: 0, ties: 0 }
      ),
    [teamGameEntries]
  )
  const editAvailablePlayers = allPlayers.filter(
    (player) => !editGameEntries.some((entry) => entry.playerId === player.id)
  )
  const selectedEditAddPlayerId =
    editAddPlayerId || editAvailablePlayers[0]?.id || ""
  const selectedEditGameEntry = selectedEditPlayerId
    ? editGameEntries.find((entry) => entry.playerId === selectedEditPlayerId) ?? null
    : null
  const hasInvalidEditGameStats = editGameEntries.some(
    (entry) =>
      entry.H > entry.AB ||
      entry.doubles + entry.triples + entry.HR > entry.H
  )
  const hoveredEditPlayerEvents = hoveredEditPlayerId
    ? livePlays.filter((play) => play.playerId === hoveredEditPlayerId)
    : []

  useEffect(() => {
    setEditGameEntries(
      gameEntriesForEditing.map((entry) => {
        const player = allPlayers.find((item) => item.id === entry.playerId)
        return {
          ...entry.statLine,
          playerId: entry.playerId,
          playerName: player?.name ?? `Player ${entry.playerId}`,
          gamePositions: entry.gamePositions.length
            ? entry.gamePositions
            : player
              ? [player.position]
              : ["UTIL"],
        }
      })
    )
    setSelectedEditPlayerId("")
    setEditAddPlayerId("")
  }, [allPlayers, gameEntriesForEditing])

  useEffect(() => {
    if (
      editAddPlayerId &&
      !editAvailablePlayers.some((player) => player.id === editAddPlayerId)
    ) {
      setEditAddPlayerId("")
    }
  }, [editAddPlayerId, editAvailablePlayers])

  useEffect(() => {
    if (
      selectedEditPlayerId &&
      !editGameEntries.some((entry) => entry.playerId === selectedEditPlayerId)
    ) {
      setSelectedEditPlayerId("")
    }
  }, [editGameEntries, selectedEditPlayerId])

  useEffect(() => {
    if (!canRecordPitching && recordMode === "pitching") {
      setRecordMode("batting")
    }
  }, [canRecordPitching, recordMode, setRecordMode])

  /* ---------------- VALIDATION ---------------- */

  const isMetaComplete =
    gameMeta.date.trim() !== "" && gameMeta.opponent.trim() !== ""

  const hasInvalidStats =
    currentEntry.H > currentEntry.AB ||
    currentEntry.doubles + currentEntry.triples + currentEntry.HR > currentEntry.H

  const isPlayerAlreadyAdded = pendingEntries.some(
    (entry) => entry.playerId === activePlayer.id
  )

  const canAdd =
    isMetaComplete && !hasInvalidStats && !isPlayerAlreadyAdded
  const primaryActionDisabled = isEditingSavedEntry
    ? !isMetaComplete || hasInvalidStats
    : !canAdd

  /* ---------------- HANDLERS ---------------- */

  const updateGamePosition = (index: number, nextPosition: Position) => {
    setGamePositions((prev) =>
      prev.map((position, currentIndex) =>
        currentIndex === index ? nextPosition : position
      )
    )
  }

  const addGamePosition = () => {
    setGamePositions((prev) => [...prev, activePlayer.position])
  }

  const removeGamePosition = (index: number) => {
    setGamePositions((prev) =>
      prev.length === 1
        ? prev
        : prev.filter((_, currentIndex) => currentIndex !== index)
    )
  }

  const handleSetRecordMode = (nextMode: "batting" | "pitching") => {
    if (nextMode === "pitching" && !canRecordPitching) return
    setRecordMode(nextMode)
  }

  const handleAdd = () => {
    if (!canAdd) return

    setPendingEntries((prev) => [
      ...prev,
      {
        ...currentEntry,
        playerId: activePlayer.id,
        playerName: activePlayer.name,
        gamePositions,
      },
    ])

    onEntryChange({
      AB: 0,H: 0,doubles: 0,triples: 0,HR: 0,RBI: 0,BB: 0,SO: 0,note: "",
    })
  }

  const handlePrimaryAction = () => {
    if (isEditingSavedEntry) {
      if (inputStyle === "edit" && onUpdateSavedGameMeta) {
        onUpdateSavedGameMeta(gameMeta)
        return
      }
      onUpdateSavedEntry(gameMeta, currentEntry)
      return
    }

    handleAdd()
  }

  const handleUpdateEditGameEntry = (
    playerId: string,
    nextStatLine: BattingEntryData
  ) => {
    setEditGameEntries((prev) =>
      prev.map((entry) =>
        entry.playerId === playerId ? { ...entry, ...nextStatLine } : entry
      )
    )
  }

  const handleRemoveEditGameEntry = (playerId: string) => {
    setEditGameEntries((prev) =>
      prev.filter((entry) => entry.playerId !== playerId)
    )
    if (selectedEditPlayerId === playerId) {
      setSelectedEditPlayerId("")
    }
  }

  const handleAddEditGameEntry = () => {
    const player = allPlayers.find((item) => item.id === selectedEditAddPlayerId)
    if (!player) return

    setEditGameEntries((prev) => [
      ...prev,
      {
        ...createEmptyBattingLine(),
        playerId: player.id,
        playerName: player.name,
        gamePositions: [player.position],
      },
    ])
    setSelectedEditPlayerId(player.id)
    setEditAddPlayerId("")
  }

  const handleSaveEditedGame = async () => {
    if (
      !onUpdateSavedGame ||
      !isMetaComplete ||
      editGameEntries.length === 0 ||
      hasInvalidEditGameStats
    ) {
      return
    }

    try {
      setIsSaving(true)
      await onUpdateSavedGame(gameMeta, editGameEntries)
    } finally {
      setIsSaving(false)
    }
  }

  const handleSave = async () => {
    if (!isMetaComplete || pendingEntries.length === 0) return

    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, pendingEntries)
      setPendingEntries([])
    } finally {
      setIsSaving(false)
    }
  }

  const handleLineupChange = (index: number, playerId: string) => {
    setLineupIds((prev) =>
      prev.map((id, currentIndex) => (currentIndex === index ? playerId : id))
    )
    setReplacedLineupIds((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleAddLineupSpot = () => {
    const nextPlayer = allPlayers.find((player) => !lineupIds.includes(player.id))
    if (!nextPlayer) return
    setLineupIds((prev) => [...prev, nextPlayer.id])
  }

  const handleRemoveLineupSpot = (index: number) => {
    setLineupIds((prev) =>
      prev.length <= 1 ? prev : prev.filter((_, currentIndex) => currentIndex !== index)
    )
    setReplacedLineupIds((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const currentIndex = Number(key)
        if (currentIndex < index) next[currentIndex] = value
        if (currentIndex > index) next[currentIndex - 1] = value
      })
      return next
    })
    setCurrentBatterIndex((prev) => Math.max(Math.min(prev, lineupIds.length - 2), 0))
  }


  const advanceGameState = (result: LivePlayResult) => {
    const nextOuts = liveOuts + (isOutResult(result) ? 1 : 0)
    if (nextOuts < 3) {
      setLiveOuts(nextOuts)
      return
    }

    const nextFrame = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0)
    setBases(emptyBases)
    setLiveGameTab("pitching")
    setLiveHalf(nextFrame.half)
    setLiveInning(nextFrame.inning)
  }

  const advancePitchGameState = (result: LivePitchResult) => {
    const nextOuts = liveOuts + (isPitchOutResult(result) ? 1 : 0)
    if (nextOuts < 3) {
      setLiveOuts(nextOuts)
      return
    }

    const nextFrame = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0)
    setBases(emptyBases)
    setLiveGameTab("batting")
    setLiveHalf(nextFrame.half)
    setLiveInning(nextFrame.inning)
  }

  const handleSetLiveGameTab = (nextTab: LiveGameTab) => {
    if (nextTab === "batting" && isLiveBattingBlocked) return
    if (nextTab === "pitching" && isLivePitchingBlocked) return
    setLiveGameTab(nextTab)
  }

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

    const nextFrame = getNextHalfInning(liveInning, liveHalf)
    setLiveOuts(0)
    setBases(emptyBases)
    setLiveGameTab(liveGameTab === "batting" ? "pitching" : "batting")
    setLiveHalf(nextFrame.half)
    setLiveInning(nextFrame.inning)
  }

  const handleRunnerRbi = () => {
    if (!selectedBase || !bases[selectedBase]) return
    const lastPlay = livePlays[livePlays.length - 1]
    if (!lastPlay) return

    setRunnerRbiHistory((prev) => [
      ...prev,
      {
        id: `${Date.now()}-runner-rbi`,
        half: liveHalf,
        basesBefore: bases,
        playBefore: lastPlay,
      },
    ])

    setBases((prev) => ({ ...prev, [selectedBase]: false }))
    setSelectedBase(null)
    setLivePlays((prev) =>
      prev.map((play) =>
        play.id === lastPlay.id
          ? {
              ...play,
              rbi: play.rbi + 1,
              runs: play.runs + 1,
              statLine: {
                ...play.statLine,
                RBI: play.statLine.RBI + 1,
              },
            }
          : play
      )
    )
    if (liveHalf === "Top") setAwayScore((prev) => prev + 1)
    else setHomeScore((prev) => prev + 1)
  }

  const undoRunnerOut = () => {
    const lastAction = runnerOutHistory[runnerOutHistory.length - 1]
    if (!lastAction) return false

    setRunnerOutHistory((prev) => prev.slice(0, -1))
    setLiveInning(lastAction.inning)
    setLiveHalf(lastAction.half)
    setLiveOuts(lastAction.outsBefore)
    setBases(lastAction.basesBefore)
    setLiveGameTab(lastAction.tabBefore)
    return true
  }

  const undoRunnerRbi = () => {
    const lastAction = runnerRbiHistory[runnerRbiHistory.length - 1]
    if (!lastAction?.playBefore) return false

    setRunnerRbiHistory((prev) => prev.slice(0, -1))
    setBases(lastAction.basesBefore)
    setLivePlays((prev) =>
      prev.map((play) =>
        play.id === lastAction.playBefore.id ? lastAction.playBefore : play
      )
    )
    if (lastAction.half === "Top") setAwayScore((prev) => Math.max(prev - 1, 0))
    else setHomeScore((prev) => Math.max(prev - 1, 0))
    return true
  }

  const getActionTime = (id: string | undefined) => {
    if (!id) return 0
    const time = Number(id.split("-")[0])
    return Number.isFinite(time) ? time : 0
  }

  const handleUndoLiveAction = (tab: LiveGameTab) => {
    const lastRunnerOut = runnerOutHistory[runnerOutHistory.length - 1]
    const lastRunnerRbi =
      tab === "batting" ? runnerRbiHistory[runnerRbiHistory.length - 1] : undefined
    const lastPlay =
      tab === "batting"
        ? livePlays[livePlays.length - 1]
        : livePitchPlays[livePitchPlays.length - 1]

    if (
      lastRunnerRbi &&
      getActionTime(lastRunnerRbi.id) > getActionTime(lastRunnerOut?.id) &&
      getActionTime(lastRunnerRbi.id) > getActionTime(lastPlay?.id)
    ) {
      undoRunnerRbi()
      return
    }

    if (
      lastRunnerOut &&
      getActionTime(lastRunnerOut.id) > getActionTime(lastPlay?.id)
    ) {
      undoRunnerOut()
      return
    }

    if (tab === "batting") handleUndoLivePlay()
    else handleUndoLivePitch()
  }

  const handleRecordLivePlay = (result: LivePlayResult) => {
    if (
      liveGameTab !== "batting" ||
      !isMetaComplete ||
      !currentLiveBatter ||
      lineupPlayers.length === 0 ||
      isLiveBattingBlocked
    ) {
      return
    }

    const autoRbi = estimateRbiForBatting(bases, result)
    const rbi = quickRbi > 0 ? quickRbi : autoRbi
    const runs = estimateRunsForBatting(bases, result, rbi)
    const statLine = buildLiveStatLine(result, rbi)

    const play: LivePlay = {
      id: `${Date.now()}-${currentLiveBatter.id}`,
      playerId: currentLiveBatter.id,
      playerName: currentLiveBatter.name,
      result,
      inning: liveInning,
      half: liveHalf,
      outsBefore: liveOuts,
      basesBefore: bases,
      rbi,
      runs,
      note: quickNote,
      statLine,
    }

    setLivePlays((prev) => [...prev, play])
    setBases(nextBasesForBatting(bases, result, rbi))
    if (runs > 0) {
      if (liveHalf === "Top") setAwayScore((prev) => prev + runs)
      else setHomeScore((prev) => prev + runs)
    }
    advanceGameState(result)

    if (phPlayerId) {
      const replacedPlayerId = lineupIds[currentBatterSlotIndex]
      if (replacedPlayerId && replacedPlayerId !== phPlayerId) {
        setReplacedLineupIds((prev) => ({
          ...prev,
          [currentBatterSlotIndex]: replacedPlayerId,
        }))
      }
      setLineupIds((prev) =>
        prev.map((id, i) => (i === currentBatterSlotIndex ? phPlayerId : id))
      )
      setPinhitters((prev) => {
        const next = { ...prev }
        delete next[currentBatterSlotIndex]
        return next
      })
    }

    setCurrentBatterIndex((prev) => (prev + 1) % lineupPlayers.length)
    setQuickRbi(0)
    setQuickNote("")
  }

  const handleUndoLivePlay = () => {
    const lastPlay = livePlays[livePlays.length - 1]
    if (!lastPlay) return

    setLivePlays((prev) => prev.slice(0, -1))
    setCurrentBatterIndex((prev) =>
      lineupPlayers.length === 0
        ? 0
        : (prev - 1 + lineupPlayers.length) % lineupPlayers.length
    )
    setLiveInning(lastPlay.inning)
    setLiveHalf(lastPlay.half)
    setLiveOuts(lastPlay.outsBefore)
    setBases(lastPlay.basesBefore ?? emptyBases)
    if (lastPlay.half === "Top") {
      setAwayScore((prev) => Math.max(prev - lastPlay.runs, 0))
    } else {
      setHomeScore((prev) => Math.max(prev - lastPlay.runs, 0))
    }
  }

  const handleRecordLivePitch = (result: LivePitchResult) => {
    if (
      liveGameTab !== "pitching" ||
      !isMetaComplete ||
      !livePitcher ||
      isLivePitchingBlocked
    ) {
      return
    }
    const basesBefore = bases
    const scoreSelectedRunner =
      (result === "R" || result === "ER") && selectedBase && bases[selectedBase]

    const pitchPlay: LivePitchPlay = {
      id: `${Date.now()}-${livePitcher.id}`,
      pitcherId: livePitcher.id,
      pitcherName: livePitcher.name,
      result,
      inning: liveInning,
      half: liveHalf,
      outsBefore: liveOuts,
      basesBefore,
      note: quickPitchNote,
    }

    setLivePitchPlays((prev) => [...prev, pitchPlay])
    setBases(
      scoreSelectedRunner && selectedBase
        ? { ...bases, [selectedBase]: false }
        : nextBasesForPitching(bases, result)
    )
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
      earnedRuns:
        prev.earnedRuns + estimateEarnedRunsForPitching(basesBefore, result),
      walks: prev.walks + (result === "BB" ? 1 : 0),
      strikeouts: prev.strikeouts + (result === "SO" ? 1 : 0),
      homeRunsAllowed: prev.homeRunsAllowed + (result === "HR" ? 1 : 0),
    }))
    setQuickPitchNote("")
    advancePitchGameState(result)
  }

  const handleUndoLivePitch = () => {
    const lastPlay = livePitchPlays[livePitchPlays.length - 1]
    if (!lastPlay) return

    setLivePitchPlays((prev) => prev.slice(0, -1))
    setLiveInning(lastPlay.inning)
    setLiveHalf(lastPlay.half)
    setLiveOuts(lastPlay.outsBefore)
    setBases(lastPlay.basesBefore ?? emptyBases)
    const pitchingRuns = estimateRunsForPitching(lastPlay.basesBefore ?? emptyBases, lastPlay.result)
    if (pitchingRuns > 0) {
      if (lastPlay.half === "Top") setAwayScore((prev) => Math.max(prev - pitchingRuns, 0))
      else setHomeScore((prev) => Math.max(prev - pitchingRuns, 0))
    }
    setLivePitchingEntry((prev) => ({
      inningsPitchedOuts: Math.max(
        prev.inningsPitchedOuts - (isPitchOutResult(lastPlay.result) ? 1 : 0),
        0
      ),
      hitsAllowed: Math.max(prev.hitsAllowed - (lastPlay.result === "H" || lastPlay.result === "2B" || lastPlay.result === "3B" || lastPlay.result === "HR" ? 1 : 0), 0),
      runsAllowed: Math.max(prev.runsAllowed - pitchingRuns, 0),
      earnedRuns: Math.max(
        prev.earnedRuns -
          estimateEarnedRunsForPitching(
            lastPlay.basesBefore ?? emptyBases,
            lastPlay.result
          ),
        0
      ),
      walks: Math.max(prev.walks - (lastPlay.result === "BB" ? 1 : 0), 0),
      strikeouts: Math.max(prev.strikeouts - (lastPlay.result === "SO" ? 1 : 0), 0),
      homeRunsAllowed: Math.max(prev.homeRunsAllowed - (lastPlay.result === "HR" ? 1 : 0), 0),
    }))
  }

  const syncMainCursorToLivePlay = (play: LivePlay) => {
    const lineupIndex = lineupIds.findIndex((id) => id === play.playerId)
    setLiveGameTab("batting")
    setLiveInning(play.inning)
    setLiveHalf(play.half)
    setLiveOuts(play.outsBefore)
    setBases(play.basesBefore ?? emptyBases)
    setSelectedBase(null)
    setExpandedLiveInningKey(`${play.inning}-${play.half}`)
    if (lineupIndex >= 0) {
      setCurrentBatterIndex(lineupIndex)
    }
  }

  const syncMainCursorToLivePitchPlay = (play: LivePitchPlay) => {
    setLiveGameTab("pitching")
    setLiveInning(play.inning)
    setLiveHalf(play.half)
    setLiveOuts(play.outsBefore)
    setBases(play.basesBefore ?? emptyBases)
    setSelectedBase(null)
    setExpandedLiveInningKey(`${play.inning}-${play.half}`)
    setLivePitcherId(play.pitcherId)
  }

  const getBatterIndexAfterPlay = (plays: LivePlay[], playId?: string) => {
    if (lineupPlayers.length === 0) return 0
    if (!playId) return plays.length % lineupPlayers.length

    const playIndex = plays.findIndex((play) => play.id === playId)
    if (playIndex < 0) return plays.length % lineupPlayers.length
    return (playIndex + 1) % lineupPlayers.length
  }

  const applyRecomputedLiveGame = (
    recomputed: ReturnType<typeof recomputeLiveGame>
  ) => {
    setLivePlays(recomputed.livePlays)
    setLivePitchPlays(recomputed.livePitchPlays)
    setAwayScore(recomputed.awayScore)
    setHomeScore(recomputed.homeScore)
    setLivePitchingEntry(recomputed.livePitchingEntry)
    setRunnerOutHistory([])
    setRunnerRbiHistory([])
    setCurrentBatterIndex(getBatterIndexAfterPlay(recomputed.livePlays))
    setLiveInning(recomputed.liveInning)
    setLiveHalf(recomputed.liveHalf)
    setLiveOuts(recomputed.liveOuts)
    setBases(recomputed.bases)
    setExpandedLiveInningKey(`${recomputed.liveInning}-${recomputed.liveHalf}`)
  }

  const handleDeleteLivePlay = (playId: string) => {
    const nextBattingPlays = livePlays.filter((play) => play.id !== playId)
    const recomputed = recomputeLiveGame(nextBattingPlays, livePitchPlays)
    if (editingLiveEventId === playId) setEditingLiveEventId(null)
    applyRecomputedLiveGame(recomputed)
  }

  const handleDeleteLivePitchPlay = (playId: string) => {
    const nextPitchingPlays = livePitchPlays.filter((play) => play.id !== playId)
    const recomputed = recomputeLiveGame(livePlays, nextPitchingPlays)
    if (editingLiveEventId === playId) setEditingLiveEventId(null)
    applyRecomputedLiveGame(recomputed)
  }

  const handleUpdateLivePlay = (
    playId: string,
    nextResult: LivePlayResult,
    nextRbi: number,
    nextNote: string
  ) => {
    const play = livePlays.find((item) => item.id === playId)
    if (!play) return

    const normalizedRbi = Math.max(0, nextRbi)
    const editedBattingPlays = livePlays.map((item) =>
        item.id === playId
          ? {
              ...item,
              result: nextResult,
              rbi: normalizedRbi,
              note: nextNote,
            }
          : item
    )
    const recomputed = recomputeLiveGame(editedBattingPlays, livePitchPlays)
    const nextCursor = recomputed.stateAfterEvent.get(playId)

    setLivePlays(recomputed.livePlays)
    setLivePitchPlays(recomputed.livePitchPlays)
    setAwayScore(recomputed.awayScore)
    setHomeScore(recomputed.homeScore)
    setLivePitchingEntry(recomputed.livePitchingEntry)
    setRunnerOutHistory([])
    setRunnerRbiHistory([])

    if (editingLiveEventId === playId && nextCursor) {
      setCurrentBatterIndex(getBatterIndexAfterPlay(recomputed.livePlays, playId))
      setLiveInning(nextCursor.inning)
      setLiveHalf(nextCursor.half)
      setLiveOuts(nextCursor.outs)
      setBases(nextCursor.bases)
      setLiveGameTab(
        nextCursor.inning !== play.inning || nextCursor.half !== play.half
          ? "pitching"
          : "batting"
      )
      setExpandedLiveInningKey(`${nextCursor.inning}-${nextCursor.half}`)
      return
    }

    setCurrentBatterIndex(getBatterIndexAfterPlay(recomputed.livePlays))
    setLiveInning(recomputed.liveInning)
    setLiveHalf(recomputed.liveHalf)
    setLiveOuts(recomputed.liveOuts)
    setBases(recomputed.bases)
    setExpandedLiveInningKey(`${recomputed.liveInning}-${recomputed.liveHalf}`)
  }

  const handleUpdateLivePitchPlay = (
    playId: string,
    nextResult: LivePitchResult,
    nextNote: string
  ) => {
    const play = livePitchPlays.find((item) => item.id === playId)
    if (!play) return

    const editedPitchingPlays = livePitchPlays.map((item) =>
        item.id === playId
          ? {
              ...item,
              result: nextResult,
              note: nextNote,
            }
          : item
    )
    const recomputed = recomputeLiveGame(livePlays, editedPitchingPlays)
    const nextCursor = recomputed.stateAfterEvent.get(playId)

    setLivePlays(recomputed.livePlays)
    setLivePitchPlays(recomputed.livePitchPlays)
    setAwayScore(recomputed.awayScore)
    setHomeScore(recomputed.homeScore)
    setLivePitchingEntry(recomputed.livePitchingEntry)
    setRunnerOutHistory([])
    setRunnerRbiHistory([])

    if (editingLiveEventId === playId && nextCursor) {
      const pitchTime = getActionTimeFromId(playId)
      const battingPlaysBeforePitch = recomputed.livePlays.filter(
        (battingPlay) => getActionTimeFromId(battingPlay.id) < pitchTime
      )
      setCurrentBatterIndex(getBatterIndexAfterPlay(battingPlaysBeforePitch))
      setLiveInning(nextCursor.inning)
      setLiveHalf(nextCursor.half)
      setLiveOuts(nextCursor.outs)
      setBases(nextCursor.bases)
      setLiveGameTab(
        nextCursor.inning !== play.inning || nextCursor.half !== play.half
          ? "batting"
          : "pitching"
      )
      setExpandedLiveInningKey(`${nextCursor.inning}-${nextCursor.half}`)
      return
    }

    setCurrentBatterIndex(getBatterIndexAfterPlay(recomputed.livePlays))
    setLiveInning(recomputed.liveInning)
    setLiveHalf(recomputed.liveHalf)
    setLiveOuts(recomputed.liveOuts)
    setBases(recomputed.bases)
    setExpandedLiveInningKey(`${recomputed.liveInning}-${recomputed.liveHalf}`)
  }

  const handleSyncLiveGame = async () => {
    if (!isMetaComplete || livePlays.length === 0) return

    try {
      setIsSaving(true)
      await onSaveGame(gameMeta, aggregateLivePlays(livePlays, allPlayers))
      // only reset on success
      setLivePlays([])
      setCurrentBatterIndex(0)
      setLiveInning(1)
      setLiveHalf("Top")
      setLiveOuts(0)
      setBases(emptyBases)
      setSelectedBase(null)
      setRunnerOutHistory([])
      setRunnerRbiHistory([])
      setReplacedLineupIds({})
      setAwayScore(0)
      setHomeScore(0)
      setLivePitchPlays([])
      setQuickPitchNote("")
      setLivePitchingEntry({
        inningsPitchedOuts: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 0,
        homeRunsAllowed: 0,
      })
      window.localStorage.removeItem(localDraftKey)
    } catch {
      // error is surfaced via saveError prop from parent
    } finally {
      setIsSaving(false)
    }
  }

  const handleResetLiveGame = () => {
    if (
      (livePlays.length > 0 || livePitchPlays.length > 0) &&
      !window.confirm("Clear this local game draft?")
    ) {
      return
    }

    setLivePlays([])
    setCurrentBatterIndex(0)
    setLiveInning(1)
    setLiveHalf("Top")
    setLiveOuts(0)
    setBases(emptyBases)
    setSelectedBase(null)
    setRunnerOutHistory([])
    setRunnerRbiHistory([])
    setReplacedLineupIds({})
    setAwayScore(0)
    setHomeScore(0)
    setQuickRbi(0)
    setLivePitchPlays([])
    setQuickPitchNote("")
    setLivePitchingEntry({
      inningsPitchedOuts: 0,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walks: 0,
      strikeouts: 0,
      homeRunsAllowed: 0,
    })
    window.localStorage.removeItem(localDraftKey)
  }

  const handleSyncLivePitching = async () => {
    if (!isMetaComplete || livePitchPlays.length === 0) return

    try {
      setIsSaving(true)
      onPitchingEntryChange(livePitchingEntry)
      await onSavePitchingGame(livePitchingEntry, livePitcher.id)
      setLivePitchPlays([])
      setQuickPitchNote("")
      setLivePitchingEntry({
        inningsPitchedOuts: 0,
        hitsAllowed: 0,
        runsAllowed: 0,
        earnedRuns: 0,
        walks: 0,
        strikeouts: 0,
        homeRunsAllowed: 0,
      })
    } finally {
      setIsSaving(false)
    }
  }

  /* ---------------- UI ---------------- */

  return (
    <main className="w-full">
      <div className="mb-4 flex flex-col gap-3 rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-green-900">Record Game</p>
          <p className="text-xs text-gray-500">
            {inputStyle === "game"
              ? `Game Mode · Local saved ${lastLocalSaveAt || "now"}`
              : inputStyle === "edit"
                ? "Edit saved games"
                : "Standard entry"}
          </p>
        </div>
        <div className="inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
          <button
            type="button"
            onClick={() => setInputStyle("standard")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
              inputStyle === "standard"
                ? "bg-green-900 text-white shadow-sm"
                : "text-gray-600 hover:text-green-900"
            }`}
          >
            Standard
          </button>
          <button
            type="button"
            onClick={() => setInputStyle("game")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
              inputStyle === "game"
                ? "bg-green-900 text-white shadow-sm"
                : "text-gray-600 hover:text-green-900"
            }`}
          >
            Game Mode
          </button>
          <button
            type="button"
            onClick={() => setInputStyle("edit")}
            className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
              inputStyle === "edit"
                ? "bg-green-900 text-white shadow-sm"
                : "text-gray-600 hover:text-green-900"
            }`}
          >
            Edit Game
          </button>
        </div>
      </div>

      {inputStyle === "game" ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[280px_1fr_360px]">
          <section className="order-3 rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:sticky xl:top-6 xl:order-none xl:self-start">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Lineup</h2>
              <button
                type="button"
                onClick={handleAddLineupSpot}
                disabled={lineupIds.length >= allPlayers.length}
                className="rounded-lg border border-green-900 px-3 py-2 text-xs font-semibold text-green-900 disabled:cursor-not-allowed disabled:border-gray-200 disabled:text-gray-400"
              >
                Add
              </button>
            </div>

            <div className="mt-4 space-y-1.5">
              {lineupIds.map((playerId, index) => {
                const isCurrent = index === currentBatterIndex
                const replacedPlayer = replacedLineupIds[index]
                  ? allPlayers.find((player) => player.id === replacedLineupIds[index])
                  : null
                return (
                  <div key={`${playerId}-${index}`}>
                    <div
                      className={`flex items-center gap-1.5 rounded-xl border p-2 ${
                        isCurrent
                          ? "border-green-900 bg-green-50"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentBatterIndex(index)}
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                          isCurrent
                            ? "bg-green-900 text-white"
                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                        }`}
                      >
                        {index + 1}
                      </button>
                      <select
                        value={playerId}
                        onChange={(event) => handleLineupChange(index, event.target.value)}
                        className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                      >
                        {allPlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {getPlayerLabel(player)} {player.position}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setPinhitters((prev) => ({ ...prev, [index]: allPlayers.find((p) => !lineupIds.includes(p.id))?.id ?? allPlayers[0].id }))}
                        className="shrink-0 rounded px-1.5 py-1 text-[10px] font-bold text-amber-500 hover:bg-amber-50"
                      >
                        PH
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (pendingRemoveIndex === index) {
                            handleRemoveLineupSpot(index)
                            setPendingRemoveIndex(null)
                          } else {
                            setPendingRemoveIndex(index)
                          }
                        }}
                        onBlur={() => setPendingRemoveIndex(null)}
                        disabled={lineupIds.length <= 1}
                        className={`shrink-0 text-sm font-bold transition-colors disabled:opacity-20 ${
                          pendingRemoveIndex === index
                            ? "text-red-500"
                            : "text-gray-300 hover:text-red-400"
                        }`}
                      >
                        ✕
                      </button>
                    </div>
                    {replacedPlayer && (
                      <p className="ml-9 mt-1 text-[10px] font-medium text-gray-400">
                        PH for {getPlayerLabel(replacedPlayer)} {replacedPlayer.position}
                      </p>
                    )}
                    {pinhitters[index] !== undefined && (
                      <div className="mt-1 flex items-center gap-1.5 rounded-lg border border-dashed border-amber-300 bg-amber-50 p-1.5">
                        <span className="shrink-0 rounded bg-amber-400 px-1.5 py-0.5 text-[10px] font-bold text-white">PH</span>
                        <select
                          value={pinhitters[index]}
                          onChange={(e) => setPinhitters((prev) => ({ ...prev, [index]: e.target.value }))}
                          className="min-w-0 flex-1 rounded-md border border-gray-200 bg-white px-2 py-1 text-sm"
                        >
                          {allPlayers.map((player) => (
                            <option key={player.id} value={player.id}>
                              {getPlayerLabel(player)} {player.position}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setPinhitters((prev) => { const next = { ...prev }; delete next[index]; return next })}
                          className="shrink-0 text-xs text-amber-400 hover:text-red-500"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="mt-6 border-t border-gray-100 pt-4">
              <h2 className="text-lg font-semibold">Pitcher</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {allPlayers
                  .slice()
                  .sort((a, b) => {
                    if (a.position === "P" && b.position !== "P") return -1
                    if (a.position !== "P" && b.position === "P") return 1
                    return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
                  })
                  .map((player) => (
                    <button
                      key={player.id}
                      type="button"
                      onClick={() => setLivePitcherId(player.id)}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-colors ${
                        player.id === livePitcherId
                          ? "bg-green-900 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {getPlayerLabel(player)}
                    </button>
                  ))}
              </div>
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm text-gray-600">
                IP {formatLiveInnings(livePitchingEntry.inningsPitchedOuts)} · SO{" "}
                {livePitchingEntry.strikeouts} · BB {livePitchingEntry.walks}
              </div>
            </div>
          </section>

          <section className="order-1 space-y-4 sm:space-y-6 xl:order-none">
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <GameMetaFields
                gameMeta={gameMeta}
                onGameMetaChange={onGameMetaChange}
              />
              <div className="mt-4 inline-flex w-full rounded-xl border border-gray-200 bg-gray-50 p-1 sm:w-auto">
                <button
                  type="button"
                  onClick={() => handleSetLiveGameTab("batting")}
                  disabled={isLiveBattingBlocked}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
                    liveGameTab === "batting"
                      ? "bg-green-900 text-white shadow-sm"
                      : isLiveBattingBlocked
                        ? "cursor-not-allowed text-gray-300"
                        : "text-gray-600 hover:text-green-900"
                  }`}
                >
                  Batting
                </button>
                <button
                  type="button"
                  onClick={() => handleSetLiveGameTab("pitching")}
                  disabled={isLivePitchingBlocked}
                  className={`flex-1 rounded-lg px-4 py-2 text-sm font-semibold sm:flex-none ${
                    liveGameTab === "pitching"
                      ? "bg-green-900 text-white shadow-sm"
                      : isLivePitchingBlocked
                        ? "cursor-not-allowed text-gray-300"
                        : "text-gray-600 hover:text-green-900"
                  }`}
                >
                  Pitching
                </button>
              </div>
              {currentFrameLocksRecordMode && (
                <p className="mt-2 text-xs font-medium text-gray-500">
                  {liveHalf} {liveInning} is locked to{" "}
                  {currentFrameLocksRecordMode === "batting" ? "Batting" : "Pitching"}.
                </p>
              )}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Inning</p>
                  <div className="mt-2 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setLiveInning((prev) => Math.max(prev - 1, 1))}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold shadow-sm"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold">{liveInning}</span>
                    <button
                      type="button"
                      onClick={() => setLiveInning((prev) => prev + 1)}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-base font-bold shadow-sm"
                    >
                      +
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Half</p>
                  <button
                    type="button"
                    onClick={() => setLiveHalf((prev) => (prev === "Top" ? "Bottom" : "Top"))}
                    className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2 text-sm font-bold shadow-sm"
                  >
                    <span>{liveHalf === "Top" ? "▲" : "▼"}</span>
                    <span>{liveHalf}</span>
                  </button>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Outs</p>
                  <div className="mt-3 flex items-center justify-around">
                    {[1, 2, 3].map((out) => (
                      <button
                        key={out}
                        type="button"
                        onClick={() => setLiveOuts(out === liveOuts ? out - 1 : out)}
                        className={`h-6 w-6 rounded-full border-2 transition-colors ${
                          liveOuts >= out
                            ? "border-amber-500 bg-amber-400"
                            : "border-gray-300 bg-white"
                        }`}
                        aria-label={`${out} out`}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Score</p>
                  <div className="mt-1 flex items-center justify-around">
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-gray-400">Away</p>
                      <p className="text-2xl font-bold leading-none">{awayScore}</p>
                      <div className="mt-1.5 flex gap-1">
                        <button type="button" onClick={() => setAwayScore((prev) => Math.max(prev - 1, 0))} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">−</button>
                        <button type="button" onClick={() => setAwayScore((prev) => prev + 1)} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">+</button>
                      </div>
                    </div>
                    <span className="text-lg font-bold text-gray-300">–</span>
                    <div className="text-center">
                      <p className="text-[10px] font-medium text-gray-400">Home</p>
                      <p className="text-2xl font-bold leading-none">{homeScore}</p>
                      <div className="mt-1.5 flex gap-1">
                        <button type="button" onClick={() => setHomeScore((prev) => Math.max(prev - 1, 0))} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">−</button>
                        <button type="button" onClick={() => setHomeScore((prev) => prev + 1)} className="flex h-5 w-5 items-center justify-center rounded bg-white text-xs font-bold shadow-sm">+</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {liveGameTab === "batting" ? (
              <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-green-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                        At Bat
                      </span>
                      <span className="text-xs text-gray-400">
                        {liveHalf === "Top" ? "▲" : "▼"} {liveInning} · {liveOuts} out{liveOuts !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {currentLiveBatter ? (
                      <>
                        <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                          {getPlayerLabel(currentLiveBatter)}
                        </h2>
                        <p className="mt-0.5 text-sm text-gray-500">
                          {currentLiveBatter.position}
                        </p>
                      </>
                    ) : (
                      <p className="mt-2 text-sm text-red-700">
                        Add at least one player to the lineup.
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 md:min-w-[230px]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUndoLiveAction("batting")}
                        disabled={livePlays.length === 0 && runnerOutHistory.length === 0 && runnerRbiHistory.length === 0}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={handleRunnerRbi}
                        disabled={!selectedBase || !bases[selectedBase] || livePlays.length === 0}
                        className="rounded-lg bg-green-900 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        RBI
                      </button>
                      <button
                        type="button"
                        onClick={handleRunnerOut}
                        disabled={!selectedBase || !bases[selectedBase]}
                        className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Out
                      </button>
                    </div>
                    <BaseDiamond
                      bases={bases}
                      onBasesChange={setBases}
                      selectedBase={selectedBase}
                      onSelectBase={setSelectedBase}
                    />
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-gray-50 px-2 py-3 sm:px-4">
                    <p className="font-semibold uppercase text-gray-500">This Inning</p>
                    <p className="mt-1 text-lg font-bold">{currentInningPlays.length}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-2 py-3 sm:px-4">
                    <p className="font-semibold uppercase text-gray-500">Runs</p>
                    <p className="mt-1 text-lg font-bold">{currentInningRuns}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 px-2 py-3 sm:px-4">
                    <p className="font-semibold uppercase text-gray-500">Hits</p>
                    <p className="mt-1 text-lg font-bold">{currentInningHits}</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, first: !prev.first }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.first ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    1B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, second: !prev.second }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.second ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    2B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, third: !prev.third }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.third ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    3B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases(emptyBases)}
                    className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-500"
                  >
                    Clear Bases
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {liveResultLabels.map((item) => (
                    <button
                      key={item.result}
                      type="button"
                      onClick={() => handleRecordLivePlay(item.result)}
                      disabled={!isMetaComplete || !currentLiveBatter || isLiveBattingBlocked}
                      className={`min-h-16 rounded-xl px-2 py-3 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${battingResultClass(item.result)}`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">Note</p>
                    <input
                      type="text"
                      value={quickNote}
                      onChange={(e) => setQuickNote(e.target.value)}
                      placeholder="e.g. deep fly..."
                      className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-5">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-green-900">Current Pitcher</p>
                    <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                      {getPlayerLabel(livePitcher)}
                    </h2>
                    <p className="mt-1 text-sm text-gray-500">
                      {livePitcher.position} · {liveHalf} {liveInning} · {liveOuts} outs
                    </p>
                  </div>

                  <div className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2 md:min-w-[230px]">
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUndoLiveAction("pitching")}
                        disabled={livePitchPlays.length === 0 && runnerOutHistory.length === 0}
                        className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-xs font-semibold text-gray-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Undo
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecordLivePitch("R")}
                        disabled={!isMetaComplete || isLivePitchingBlocked}
                        className="rounded-lg bg-orange-100 px-2 py-2 text-xs font-semibold text-orange-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        Run
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRecordLivePitch("ER")}
                        disabled={!isMetaComplete || isLivePitchingBlocked}
                        className="rounded-lg bg-red-200 px-2 py-2 text-xs font-semibold text-red-900 shadow-sm disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                      >
                        ER
                      </button>
                      <button
                        type="button"
                        onClick={handleRunnerOut}
                        disabled={!selectedBase || !bases[selectedBase]}
                        className="rounded-lg bg-gray-900 px-2 py-2 text-xs font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:bg-gray-300"
                      >
                        Out
                      </button>
                    </div>
                    <BaseDiamond
                      bases={bases}
                      onBasesChange={setBases}
                      selectedBase={selectedBase}
                      onSelectBase={setSelectedBase}
                    />
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-500">
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, first: !prev.first }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.first ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    1B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, second: !prev.second }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.second ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    2B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases((prev) => ({ ...prev, third: !prev.third }))}
                    className={`rounded-full px-2.5 py-1 font-semibold ${bases.third ? "bg-green-100 text-green-900" : "bg-gray-100 text-gray-500"}`}
                  >
                    3B
                  </button>
                  <button
                    type="button"
                    onClick={() => setBases(emptyBases)}
                    className="rounded-full bg-gray-100 px-2.5 py-1 font-semibold text-gray-500"
                  >
                    Clear Bases
                  </button>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">IP</p>
                    <p className="mt-1 text-2xl font-bold">
                      {formatLiveInnings(livePitchingEntry.inningsPitchedOuts)}
                    </p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">SO</p>
                    <p className="mt-1 text-2xl font-bold">{livePitchingEntry.strikeouts}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">BB</p>
                    <p className="mt-1 text-2xl font-bold">{livePitchingEntry.walks}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3">
                    <p className="text-xs font-semibold uppercase text-gray-500">ER</p>
                    <p className="mt-1 text-2xl font-bold">{livePitchingEntry.earnedRuns}</p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {livePitchResultLabels.map((item) => (
                    <button
                      key={item.result}
                      type="button"
                      onClick={() => handleRecordLivePitch(item.result)}
                      disabled={!isMetaComplete || isLivePitchingBlocked}
                      className={`min-h-16 rounded-xl px-2 py-3 text-sm font-bold shadow-sm transition-colors disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400 ${pitchingResultClass(item.result)}`}
                    >
                      {item.label}
                    </button>
                  ))}
                  <div className="min-h-16 overflow-hidden rounded-xl bg-red-50 text-sm font-bold text-red-900 shadow-sm">
                    <div className="grid h-full grid-cols-3 divide-x divide-red-100">
                      {[
                        { result: "H" as LivePitchResult, label: "1B" },
                        { result: "2B" as LivePitchResult, label: "2B" },
                        { result: "3B" as LivePitchResult, label: "3B" },
                      ].map((item) => (
                        <button
                          key={item.result}
                          type="button"
                          onClick={() => handleRecordLivePitch(item.result)}
                          disabled={!isMetaComplete || isLivePitchingBlocked}
                          className="px-1 py-3 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRecordLivePitch("E")}
                    disabled={!isMetaComplete || isLivePitchingBlocked}
                    className="min-h-16 rounded-xl bg-amber-100 px-2 py-3 text-sm font-bold text-amber-900 shadow-sm transition-colors hover:bg-amber-200 disabled:cursor-not-allowed disabled:bg-gray-200 disabled:text-gray-400"
                  >
                    Error
                  </button>
                </div>

                <div className="mt-5 rounded-xl bg-gray-50 p-3">
                  <p className="text-xs font-semibold uppercase text-gray-500">Note</p>
                  <input
                    type="text"
                    value={quickPitchNote}
                    onChange={(e) => setQuickPitchNote(e.target.value)}
                    placeholder="e.g. missed spot..."
                    className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                  />
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">H</p>
                    <p className="mt-1 text-xl font-bold">{livePitchingEntry.hitsAllowed}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">R</p>
                    <p className="mt-1 text-xl font-bold">{livePitchingEntry.runsAllowed}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">HR</p>
                    <p className="mt-1 text-xl font-bold">{livePitchingEntry.homeRunsAllowed}</p>
                  </div>
                  <div className="rounded-xl bg-gray-50 p-3 text-sm">
                    <p className="text-xs font-semibold uppercase text-gray-500">Events</p>
                    <p className="mt-1 text-xl font-bold">{livePitchPlays.length}</p>
                  </div>
                </div>
              </div>
            )}
          </section>

          <aside className="order-2 space-y-4 sm:space-y-6 xl:order-none">
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <p className="text-sm font-medium text-green-900">Game Actions</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleUndoLiveAction(liveGameTab)}
                  disabled={
                    liveGameTab === "batting"
                      ? livePlays.length === 0 && runnerOutHistory.length === 0 && runnerRbiHistory.length === 0
                      : livePitchPlays.length === 0 && runnerOutHistory.length === 0
                  }
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Undo
                </button>
                <button
                  type="button"
                  onClick={handleResetLiveGame}
                  className="rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-700"
                >
                  Clear
                </button>
                {pendingSyncConfirm ? (
                  <>
                    <button
                      type="button"
                      onClick={async () => {
                        setPendingSyncConfirm(false)
                        if (liveGameTab === "batting") await handleSyncLiveGame()
                        else await handleSyncLivePitching()
                      }}
                      disabled={isSaving}
                      className="col-span-2 rounded-lg bg-green-900 px-3 py-3 text-sm font-semibold text-white disabled:opacity-60"
                    >
                      {isSaving ? "Syncing..." : "Confirm Save"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingSyncConfirm(false)}
                      className="col-span-2 rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-600"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setPendingSyncConfirm(true)}
                    disabled={
                      isSaving ||
                      !isMetaComplete ||
                      (liveGameTab === "batting"
                        ? livePlays.length === 0
                        : livePitchPlays.length === 0)
                    }
                    className="col-span-2 rounded-lg bg-green-900 px-3 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
                  >
                    {liveGameTab === "batting"
                      ? `Sync Batting (${livePlays.length})`
                      : `Sync Pitching (${livePitchPlays.length})`}
                  </button>
                )}
              </div>
              {saveError && (
                <div className="mt-3 flex items-start justify-between gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                  <span className="flex-1">{saveError}</span>
                  <button
                    type="button"
                    onClick={onClearSaveError}
                    className="shrink-0 font-bold leading-none"
                  >
                    ✕
                  </button>
                </div>
              )}
              <div className="mt-4 space-y-2 text-xs text-gray-500">
                <p>{isMetaComplete ? "Game info complete" : "Enter date and opponent"}</p>
                <p>{lineupPlayers.length} lineup spots</p>
                <p>{livePlays.length} unsynced batting plays</p>
                <p>{livePitchPlays.length} unsynced pitching events</p>
              </div>
            </div>

            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <h2 className="text-lg font-semibold">All Innings</h2>
              <p className="mt-1 text-sm text-gray-500">
                {awayScore}-{homeScore} · {liveHalf} {liveInning} · {liveOuts} outs
              </p>
              <div className="mt-4 space-y-3">
                {liveInningSummaries.map((summary) => {
                  const battingRuns = summary.batting.reduce(
                    (total, play) => total + play.runs,
                    0
                  )
                  const battingHits = summary.batting.reduce(
                    (total, play) => total + play.statLine.H,
                    0
                  )
                  const pitchingRuns = summary.pitching.reduce(
                    (total, play) =>
                      total + estimateRunsForPitching(play.basesBefore, play.result),
                    0
                  )
                  const hasEvents = summary.batting.length > 0 || summary.pitching.length > 0
                  const summaryKey = `${summary.inning}-${summary.half}`
                  const isExpanded = expandedLiveInningKey === summaryKey

                  return (
                    <div
                      key={summaryKey}
                      className={`rounded-xl border bg-gray-50 transition ${
                        isExpanded ? "border-green-900" : "border-gray-100"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setExpandedLiveInningKey(isExpanded ? "" : summaryKey)
                          setLiveInning(summary.inning)
                          setLiveHalf(summary.half)
                        }}
                        className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                      >
                        <span>
                          <span className="block text-sm font-bold text-gray-900">
                            {summary.half} {summary.inning}
                          </span>
                          <span className="mt-0.5 block text-xs font-semibold text-gray-500">
                            B R{battingRuns} H{battingHits} · P R{pitchingRuns}
                          </span>
                        </span>
                        <span className="text-xs font-semibold text-green-900">
                          {isExpanded ? "Close" : "Open"}
                        </span>
                      </button>

                      {isExpanded && (
                        <div className="border-t border-gray-100 px-3 pb-3 pt-3">
                          {!hasEvents && (
                            <p className="text-sm text-gray-500">No events yet.</p>
                          )}

                      {isExpanded && summary.batting.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Batting
                          </p>
                          {summary.batting.map((play) => {
                            const isEditing = editingLiveEventId === play.id
                            return (
                              <div
                                key={play.id}
                                className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${battingResultBadge(play.result)}`}>
                                    {play.result}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{play.playerName}</p>
                                    <p className="truncate text-xs text-gray-500">
                                      RBI {play.rbi} · Runs {play.runs}
                                      {play.note ? ` · ${play.note}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditing) {
                                          setEditingLiveEventId(null)
                                          return
                                        }
                                        syncMainCursorToLivePlay(play)
                                        setEditingLiveEventId(play.id)
                                      }}
                                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
                                    >
                                      {isEditing ? "Close" : "Edit"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLivePlay(play.id)}
                                      className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {isEditing && (
                                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_80px]">
                                    <select
                                      value={play.result}
                                      onChange={(event) =>
                                        handleUpdateLivePlay(
                                          play.id,
                                          event.target.value as LivePlayResult,
                                          play.rbi,
                                          play.note
                                        )
                                      }
                                      className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                                    >
                                      {liveResultLabels.map((item) => (
                                        <option key={item.result} value={item.result}>
                                          {item.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="number"
                                      min={0}
                                      value={play.rbi}
                                      onChange={(event) =>
                                        handleUpdateLivePlay(
                                          play.id,
                                          play.result,
                                          Number(event.target.value),
                                          play.note
                                        )
                                      }
                                      className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
                                    />
                                    <input
                                      type="text"
                                      value={play.note}
                                      onChange={(event) =>
                                        handleUpdateLivePlay(
                                          play.id,
                                          play.result,
                                          play.rbi,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Note"
                                      className="rounded-lg border border-gray-200 px-2 py-2 text-sm sm:col-span-2"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}

                      {isExpanded && summary.pitching.length > 0 && (
                        <div className="mt-3 space-y-2">
                          <p className="text-xs font-semibold uppercase text-gray-500">
                            Pitching
                          </p>
                          {summary.pitching.map((play) => {
                            const isEditing = editingLiveEventId === play.id
                            return (
                              <div
                                key={play.id}
                                className="rounded-lg border border-gray-100 bg-white px-3 py-2 text-sm"
                              >
                                <div className="flex items-center gap-2">
                                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${pitchingResultBadge(play.result)}`}>
                                    {play.result}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate font-medium">{play.pitcherName}</p>
                                    <p className="truncate text-xs text-gray-500">
                                      Runs {estimateRunsForPitching(play.basesBefore, play.result)}
                                      {play.note ? ` · ${play.note}` : ""}
                                    </p>
                                  </div>
                                  <div className="flex shrink-0 gap-1.5">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (isEditing) {
                                          setEditingLiveEventId(null)
                                          return
                                        }
                                        syncMainCursorToLivePitchPlay(play)
                                        setEditingLiveEventId(play.id)
                                      }}
                                      className="rounded-lg border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-700"
                                    >
                                      {isEditing ? "Close" : "Edit"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteLivePitchPlay(play.id)}
                                      className="rounded-lg bg-red-600 px-2 py-1 text-xs font-semibold text-white"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>

                                {isEditing && (
                                  <div className="mt-3 grid grid-cols-1 gap-2">
                                    <select
                                      value={play.result}
                                      onChange={(event) =>
                                        handleUpdateLivePitchPlay(
                                          play.id,
                                          event.target.value as LivePitchResult,
                                          play.note
                                        )
                                      }
                                      className="rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm"
                                    >
                                      {[
                                        ...livePitchResultLabels,
                                        { result: "H" as LivePitchResult, label: "1B" },
                                        { result: "2B" as LivePitchResult, label: "2B" },
                                        { result: "3B" as LivePitchResult, label: "3B" },
                                        { result: "R" as LivePitchResult, label: "Run" },
                                        { result: "ER" as LivePitchResult, label: "ER" },
                                        { result: "E" as LivePitchResult, label: "Error" },
                                      ].map((item) => (
                                        <option key={item.result} value={item.result}>
                                          {item.label}
                                        </option>
                                      ))}
                                    </select>
                                    <input
                                      type="text"
                                      value={play.note}
                                      onChange={(event) =>
                                        handleUpdateLivePitchPlay(
                                          play.id,
                                          play.result,
                                          event.target.value
                                        )
                                      }
                                      placeholder="Note"
                                      className="rounded-lg border border-gray-200 px-2 py-2 text-sm"
                                    />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>

          </aside>
        </div>
      ) : inputStyle === "edit" ? (
        <div className="grid grid-cols-1 gap-4 sm:gap-6 xl:grid-cols-[1fr_420px]">
          <section className="order-2 space-y-4 sm:space-y-6 xl:order-1">
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">{teamName}</p>
                  <h2 className="mt-1 text-2xl font-bold text-gray-900">
                    {teamRecord.wins}-{teamRecord.losses}
                    {teamRecord.ties > 0 ? `-${teamRecord.ties}` : ""}
                  </h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Games</p>
                    <p className="mt-1 font-bold text-gray-900">{teamGameEntries.length}</p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Last</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {teamGameEntries[0] ? getGameScore(teamGameEntries[0].gameMeta) : "-"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-gray-50 px-3 py-2">
                    <p className="text-xs font-semibold uppercase text-gray-500">Result</p>
                    <p className="mt-1 font-bold text-gray-900">
                      {teamGameEntries[0]
                        ? getGameResult(teamGameEntries[0].gameMeta) || "-"
                        : "-"}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isEditingSavedEntry ? (
              <>
                <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                  <GameMetaFields
                    gameMeta={gameMeta}
                    onGameMetaChange={onGameMetaChange}
                    showLocation
                    showMemo
                    showScore
                    teamName={teamName}
                  />
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    {onDeleteSavedGame && (
                      <button
                        type="button"
                        onClick={onDeleteSavedGame}
                        className="rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                      >
                        Delete Game
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onCancelEditSavedEntry}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handlePrimaryAction}
                      disabled={!isMetaComplete}
                      className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Save Game Info
                    </button>
                  </div>
                </div>

                <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-lg font-semibold text-gray-900">Players</h2>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-500">
                      {editGameEntries.length}
                    </span>
                  </div>

                  <div className="mt-4 flex flex-col gap-2 rounded-xl border border-gray-200 bg-gray-50 p-3 sm:flex-row">
                    <select
                      value={selectedEditAddPlayerId}
                      onChange={(event) => setEditAddPlayerId(event.target.value)}
                      disabled={editAvailablePlayers.length === 0}
                      className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm disabled:cursor-not-allowed disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {editAvailablePlayers.length === 0 ? (
                        <option value="">All players are in this game</option>
                      ) : (
                        editAvailablePlayers.map((player) => (
                          <option key={player.id} value={player.id}>
                            {getPlayerLabel(player)} {player.position}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddEditGameEntry}
                      disabled={editAvailablePlayers.length === 0}
                      className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      Add Player
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {editGameEntries.map((entry) => {
                      const player = allPlayers.find((item) => item.id === entry.playerId)
                      const isEditingPlayer = selectedEditGameEntry?.playerId === entry.playerId
                      const playerEvents = livePlays.filter((play) => play.playerId === entry.playerId)

                      return (
                        <div
                          key={entry.playerId}
                          onMouseEnter={() => setHoveredEditPlayerId(entry.playerId)}
                          onFocus={() => setHoveredEditPlayerId(entry.playerId)}
                          className={`rounded-xl border px-3 py-3 transition ${
                            isEditingPlayer
                              ? "border-green-900 bg-green-50"
                              : "border-gray-200 bg-white"
                          }`}
                        >
                          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-gray-900">
                                {player ? getPlayerLabel(player) : `Player ${entry.playerId}`}
                              </p>
                              <p className="mt-1 text-xs text-gray-500">
                                {player?.position ?? entry.gamePositions.join(" / ")} · AB {entry.AB} · H {entry.H} · RBI {entry.RBI}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
                              <button
                                type="button"
                                onClick={() =>
                                  setSelectedEditPlayerId(
                                    isEditingPlayer ? "" : entry.playerId
                                  )
                                }
                                className={`rounded-lg px-3 py-2 text-sm font-semibold ${
                                  isEditingPlayer
                                    ? "bg-green-900 text-white"
                                    : "border border-gray-200 text-gray-700 hover:bg-gray-50"
                                }`}
                              >
                                {isEditingPlayer ? "Close" : "Edit"}
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveEditGameEntry(entry.playerId)}
                                className="rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white hover:bg-red-700"
                              >
                                Remove
                              </button>
                            </div>
                          </div>

                          {isEditingPlayer && (
                            <div className="mt-4">
                              <BattingStatFields
                                entry={entry}
                                onEntryChange={(nextEntry) =>
                                  handleUpdateEditGameEntry(entry.playerId, nextEntry)
                                }
                              />
                            </div>
                          )}

                          {isEditingPlayer && playerEvents.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1.5">
                              {playerEvents.map((play) => (
                                <span
                                  key={play.id}
                                  className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600"
                                >
                                  {play.half} {play.inning} · {play.result}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>

                  {editGameEntries.length === 0 && (
                    <div className="mt-3 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
                      No players in this game.
                    </div>
                  )}

                  {hoveredEditPlayerEvents.length > 0 && (
                    <div className="mt-4 rounded-xl bg-gray-50 p-3">
                      <p className="text-xs font-semibold uppercase text-gray-500">Game Mode Hits</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {hoveredEditPlayerEvents.map((play) => (
                          <span
                            key={play.id}
                            className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-gray-600"
                          >
                            {play.half} {play.inning} · {play.result}
                            {play.rbi > 0 ? ` · RBI ${play.rbi}` : ""}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {hasInvalidEditGameStats && (
                    <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      Check the stat lines: hits cannot be greater than at-bats, and extra-base hits cannot be greater than hits.
                    </p>
                  )}

                  <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={onCancelEditSavedEntry}
                      className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEditedGame}
                      disabled={
                        isSaving ||
                        !isMetaComplete ||
                        editGameEntries.length === 0 ||
                        hasInvalidEditGameStats
                      }
                      className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
                    >
                      {isSaving ? "Saving..." : "Save Players & Scores"}
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-xl bg-white p-10 text-center shadow-sm sm:rounded-2xl">
                <p className="text-base font-semibold text-gray-700">Select a game to edit</p>
                <p className="mt-1 text-sm text-gray-400">Choose a game from the list to edit its details and player stats.</p>
              </div>
            )}
          </section>

          <aside className="order-1 space-y-4 sm:space-y-6 xl:order-2">
            <SavedEntriesList
              savedEntries={teamGameEntries}
              title="Games"
              onEdit={onStartEditSavedEntry}
              editingSavedEntryId={editingSavedEntryId}
              emptyMessage="No saved games yet."
              showDescription={false}
              showStats={false}
            />
          </aside>
        </div>
      ) : (
      <div
        className={`grid grid-cols-1 gap-4 sm:gap-6 ${
          showRosterPanel
            ? "xl:grid-cols-[200px_1fr_360px]"
            : "xl:grid-cols-[1fr_360px]"
        }`}
      >

        {/* ROSTER PANEL */}
        {showRosterPanel && (
          <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4 xl:sticky xl:top-6 xl:self-start">
            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Roster
            </p>
            <div className="mt-3 space-y-1">
              {allPlayers.map((player) => {
                const isActive = player.id === activePlayer.id
                return (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() => onSelectPlayer(player)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                      isActive
                        ? "bg-green-900 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    {player.jerseyNumber != null ? (
                      <span className={`mr-1.5 text-xs ${isActive ? "text-green-200" : "text-gray-400"}`}>
                        #{player.jerseyNumber}
                      </span>
                    ) : null}
                    {player.name}
                    <span className={`ml-1.5 text-xs ${isActive ? "text-green-200" : "text-gray-400"}`}>
                      {player.position}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* CENTER */}
        <div className="space-y-4 sm:space-y-6">

          <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <GameMetaFields
              gameMeta={gameMeta}
              onGameMetaChange={onGameMetaChange}
              showScore
              teamName={teamName}
            />
          </div>

          <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-white">
                {activePlayer.jerseyNumber != null ? `#${activePlayer.jerseyNumber}` : activePlayer.name[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold leading-tight">{activePlayer.name}</h2>
                <p className="text-xs text-gray-400">{teamName} · {seasonYear}</p>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase text-gray-400">Positions</p>
                <button
                  type="button"
                  onClick={addGamePosition}
                  className="text-xs font-semibold text-green-900 hover:underline"
                >
                  + Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {gamePositions.map((position, index) => (
                  <div key={`${position}-${index}`} className="flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 pl-2 pr-1 py-1">
                    <select
                      value={position}
                      onChange={(event) => updateGamePosition(index, event.target.value as Position)}
                      className="bg-transparent text-sm font-semibold text-gray-700 outline-none"
                    >
                      {gamePositionOptions.map((option) => (
                        <option key={`${option}-${index}`} value={option}>{option}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => removeGamePosition(index)}
                      disabled={gamePositions.length === 1}
                      className="ml-0.5 text-gray-300 hover:text-red-400 disabled:opacity-20"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 🔥 Score Panel */}
          <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
            <div className="mb-4 flex border-b border-gray-200">
              <button
                type="button"
                onClick={() => handleSetRecordMode("batting")}
                className={`px-4 py-2 text-sm font-semibold ${
                  recordMode === "batting"
                    ? "border-b-2 border-green-900 text-green-900"
                    : "text-gray-500 hover:text-gray-800"
                }`}
              >
                Batting
              </button>

              {canRecordPitching && (
                <button
                  type="button"
                  onClick={() => handleSetRecordMode("pitching")}
                  className={`px-4 py-2 text-sm font-semibold ${
                    recordMode === "pitching"
                      ? "border-b-2 border-green-900 text-green-900"
                      : "text-gray-500 hover:text-gray-800"
                  }`}
                >
                  Pitching
                </button>
              )}
            </div>

            {recordMode === "batting" ? (
              <ScoreEntryPanel
                entry={currentEntry}
                onEntryChange={onEntryChange}
                onPrimaryAction={handlePrimaryAction}
                primaryActionLabel={
                  isEditingSavedEntry ? "Update Saved Entry" : "Add Player Entry"
                }
                primaryActionDisabled={primaryActionDisabled}
                calculatedAvg={
                  currentEntry.AB > 0
                    ? (currentEntry.H / currentEntry.AB).toFixed(3).replace("0.", ".")
                    : ".000"
                }
                showCancelEdit={isEditingSavedEntry}
                onCancelEdit={onCancelEditSavedEntry}
              />
            ) : (
              <PitchingEntryPanel
                entry={pitchingEntry}
                onEntryChange={onPitchingEntryChange}
                onPrimaryAction={onSavePitchingGame}
                primaryActionLabel="Save Pitching"
                primaryActionDisabled={isPitchingSaveDisabled}
              />
            )}
          </div>

        </div>{/* end CENTER */}

        {/* RIGHT */}
        <div className="space-y-4 sm:space-y-6">

          {recordMode === "batting" && (
            <div className="rounded-xl bg-white p-3 shadow-sm sm:rounded-2xl sm:p-4">
              {pendingEntries.length > 0 && (
                <div className="mb-3 space-y-2">
                  <p className="text-xs font-semibold uppercase text-gray-400">
                    Queued — {pendingEntries.length} {pendingEntries.length === 1 ? "player" : "players"}
                  </p>
                  {pendingEntries.map((entry) => (
                    <div key={entry.playerId} className="rounded-xl border border-gray-100 px-3 py-2.5">
                      <p className="text-sm font-semibold">{entry.playerName}</p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {entry.AB > 0 && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">AB {entry.AB}</span>}
                        {entry.H > 0 && <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-800">H {entry.H}</span>}
                        {entry.HR > 0 && <span className="rounded-full bg-green-900 px-2 py-0.5 text-xs text-white">HR {entry.HR}</span>}
                        {entry.RBI > 0 && <span className="rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-800">RBI {entry.RBI}</span>}
                        {entry.BB > 0 && <span className="rounded-full bg-sky-50 px-2 py-0.5 text-xs text-sky-700">BB {entry.BB}</span>}
                        {entry.SO > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-xs text-red-700">K {entry.SO}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <button
                onClick={handleSave}
                disabled={isSaving || pendingEntries.length === 0}
                className="w-full rounded-lg bg-green-900 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300"
              >
                {isSaving ? "Saving..." : pendingEntries.length > 0 ? `Save Game (${pendingEntries.length})` : "Save Game"}
              </button>
            </div>
          )}

          {recordMode === "batting" && (
            <SavedEntriesList
              savedEntries={savedEntries}
              onEdit={onStartEditSavedEntry}
              onDelete={onDeleteSavedEntry}
              editingSavedEntryId={editingSavedEntryId}
            />
          )}

        </div>
      </div>
      )}
    </main>
  )
}
