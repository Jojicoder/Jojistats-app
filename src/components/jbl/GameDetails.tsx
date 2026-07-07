import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import StrikeZoneView, { type PitchDot, type SwingInfo } from "../StrikeZoneView"
import FieldView, { type BallTraj } from "../FieldView"
import { teamBadge, teamColors } from "./teamTheme"
import JBLScoreboard from "./JBLScoreboard"
import { gameStorageKey, isGameRevealed, markGameWatched } from "./gameReveal"
import type {
  GameData,
  GameEvent,
  HalfInningEvent,
  LogEntry,
  PickoffEvent,
  PitchEvent,
  PlayEvent,
  StolenBaseEvent,
  SubstitutionEvent,
} from "./types"

function halfLabel(inning: number, isTop: boolean) {
  return `${isTop ? "TOP" : "BOT"} ${inning}`
}

function pitchOutcomeLabel(outcome: string) {
  if (outcome === "called strike") return "Called Strike"
  if (outcome === "swinging strike") return "Swinging Strike"
  if (outcome === "in play") return "In Play"
  if (outcome === "foul") return "Foul"
  if (outcome === "ball") return "Ball"
  return outcome
}

function resultEmoji(result: string) {
  const r = result.toLowerCase()
  if (r.includes("home run")) return "💥"
  if (r.includes("triple")) return "🔺"
  if (r.includes("double")) return "🔷"
  if (r.includes("single")) return "⚾"
  if (r.includes("walk")) return "🚶"
  if (r.includes("strikes out") || r.includes("strikeout") || r.includes("strike out")) return "🌀"
  if (r.includes("error")) return "❌"
  return "·"
}

function BatterResultChip({ result }: { result: string }) {
  const r = result.toLowerCase()
  const isHR  = r.includes("home run")
  const is3B  = r.includes("triple")
  const is2B  = r.includes("double")
  const is1B  = r.includes("single")
  const isBB  = r.includes("walk")
  const isK   = r.includes("strikes out") || r.includes("strikeout") || r.includes("strike out")
  const isErr = r.includes("error")
  const label = isHR ? "HR" : is3B ? "3B" : is2B ? "2B" : is1B ? "1B" : isBB ? "BB" : isK ? "K" : isErr ? "E" : "O"
  const color =
    isHR  ? "text-yellow-400 border-yellow-400/60" :
    is3B  ? "text-blue-400 border-blue-400/60" :
    is2B  ? "text-blue-300 border-blue-300/60" :
    is1B  ? "text-green-400 border-green-400/60" :
    isBB  ? "text-sky-400 border-sky-400/60" :
    isK   ? "text-red-400 border-red-400/60" :
    isErr ? "text-orange-400 border-orange-400/60" :
            "text-gray-500 border-gray-600"
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-black border rounded px-1 py-0.5 leading-none ${color}`}>
      {label}
    </span>
  )
}

function CountDots({ n, max, activeColor, dotSize = "h-2 w-2", inactiveColor = "bg-gray-200" }: {
  n: number; max: number; activeColor: string; dotSize?: string; inactiveColor?: string
}) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`inline-block ${dotSize} rounded-full ${i < n ? activeColor : inactiveColor}`} />
      ))}
    </span>
  )
}

function pitchTypeLabel(type: string) {
  const text = type.replace(/[_-]/g, " ")
  return text ? text[0].toUpperCase() + text.slice(1) : "Pitch"
}

function pitchTypeShort(type: string) {
  const normalized = type.toLowerCase()
  if (normalized === "fastball") return "FB"
  if (normalized === "curveball") return "CB"
  if (normalized === "changeup") return "CH"
  if (normalized === "splitter") return "SP"
  return pitchTypeLabel(type).slice(0, 2).toUpperCase()
}

function pitchTone(type: string) {
  const normalized = type.toLowerCase()
  if (normalized === "fastball") return "#ef4444"
  if (normalized === "cutter") return "#f97316"
  if (normalized === "sinker") return "#f59e0b"
  if (normalized === "curveball") return "#3b82f6"
  if (normalized === "slider") return "#a855f7"
  if (normalized === "changeup") return "#22c55e"
  if (normalized === "splitter") return "#06b6d4"
  return "#94a3b8"
}

function ReplayIcon({ paused }: { paused: boolean }) {
  return paused ? (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      <path fill="currentColor" d="M5 3.2v9.6L12.4 8 5 3.2Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      <path fill="currentColor" d="M4 3h2.6v10H4V3Zm5.4 0H12v10H9.4V3Z" />
    </svg>
  )
}

function ResetIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      <path fill="currentColor" d="M8 2.4a5.6 5.6 0 1 1-5.25 3.65l1.42.53A4.08 4.08 0 1 0 8 3.92H5.9l1.42 1.42-1.07 1.07L3 3.16 6.25 0l1.07 1.07L5.98 2.4H8Z" />
    </svg>
  )
}

function FullscreenIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      {active ? (
        <path fill="currentColor" d="M6.4 2H4.9v2.9H2v1.5h4.4V2Zm3.2 0v4.4H14V4.9h-2.9V2H9.6ZM2 9.6v1.5h2.9V14h1.5V9.6H2Zm7.6 0V14h1.5v-2.9H14V9.6H9.6Z" />
      ) : (
        <path fill="currentColor" d="M2 2h4.4v1.5H4.6l2.6 2.6-1.1 1.1-2.6-2.6v1.8H2V2Zm7.6 0H14v4.4h-1.5V4.6L9.9 7.2 8.8 6.1l2.6-2.6H9.6V2ZM6.1 8.8l1.1 1.1-2.6 2.6h1.8V14H2V9.6h1.5v1.8l2.6-2.6Zm3.8 0 2.6 2.6V9.6H14V14H9.6v-1.5h1.8L8.8 9.9l1.1-1.1Z" />
      )}
    </svg>
  )
}

function AnimatedScore({
  value,
  color,
  active,
  label,
}: {
  value: number
  color: string
  active: boolean
  label: string
}) {
  return (
    <span
      key={`${label}-${value}-${active ? "scored" : "idle"}`}
      className={active ? "jbl-score-pop" : "inline-block"}
      style={active ? { color } : undefined}
    >
      {value}
    </span>
  )
}

function trajLengthFt(traj: BallTraj): number {
  let len = 0
  for (let i = 1; i < traj.length; i += 1) {
    const [ax, ay, az] = traj[i - 1]
    const [bx, by, bz] = traj[i]
    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    len += Math.hypot(dx, dy, dz)
  }
  return len
}

function runsScoredCount(value: PlayEvent["runsScored"] | number[] | undefined): number {
  if (Array.isArray(value)) return value.length
  return value ?? 0
}

function baseRunDistanceFt(result: string): number {
  const text = result.toLowerCase()
  if (text.includes("home run")) return 360
  if (text.includes("triple")) return 270
  if (text.includes("double")) return 180
  if (
    text.includes("single") ||
    text.includes("ground") ||
    text.includes("error") ||
    text.includes("fielder")
  ) {
    return 90
  }
  return 0
}

// Diamond-path distance in feet between two bases, following the edges
// (never cutting across the infield) — matches how FieldView measures a
// baserunner's path, close enough for timing purposes even though this
// function only counts whole 90ft hops rather than exact coordinates.
function baseHopDistanceFt(from: "home" | "first" | "second" | "third", to: "home" | "first" | "second" | "third"): number {
  const order = ["home", "first", "second", "third"] as const
  const fromIdx = order.indexOf(from)
  const toIdx = to === "home" && from !== "home" ? 4 : order.indexOf(to)
  return Math.max(0, toIdx - fromIdx) * 90
}

const EXTRA_RUNNER_SPEED_FT_PER_S = 26 // keep in sync with FieldView.tsx

function playAnimationDelay(ev: PlayEvent): number {
  if (!ev.hit) return 2400

  const result = ev.result.toLowerCase()
  const grounder = result.includes("ground") || ev.hit.la <= 8
  const flightMs = Math.min(
    grounder ? 900 : 1800,
    Math.max(520, trajLengthFt(ev.hit.traj) * (grounder ? 4.2 : 3.5)),
  )
  const throwMs = grounder ? 760 : 0
  const defenseMs = grounder ? flightMs + throwMs + 650 : flightMs + 1700
  const runFeet = baseRunDistanceFt(ev.result)
  const runnerMs = runFeet > 0 ? (runFeet / (result.includes("home run") ? 44 : 32)) * 1000 : 0

  // Runners already on base (not the batter) get their own animation in
  // FieldView, on their own clock — a safe runner from 2nd/3rd needs just
  // as much time on screen to visibly complete that run as the batter
  // does, or this event advances (and the play cuts to "CHANGE"/the next
  // batter) before they've actually arrived.
  const isHitPlay = /home run|triple|double|single|beats out|error|fielder's choice/.test(result)
  const extraRunnerStartMs = grounder ? Math.max(0, flightMs - 150) : !isHitPlay ? flightMs + 150 : 280
  const extraRunnerFinishMs = ev.runnerAdvances
    .filter((a) => a.from !== "home")
    .reduce((max, a) => {
      const distFt = baseHopDistanceFt(a.from, a.to)
      const durMs = Math.max(260, (distFt / EXTRA_RUNNER_SPEED_FT_PER_S) * 1000)
      return Math.max(max, extraRunnerStartMs + durMs)
    }, 0)

  return Math.min(9200, Math.max(defenseMs, flightMs + runnerMs, extraRunnerFinishMs) + 900)
}

function chanceLabel(bases: PitchEvent["bases"]) {
  if (bases.first && bases.second && bases.third) return "Bases Loaded"
  if (bases.second && bases.third) return "2 RISP"
  if (bases.third) return "Runner on 3rd"
  if (bases.second) return "RISP"
  if (bases.first && bases.third) return "Corners"
  if (bases.first && bases.second) return "Two On"
  if (bases.first) return "Runner on 1st"
  return "Bases Empty"
}

function eventDelay(ev: GameEvent, speed: number): number {
  const base =
    ev.type === "half_inning"  ? 700 :
    ev.type === "pitch"        ? 1450 :
    ev.type === "stolen_base"  ? 1800 :
    ev.type === "pickoff"      ? 1400 :
    ev.type === "substitution" ? 2200 :
    ev.type === "play"         ? playAnimationDelay(ev) :
    1200
  return Math.max(50, base / speed)
}

function contactGrade(ev?: number): { detail: string; tone: string; color: string; metric?: string } {
  if (ev === undefined) return { detail: "MEET",   tone: "bg-emerald-500 text-white", color: "#10b981" }
  if (ev >= 100)        return { detail: "BARREL", tone: "bg-emerald-500 text-white", color: "#10b981", metric: `${ev.toFixed(0)} mph` }
  if (ev >= 88)         return { detail: "HARD",   tone: "bg-lime-500 text-white",    color: "#84cc16", metric: `${ev.toFixed(0)} mph` }
  if (ev >= 72)         return { detail: "SOLID",  tone: "bg-amber-500 text-white",   color: "#f59e0b", metric: `${ev.toFixed(0)} mph` }
  return                       { detail: "SOFT",   tone: "bg-sky-500 text-white",     color: "#38bdf8", metric: `${ev.toFixed(0)} mph` }
}

function swingStatus(pitch?: PitchEvent, nextPlay?: PlayEvent): SwingInfo | null {
  if (!pitch) return null
  if (pitch.outcome === "in play") {
    const contact = contactGrade(nextPlay?.hit?.ev)
    return { label: "MEET", ...contact }
  }
  if (pitch.outcome === "foul") {
    return { label: "SWING", detail: "FOUL", tone: "bg-amber-500 text-white", color: "#f59e0b" }
  }
  if (pitch.outcome === "swinging strike") {
    return { label: "SWING", detail: "MISS", tone: "bg-red-500 text-white", color: "#ef4444" }
  }
  return null
}

type PlayOutMeta = PlayEvent & {
  outsBefore?: number
  outsAfter?: number
  outRunners?: string[]
}

type PitchingSubEvent = SubstitutionEvent & {
  team: string
}

type PitcherMiniLine = {
  pitches: number
  strikeouts: number
  runs: number
}

function playOutCount(ev: PlayEvent): number {
  const runnerOuts = ev.runnerAdvances.filter(a => a.result === "out").length
  if (runnerOuts > 0) return runnerOuts

  const meta = ev as PlayOutMeta
  if (typeof meta.outsBefore === "number" && typeof meta.outsAfter === "number") {
    return Math.max(0, meta.outsAfter - meta.outsBefore)
  }

  const result = ev.result.toLowerCase()
  if (result.includes("triple play")) return 3
  if (result.includes("double play")) return 2
  if (result.includes("out")) return 1
  return 0
}

function playOutAnnouncement(ev: PlayEvent): { label: string; sub: string; color: string } | null {
  const result = ev.result.toLowerCase()
  if (result.includes("strikes out") || result.includes("strikeout") || result.includes("strike out")) return null

  const outs = playOutCount(ev)
  if (outs <= 0) return null

  const meta = ev as PlayOutMeta
  const outNames = meta.outRunners?.length
    ? meta.outRunners
    : ev.runnerAdvances.filter(a => a.result === "out").map(a => a.runner)
  const sub = outNames.length ? outNames.join(", ") : `${ev.batter} - ${ev.result}`

  if (outs >= 3) return { label: "TRIPLE PLAY", sub, color: "#ef4444" }
  if (outs === 2) return { label: "DOUBLE PLAY", sub, color: "#f97316" }
  return { label: "OUT", sub, color: "#94a3b8" }
}

function pitcherMiniLine(events: GameEvent[], upTo: number, pitcherName: string): PitcherMiniLine {
  let pitches = 0
  let strikeouts = 0
  let runs = 0
  for (let i = 0; i < upTo; i++) {
    const ev = events[i]
    if (ev.type === "pitch" && ev.pitcher === pitcherName) pitches++
    if (ev.type === "play" && ev.pitcher === pitcherName) {
      if (ev.result.toLowerCase().includes("strikes out")) strikeouts++
      runs += runsScoredCount(ev.runsScored)
    }
  }
  return { pitches, strikeouts, runs }
}

function pitcherThrowHand(events: GameEvent[], pitcherName: string): "L" | "R" | null {
  const pitch = events.find((e): e is PitchEvent => e.type === "pitch" && e.pitcher === pitcherName)
  return pitch?.pitchHand ?? null
}

function defenseNames(game: GameData, ev: PitchEvent | PlayEvent | null): Partial<Record<string, string>> {
  if (!ev) return {}
  const lineup = ev.isTop ? game.homeLineup : game.awayLineup
  return {
    P: ev.pitcher,
    C: lineup[0],
    "1B": lineup[1],
    "2B": lineup[2],
    SS: lineup[3],
    "3B": lineup[4],
    LF: lineup[5],
    CF: lineup[6],
    RF: lineup[7],
  }
}

// SPEED: pitch=900ms, play=1800ms, inning=700ms
const GAME_SPEED = 1

// Every JBL lineup is built with the same 8 fielders plus a DH batting 9th
// (pitchers never bat) — see southDivisionTeam() in the engine's Teams.cpp,
// which every team is constructed from.
const LINEUP_POSITIONS = ["CF", "LF", "1B", "RF", "3B", "SS", "2B", "C", "DH"]

function announceLogEntry(ev: StolenBaseEvent | PickoffEvent | SubstitutionEvent): Extract<LogEntry, { kind: "announce" }> {
  if (ev.type === "stolen_base") {
    return ev.success
      ? { kind: "announce", text: `${ev.runner} steals ${ev.base}`, emoji: "💨" }
      : { kind: "announce", text: `${ev.runner} caught stealing`, emoji: "🚫" }
  }
  if (ev.type === "pickoff") {
    return ev.out
      ? { kind: "announce", text: `Pickoff — ${ev.runner} out at ${ev.base}`, emoji: "🎯" }
      : { kind: "announce", text: `Pickoff attempt — ${ev.runner} safe`, emoji: "↩️" }
  }
  const label = ev.subType === "pitching" ? "Pitching change"
    : ev.subType === "batting" ? "Pinch hitter"
    : "Substitution"
  return { kind: "announce", text: `${label}: ${ev.playerIn} for ${ev.playerOut}`, emoji: "🔄" }
}

function buildLog(events: GameEvent[], upTo: number): LogEntry[] {
  const log: LogEntry[] = []
  for (let i = 0; i < upTo; i++) {
    const ev = events[i]
    if (ev.type === "half_inning") {
      log.push({ kind: "inning", label: halfLabel(ev.inning, ev.isTop) })
    } else if (ev.type === "pitch" && ev.outcome !== "in play") {
      log.push({ kind: "pitch", text: `${ev.pitchType[0].toUpperCase() + ev.pitchType.slice(1)} — ${pitchOutcomeLabel(ev.outcome)}`, isInPlay: false })
    } else if (ev.type === "play") {
      log.push({ kind: "play", text: `${ev.batter} — ${ev.result}${ev.runsScored > 0 ? ` (${ev.runsScored}R)` : ""}`, emoji: resultEmoji(ev.result), runs: ev.runsScored })
    } else if (ev.type === "stolen_base" || ev.type === "pickoff" || ev.type === "substitution") {
      const { text, emoji } = announceLogEntry(ev)
      log.push({ kind: "announce", text, emoji })
    }
  }
  return log
}

function Decisions({ game }: { game: GameData }) {
  const rows = [
    ["W", game.winPitcher, "bg-emerald-50 text-emerald-700"],
    ["L", game.lossPitcher, "bg-red-50 text-red-600"],
    ["SV", game.savePitcher, "bg-blue-50 text-blue-700"],
  ] as const
  const available = rows.filter(([, name]) => name)
  if (available.length === 0) return null

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Decisions</p>
      <div className={`mt-3 grid gap-3 ${
        available.length === 1
          ? "sm:grid-cols-1"
          : available.length === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-3"
      }`}>
        {available.map(([label, name, badgeClass]) => (
          <div key={label} className="flex items-center gap-2">
            <span className={`inline-block shrink-0 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${badgeClass}`}>
              {label}
            </span>
            <p className="truncate text-sm font-bold text-gray-900">{name}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function GameDetails({ game, isVisible }: { game: GameData; isVisible: boolean }) {
  const events = game.events
  const gameKey = gameStorageKey(game.gameId, game.away, game.home, game.date)
  const storageKey = `jbl-game-idx-${gameKey}`

  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? Math.min(parseInt(saved, 10), events.length) : 0
  })
  const [log, setLog] = useState<LogEntry[]>(() => buildLog(events, idx))
  const [speed, setSpeed] = useState(GAME_SPEED)
  const [paused, setPaused] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [announcement, setAnnouncement] = useState<{ label: string; sub: string; color: string } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const liveViewRef = useRef<HTMLDivElement>(null)

  // Announcements are otherwise only cleared by whatever event happens to
  // come next in the stream, which left some (pickoffs, substitutions late
  // in a game) stuck on screen indefinitely. A flat timeout guarantees every
  // message goes away on its own.
  useEffect(() => {
    if (!announcement) return
    const timer = setTimeout(() => setAnnouncement(null), 1800)
    return () => clearTimeout(timer)
  }, [announcement])

  const { lastPitch, lastPlay, lastHalf, halfIsMostRecent } = useMemo(() => {
    let lastPitch: PitchEvent | undefined
    let lastPlay: PlayEvent | undefined
    let lastHalf: HalfInningEvent | undefined
    // Whichever of pitch/play/half_inning we hit *first* scanning backward
    // is the most recent of the three — tracked separately from the
    // individual lookups above so we can tell "the last thing that
    // happened was the half-inning starting" apart from "there's an older
    // half_inning marker further back than the last pitch/play".
    let mostRecentType: "pitch" | "play" | "half_inning" | null = null
    for (let i = idx - 1; i >= 0; i--) {
      const e = events[i]
      if (!lastPitch && e.type === "pitch") lastPitch = e as PitchEvent
      if (!lastPlay  && e.type === "play")  lastPlay  = e as PlayEvent
      if (!lastHalf  && e.type === "half_inning") lastHalf = e as HalfInningEvent
      if (!mostRecentType && (e.type === "pitch" || e.type === "play" || e.type === "half_inning")) {
        mostRecentType = e.type
      }
      if (lastPitch && lastPlay && lastHalf) break
    }
    return { lastPitch, lastPlay, lastHalf, halfIsMostRecent: mostRecentType === "half_inning" }
  }, [events, idx])

  const isDone        = idx >= events.length

  // Someone actually watched this specific game through to the end — lets
  // the schedule list reveal its score early instead of waiting for the
  // shared nightly reveal window.
  useEffect(() => {
    if (isDone) markGameWatched(gameKey)
  }, [isDone, gameKey])

  const currentEvent = idx > 0 ? events[idx - 1] : null
  const previousEvent = idx > 1 ? events[idx - 2] : null
  const eventState = currentEvent?.type === "stolen_base" || currentEvent?.type === "pickoff"
    ? currentEvent
    : null
  const currentScore  = eventState?.score ?? lastPlay?.score ?? lastPitch?.score ?? lastHalf?.score ?? { away: 0, home: 0 }
  // A half-inning always starts bases-empty with 0 outs — if the half_inning
  // marker is the most recent event (i.e. we just landed at the top of an
  // inning, whether by normal advance or by jumping to it in the
  // scoreboard), bases/outs must reset here rather than falling through to
  // whatever a pitch/play from the *previous* half last recorded.
  const currentBases  = eventState
    ? eventState.bases
    : halfIsMostRecent
      ? { first: null, second: null, third: null }
      : lastPitch?.bases ?? lastPlay?.bases ?? { first: null, second: null, third: null }
  const currentOuts   = eventState
    ? eventState.outs
    : halfIsMostRecent
      ? 0
      : lastPitch?.outs ?? lastPlay?.outs ?? 0
  const currentInning = lastHalf?.inning ?? 1
  const currentTop    = lastHalf?.isTop  ?? true

  // The scoreboard must not spoil a game that isn't revealed yet — the
  // full lineScore/finalScore/events are the *final* result no matter how
  // far the replay has actually gotten, so once revealed is false they'd
  // show future innings and the end score before the replay reaches them.
  const revealed = isDone || isGameRevealed(game.date, gameKey)
  const halfOrder = (inning: number, isTop: boolean) => inning * 2 + (isTop ? 0 : 1)
  const scoreboardLineScore = useMemo(() => {
    if (revealed) return game.lineScore
    const currentOrder = halfOrder(currentInning, currentTop)
    const mask = (arr: (number | null)[], isTop: boolean) =>
      arr.map((v, i) => (halfOrder(i + 1, isTop) < currentOrder ? v : null))
    return { away: mask(game.lineScore.away, true), home: mask(game.lineScore.home, false) }
  }, [revealed, game.lineScore, currentInning, currentTop])
  const scoreboardFinalScore = revealed ? game.finalScore : currentScore
  const scoreboardEvents = revealed ? events : events.slice(0, idx)

  const pitcher       = lastPitch?.pitcher ?? lastPlay?.pitcher ?? ""
  const batter        = lastPitch?.batter  ?? lastPlay?.batter  ?? ""
  const balls         = lastPitch?.balls   ?? 0
  const strikes       = lastPitch?.strikes ?? 0
  const pickoffEvent = currentEvent?.type === "pickoff" ? currentEvent : null
  const scoringSide = currentEvent?.type === "play" && currentEvent.runsScored > 0
    ? currentEvent.isTop ? "away" : "home"
    : null

  // ── Strike zone: 現在の打席の全投球ドット ─────────────────────────────
  const { pitchHistory, lastP } = useMemo(() => {
    const searchEnd = currentEvent?.type === "play" ? idx - 1 : idx
    let lastPlayIdx = -1
    for (let i = searchEnd - 1; i >= 0; i--) {
      if (events[i].type === "play") { lastPlayIdx = i; break }
    }
    const atBatPitches = events.slice(lastPlayIdx + 1, idx).filter(
      (e): e is PitchEvent => e.type === "pitch" && (e as PitchEvent).px !== undefined
    )
    const pitchHistory: PitchDot[] = atBatPitches.slice(0, -1).map(p => ({
      px: p.px!, pz: p.pz!, pitchType: p.pitchType, outcome: p.outcome, mx: p.mx, mz: p.mz,
    }))
    return { pitchHistory, lastP: atBatPitches.at(-1) }
  }, [events, idx, currentEvent])
  // useMemo on lastP object identity: same pitch event → same incoming reference → no re-animation
  const pitchIncoming = useMemo<PitchDot | undefined>(() => {
    if (!lastP) return undefined
    return { px: lastP.px!, pz: lastP.pz!, pitchType: lastP.pitchType, outcome: lastP.outcome, mx: lastP.mx, mz: lastP.mz, velo: lastP.velo }
  }, [lastP])
  const batHand: "L" | "R" = lastP?.batHand ?? "R"
  const pitchHand: "L" | "R" = lastP?.pitchHand ?? "R"

  // ── in-play pitchを表示した後、次のplayイベントだけ打球画面へ遷移 ─────
  const nextEvent = idx < events.length ? events[idx] : null
  const upcomingPlay = nextEvent?.type === "play" ? nextEvent : undefined
  const displayedPlay = currentEvent?.type === "play" ? currentEvent : upcomingPlay
  // memoize swing: swingStatus returns a new object every call, so without memo
  // any re-render (speed change, tab switch, etc.) would make `swing` a new reference
  // and trigger StrikeZoneView's incoming animation effect, restarting the pitch animation
  const swing = useMemo(() => swingStatus(lastP, displayedPlay), [lastP, displayedPlay])
  const showField =
    currentEvent?.type === "play" &&
    previousEvent?.type === "pitch" &&
    previousEvent.outcome === "in play" &&
    currentEvent.hit !== undefined
  const fieldHit = showField && currentEvent.type === "play" ? currentEvent.hit! : null
  const defenders = defenseNames(game, currentEvent?.type === "play" ? currentEvent : lastP ?? null)

  // ── 投手の球数・三振数、バッターの打席履歴 ───────────────────────────────
  const batterResults = useMemo(() => {
    const batterResults: string[] = []
    for (let i = 0; i < idx; i++) {
      const e = events[i]
      if (e.type === "play") {
        const p = e as PlayEvent
        if (batter && p.batter === batter) batterResults.push(p.result)
      }
    }
    return batterResults
  }, [events, idx, batter])
  const pitchMix = useMemo(() => {
    const pitches = events
      .slice(0, idx)
      .filter((e): e is PitchEvent => e.type === "pitch" && (!pitcher || (e as PitchEvent).pitcher === pitcher))
    const counts = new Map<string, number>()
    for (const pitch of pitches) {
      counts.set(pitch.pitchType, (counts.get(pitch.pitchType) ?? 0) + 1)
    }
    const total = pitches.length
    const mix = Array.from(counts.entries())
      .map(([type, count]) => ({ type, count, pct: total ? Math.round((count / total) * 100) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 4)
    const recent = pitches.slice(-10).map(pitch => pitch.pitchType)
    const outCounts = new Map<string, number>()
    let previousPitch: PitchEvent | null = null
    for (const ev of events.slice(0, idx)) {
      if (ev.type === "pitch") {
        previousPitch = ev.pitcher === pitcher ? ev : null
        continue
      }
      if (ev.type !== "play" || ev.pitcher !== pitcher || !previousPitch) continue
      const outs = playOutCount(ev)
      if (outs > 0) {
        outCounts.set(previousPitch.pitchType, (outCounts.get(previousPitch.pitchType) ?? 0) + outs)
      }
      previousPitch = null
    }
    const outPitch = Array.from(outCounts.entries())
      .map(([type, outs]) => ({ type, outs }))
      .sort((a, b) => b.outs - a.outs)[0] ?? null
    return { total, mix, recent, outPitch }
  }, [events, idx, pitcher])
  const defendingTeamName = currentTop ? game.home : game.away
  const pitchingStaff = useMemo(() => {
    const staff: Array<{
      name: string
      roleType: "Starter" | "Reliever"
      note: string
      throwHand: "L" | "R" | null
      line: PitcherMiniLine
      current: boolean
    }> = []
    const seen = new Set<string>()

    const firstPitch = events
      .slice(0, Math.max(idx, 1))
      .find((e): e is PitchEvent => e.type === "pitch" && e.isTop === currentTop)
    if (firstPitch) {
      seen.add(firstPitch.pitcher)
      staff.push({
        name: firstPitch.pitcher,
        roleType: "Starter",
        note: "Starter",
        throwHand: pitcherThrowHand(events, firstPitch.pitcher),
        line: pitcherMiniLine(events, idx, firstPitch.pitcher),
        current: firstPitch.pitcher === pitcher,
      })
    }

    for (const ev of events.slice(0, idx)) {
      if (
        ev.type === "substitution" &&
        ev.subType === "pitching" &&
        (ev as PitchingSubEvent).team === defendingTeamName &&
        !seen.has(ev.playerIn)
      ) {
        seen.add(ev.playerIn)
        staff.push({
          name: ev.playerIn,
          roleType: "Reliever",
          note: `${halfLabel(ev.inning, ev.isTop)} for ${ev.playerOut}`,
          throwHand: pitcherThrowHand(events, ev.playerIn),
          line: pitcherMiniLine(events, idx, ev.playerIn),
          current: ev.playerIn === pitcher,
        })
      }
    }

    if (pitcher && !seen.has(pitcher)) {
      staff.push({
        name: pitcher,
        roleType: staff.length === 0 ? "Starter" : "Reliever",
        note: "Current pitcher",
        throwHand: pitcherThrowHand(events, pitcher),
        line: pitcherMiniLine(events, idx, pitcher),
        current: true,
      })
    }

    return staff
  }, [defendingTeamName, events, idx, pitcher])
  const momentum = useMemo(() => {
    const battingScore = currentTop ? currentScore.away : currentScore.home
    const fieldingScore = currentTop ? currentScore.home : currentScore.away
    const deficit = fieldingScore - battingScore
    const baseScore =
      (currentBases.first ? 12 : 0) +
      (currentBases.second ? 24 : 0) +
      (currentBases.third ? 34 : 0)
    const countScore = balls * 6 - strikes * 7
    const outsScore = currentOuts === 0 ? 12 : currentOuts === 1 ? 0 : -18
    const scoreScore = deficit > 0 ? Math.min(18, deficit * 6) : Math.max(-14, deficit * 4)
    const value = Math.max(6, Math.min(96, 42 + baseScore + countScore + outsScore + scoreScore))
    const label =
      value >= 78 ? "Threat" :
      value >= 58 ? "Pressure" :
      value >= 38 ? "Building" :
      "Quiet"
    return { value, label, chance: chanceLabel(currentBases) }
  }, [balls, strikes, currentBases, currentOuts, currentScore.away, currentScore.home, currentTop])

  // 進行位置を localStorage に保存
  useEffect(() => {
    localStorage.setItem(storageKey, String(idx))
  }, [idx, storageKey])

  // auto-advance — paused when game tab is not visible
  useEffect(() => {
    if (isDone || !isVisible || paused) return
    const ev = events[idx]
    const delay = currentEvent?.type === "play"
      ? eventDelay(currentEvent, speed)
      : eventDelay(ev, speed)
    const timer = setTimeout(() => {
      if (ev.type === "half_inning") {
        setAnnouncement(idx > 0 ? { label: "CHANGE", sub: halfLabel(ev.inning, ev.isTop), color: "#94a3b8" } : null)
        setLog(l => [...l, { kind: "inning", label: halfLabel(ev.inning, ev.isTop) }])
      } else if (ev.type === "pitch") {
        // Clear on every pitch (not just non-in-play ones) so a stale
        // banner never sits on screen through the pitch overlay that
        // StrikeZoneView shows at the same spot for the next pitch.
        setAnnouncement(null)
        if (ev.outcome !== "in play") {
          setLog(l => [...l, {
            kind: "pitch",
            text: `${ev.pitchType[0].toUpperCase() + ev.pitchType.slice(1)} — ${pitchOutcomeLabel(ev.outcome)}`,
            isInPlay: false,
          }])
        }
      } else if (ev.type === "play") {
        // Hit plays already get their own result banner from FieldView;
        // only surface an announcement here for the outs it doesn't cover.
        setAnnouncement(ev.hit ? null : playOutAnnouncement(ev))
        setLog(l => [...l, {
          kind: "play",
          text: `${ev.batter} — ${ev.result}${ev.runsScored > 0 ? ` (${ev.runsScored}R)` : ""}`,
          emoji: resultEmoji(ev.result),
          runs: ev.runsScored,
        }])
      } else if (ev.type === "stolen_base") {
        const a = ev.success
          ? { label: "STOLEN BASE", sub: `${ev.runner} → ${ev.base}`, color: "#22c55e" }
          : { label: "CAUGHT STEALING", sub: ev.runner, color: "#ef4444" }
        setAnnouncement(a)
        setLog(l => [...l, announceLogEntry(ev)])
      } else if (ev.type === "pickoff") {
        const a = ev.out
          ? { label: "PICKOFF OUT", sub: `${ev.runner} at ${ev.base}`, color: "#f97316" }
          : { label: "PICKOFF", sub: `${ev.runner} safe`, color: "#94a3b8" }
        setAnnouncement(a)
        setLog(l => [...l, announceLogEntry(ev)])
      } else if (ev.type === "substitution") {
        const label = ev.subType === "pitching" ? "PITCHING CHANGE"
          : ev.subType === "batting" ? "PINCH HITTER"
          : "SUBSTITUTION"
        setAnnouncement({ label, sub: `${ev.playerIn} for ${ev.playerOut}`, color: "#818cf8" })
        setLog(l => [...l, announceLogEntry(ev)])
      }
      setIdx(i => i + 1)
    }, delay)
    return () => clearTimeout(timer)
  }, [idx, events, isDone, speed, currentEvent, isVisible, paused])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === liveViewRef.current)
    }
    document.addEventListener("fullscreenchange", onFullscreenChange)
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange)
  }, [])

  const toggleFullscreen = async () => {
    if (!liveViewRef.current) return
    if (document.fullscreenElement === liveViewRef.current) {
      await document.exitFullscreen()
    } else {
      await liveViewRef.current.requestFullscreen()
    }
  }

  // Jump the replay straight to a half-inning clicked in the scoreboard —
  // pauses it there like scrubbing a video, rather than letting auto-advance
  // immediately carry on past the spot the user wanted to look at.
  const selectHalfInning = (inning: number, isTop: boolean) => {
    const target = events.findIndex(ev => ev.type === "half_inning" && ev.inning === inning && ev.isTop === isTop)
    if (target === -1) return
    // idx marks "everything before this has been processed" — landing
    // exactly on the half_inning event's own index would leave it
    // unprocessed, so currentTop/currentInning (derived by scanning
    // events[0..idx-1]) would still show the *previous* half-inning.
    const landingIdx = target + 1
    setPaused(true)
    setIdx(landingIdx)
    setLog(buildLog(events, landingIdx))
    setAnnouncement(null)
  }

  const awayShort = game.away.split(" ").slice(-1)[0].toUpperCase()
  const homeShort = game.home.split(" ").slice(-1)[0].toUpperCase()
  const awayUniformColors = teamColors(game.away, "away")
  const homeUniformColors = teamColors(game.home, "home")
  // Brand identity color for text labels (score digits, abbreviations,
  // lineup highlight) — not a uniform simulation, so always the default
  // color set. The away set includes near-white colors for some teams
  // (e.g. Bronx Wolves), which would be invisible as text on a white card.
  const awayColor = teamColors(game.away).primary
  const homeColor = teamColors(game.home).primary
  const scoreFlashColor = scoringSide === "away" ? awayColor : scoringSide === "home" ? homeColor : "transparent"
  const scoreFlashStyle = {
    "--jbl-score-flash": `color-mix(in srgb, ${scoreFlashColor} 24%, transparent)`,
  } as CSSProperties & Record<"--jbl-score-flash", string>
  // The defense is whichever team isn't currently batting — their colors
  // dress the pitcher and fielders in the animation.
  const defenseColors = currentTop ? homeUniformColors : awayUniformColors
  // The offense dresses a runner glimpsed taking a lead off second, straight
  // back behind the pitcher.
  const offenseColors = currentTop ? awayUniformColors : homeUniformColors

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div
        className={`relative rounded-2xl bg-white shadow-sm overflow-hidden ${scoringSide ? "jbl-score-flash" : ""}`}
        style={scoreFlashStyle}
      >
        <div className="relative z-10 px-4 py-3 border-b border-gray-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            JBL Game · {game.date}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            {isDone
              ? <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Final</span>
              : <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
                  <span className={`inline-block h-1.5 w-1.5 rounded-full bg-red-500 ${paused ? "" : "animate-pulse"}`} />
                  {paused ? "Paused" : "Live"}
                </span>
            }
            <button
              type="button"
              onClick={() => setPaused((value) => !value)}
              disabled={isDone}
              title={paused ? "Resume replay" : "Pause replay"}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ReplayIcon paused={paused} />
              {paused ? "Play" : "Pause"}
            </button>
            <button
              type="button"
              onClick={() => {
                localStorage.removeItem(storageKey)
                setIdx(0)
                setLog([])
                setAnnouncement(null)
                setPaused(false)
              }}
              title="Restart replay"
              className="inline-flex h-7 items-center justify-center rounded-lg border border-gray-200 bg-white px-2 text-gray-500 transition hover:bg-gray-50 hover:text-gray-700"
            >
              <ResetIcon />
            </button>
            <button
              type="button"
              onClick={toggleFullscreen}
              disabled={isDone}
              title={isFullscreen ? "Exit fullscreen" : "Fullscreen replay"}
              className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 text-xs font-bold text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FullscreenIcon active={isFullscreen} />
              {isFullscreen ? "Exit" : "Full"}
            </button>
            <div className="flex rounded-lg bg-gray-100 p-0.5">
              {[0.5, 1, 2, 5].map(s => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`h-6 rounded-md px-2 text-[10px] font-black transition ${speed === s ? "bg-green-700 text-white shadow-sm" : "text-gray-500 hover:text-gray-800"}`}
              >
                ×{s}
              </button>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between gap-4 px-6 py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {teamBadge(game.away, "3xl")}
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-gray-800">{game.away}</p>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: awayColor }}>{awayShort}</p>
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-center gap-1 text-center">
            <div className="flex items-center gap-2.5 font-mono text-4xl font-black text-gray-800">
              <AnimatedScore value={currentScore.away} color={awayColor} active={scoringSide === "away"} label="away-main" />
              <span className="text-lg font-light text-gray-300">–</span>
              <AnimatedScore value={currentScore.home} color={homeColor} active={scoringSide === "home"} label="home-main" />
            </div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isDone ? "—" : halfLabel(currentInning, currentTop)}
            </span>
            {!isDone && (
              <span className="text-xs text-gray-400">{currentOuts} OUT{currentOuts !== 1 ? "S" : ""}</span>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-row-reverse items-center gap-3">
            {teamBadge(game.home, "3xl")}
            <div className="min-w-0 text-right">
              <p className="truncate text-base font-bold text-gray-800">{game.home}</p>
              <p className="text-xs font-bold uppercase tracking-wider" style={{ color: homeColor }}>{homeShort}</p>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 pb-4 pt-3">
          <JBLScoreboard
            away={game.away}
            home={game.home}
            awayColor={awayColor}
            homeColor={homeColor}
            lineScore={scoreboardLineScore}
            finalScore={scoreboardFinalScore}
            events={scoreboardEvents}
            isGameOver={isDone}
            selectedInning={currentInning}
            selectedIsTop={currentTop}
            onSelectHalfInning={selectHalfInning}
          />
        </div>
      </div>

      {isDone && <Decisions game={game} />}

      {/* Live at-bat status + visualization */}
      {!isDone && (
        <div
          ref={liveViewRef}
          className={`bg-white shadow-sm overflow-hidden -mx-3 lg:-mx-4 ${isFullscreen ? "mx-0 flex h-screen w-screen flex-col bg-slate-950" : ""}`}
        >
          {/* 3D view — ページ端まで全幅 */}
          <div className={`relative w-full ${isFullscreen ? "flex-1" : "aspect-video"}`}>
            {fieldHit ? (
              <FieldView
                key={`field-${idx}`}
                traj={fieldHit.traj}
                exitVelo={fieldHit.ev}
                launchAngle={fieldHit.la}
                sprayAngle={fieldHit.sa}
                result={currentEvent?.type === "play" ? currentEvent.result : undefined}
                swing={swing}
                defenders={defenders}
                bases={previousEvent?.type === "pitch" ? previousEvent.bases : undefined}
                runnerAdvances={currentEvent?.type === "play" ? currentEvent.runnerAdvances : undefined}
                fielderColor={defenseColors.primary}
                fielderSecondaryColor={defenseColors.secondary}
                fielderAccentColor={defenseColors.accent}
                runnerColor={offenseColors.primary}
                runnerAccentColor={offenseColors.accent}
              />
            ) : (
              <StrikeZoneView
                pitcherColor={defenseColors.primary}
                pitcherSecondaryColor={defenseColors.secondary}
                pitcherAccentColor={defenseColors.accent}
                batterColor={offenseColors.primary}
                batterAccentColor={offenseColors.accent}
                history={pitchHistory}
                incoming={pitchIncoming}
                batHand={batHand}
                batterName={batter}
                pitchHand={pitchHand}
                playResult={displayedPlay?.result}
                swing={swing}
                runnerOnSecond={!!currentBases.second}
                runnerColor={offenseColors.primary}
                pickoff={pickoffEvent}
                hideOverlay={!!announcement}
              />
            )}

            {/* Game announcements (substitutions, steals, pickoffs, inning
                change) — kept as its own overlay so it shows over either
                visualization, but styled and positioned identically to the
                pitch-outcome overlay (STRIKE/BALL/FOUL) inside
                StrikeZoneView so every in-game message reads as one system. */}
            {announcement && (
              <div
                className="absolute top-[19%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none select-none"
                style={{ animation: "fadeInPop 0.18s ease-out forwards" }}
              >
                <span
                  className="font-black tracking-widest whitespace-nowrap"
                  style={{
                    fontSize: "2.8rem",
                    color: announcement.color,
                    textShadow: `0 0 22px ${announcement.color}88, 0 2px 8px rgba(0,0,0,0.95)`,
                    opacity: 0.95,
                  }}
                >
                  {announcement.label}
                </span>
                {announcement.sub && (
                  <span
                    className="font-black uppercase tracking-widest"
                    style={{
                      fontSize: "1.5rem",
                      color: "#e2e8f0",
                      textShadow: "0 2px 6px rgba(0,0,0,0.9)",
                    }}
                  >
                    {announcement.sub}
                  </span>
                )}
              </div>
            )}

            {/* Batting order for the team currently up. JBL lineups are
                8 hitters — no DH, and pitchers never bat — so there's no
                9th slot to show. */}
            <div className="absolute top-4 left-4 hidden pointer-events-none select-none overflow-hidden rounded-2xl bg-black/75 text-white md:block" style={{ minWidth: 260 }}>
              <div className="bg-white/10 px-5 py-2.5 text-center text-sm font-black tracking-[0.18em] text-gray-300 uppercase">
                {currentTop ? awayShort : homeShort} Order
              </div>
              <div className="px-3 py-3 space-y-1">
                {(currentTop ? game.awayLineup : game.homeLineup).map((name, i) => {
                  const isCurrent = name === batter
                  return (
                    <div
                      key={name}
                      className={`flex items-center gap-3 rounded-lg px-3 py-1.5 ${isCurrent ? "bg-white/15" : ""}`}
                    >
                      <span className="w-5 shrink-0 text-right font-mono text-sm font-bold text-gray-500">
                        {i + 1}
                      </span>
                      <span
                        className={`flex-1 truncate text-base ${isCurrent ? "font-bold" : "text-gray-300"}`}
                        style={isCurrent ? { color: currentTop ? awayColor : homeColor } : undefined}
                      >
                        {name}
                      </span>
                      <span className="w-8 shrink-0 text-right font-mono text-xs font-bold text-gray-500">
                        {LINEUP_POSITIONS[i] ?? ""}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="absolute bottom-4 left-4 hidden w-[260px] pointer-events-none select-none overflow-hidden rounded-2xl bg-black/75 text-white md:block">
              <div className="flex items-center justify-between bg-white/10 px-4 py-2">
                <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">Momentum</span>
                <span className="text-xs font-black" style={{ color: offenseColors.primary }}>{momentum.label}</span>
              </div>
              <div className="px-4 py-3">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="truncate text-sm font-bold text-white">{momentum.chance}</span>
                  <span className="font-mono text-sm font-black tabular-nums" style={{ color: offenseColors.accent }}>
                    {momentum.value}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${momentum.value}%`,
                      background: `linear-gradient(90deg, ${offenseColors.secondary}, ${offenseColors.primary}, ${offenseColors.accent})`,
                    }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-gray-500">
                  <span>{currentOuts} OUT{currentOuts === 1 ? "" : "S"}</span>
                  <span>{balls}-{strikes}</span>
                  <span>{currentTop ? awayShort : homeShort}</span>
                </div>
              </div>
            </div>

            {/* Broadcast scoreboard HUD */}
            <div
              className={`absolute left-3 right-3 top-3 pointer-events-none select-none overflow-hidden rounded-2xl bg-black/75 text-white md:hidden ${scoringSide ? "jbl-score-flash" : ""}`}
              style={scoreFlashStyle}
            >
              {/* Inning */}
              <div className="bg-white/10 px-5 py-2 text-center text-sm font-black tracking-[0.22em] text-gray-300 uppercase">
                {halfLabel(currentInning, currentTop)}
              </div>
              {/* Score */}
              <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-5">
                <span className="min-w-0 truncate text-sm font-black tracking-wide sm:text-base" style={{ color: awayColor, textDecoration: currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{awayShort}</span>
                <span className="whitespace-nowrap font-mono text-4xl font-black leading-none text-white tabular-nums">
                  <AnimatedScore value={currentScore.away} color={awayColor} active={scoringSide === "away"} label="away-hud" />
                  <span className="text-gray-500 mx-2 text-3xl">-</span>
                  <AnimatedScore value={currentScore.home} color={homeColor} active={scoringSide === "home"} label="home-hud" />
                </span>
                <span className="min-w-0 truncate text-right text-sm font-black tracking-wide sm:text-base" style={{ color: homeColor, textDecoration: !currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{homeShort}</span>
              </div>
              {/* Diamond + Count */}
              <div className="relative z-10 flex items-center gap-4 px-3 py-3 sm:gap-6 sm:px-5 sm:py-4">
                {/* Dark-mode diamond */}
                <div className="grid grid-cols-3 grid-rows-2 gap-1.5 w-20 shrink-0">
                  <div /><div className="flex justify-center">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.second ? "bg-amber-400" : "bg-transparent"}`} />
                  </div><div />
                  <div className="flex justify-end">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.third ? "bg-amber-400" : "bg-transparent"}`} />
                  </div><div /><div className="flex justify-start">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.first ? "bg-amber-400" : "bg-transparent"}`} />
                  </div>
                </div>
                {/* BSO */}
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">B <CountDots n={balls}       max={3} activeColor="bg-green-400"  dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">S <CountDots n={strikes}     max={2} activeColor="bg-yellow-400" dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">O <CountDots n={currentOuts} max={2} activeColor="bg-red-500"    dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                </div>
              </div>
              {/* Pitcher / Batter info */}
              {(pitcher || batter) && (
                <div className="relative z-10 flex flex-col gap-2.5 border-t border-white/10 px-3 py-3 sm:px-5">
                  {pitcher && (
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">P</span>
                      <span className="text-sm font-bold text-white truncate">{pitcher}</span>
                    </div>
                  )}
                  {batter && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">B</span>
                        <span className="text-sm font-bold text-white truncate">{batter}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {batterResults.length === 0
                          ? <span className="text-xs text-gray-600">—</span>
                          : batterResults.map((r, i) => <BatterResultChip key={i} result={r} />)
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="absolute right-4 top-4 hidden w-[300px] pointer-events-none select-none flex-col gap-3 text-white md:flex">
              <div
                className={`overflow-hidden rounded-2xl bg-black/75 ${scoringSide ? "jbl-score-flash" : ""}`}
                style={scoreFlashStyle}
              >
                <div className="bg-white/10 px-5 py-2 text-center text-sm font-black tracking-[0.22em] text-gray-300 uppercase">
                  {halfLabel(currentInning, currentTop)}
                </div>
                <div className="relative z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-2 border-b border-white/10 px-3 py-3 sm:gap-3 sm:px-5">
                  <span className="min-w-0 truncate text-sm font-black tracking-wide sm:text-base" style={{ color: awayColor, textDecoration: currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{awayShort}</span>
                  <span className="whitespace-nowrap font-mono text-4xl font-black leading-none text-white tabular-nums">
                    <AnimatedScore value={currentScore.away} color={awayColor} active={scoringSide === "away"} label="away-hud-md" />
                    <span className="text-gray-500 mx-2 text-3xl">-</span>
                    <AnimatedScore value={currentScore.home} color={homeColor} active={scoringSide === "home"} label="home-hud-md" />
                  </span>
                  <span className="min-w-0 truncate text-right text-sm font-black tracking-wide sm:text-base" style={{ color: homeColor, textDecoration: !currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{homeShort}</span>
                </div>
                <div className="relative z-10 flex items-center gap-4 px-3 py-3 sm:gap-6 sm:px-5 sm:py-4">
                  <div className="grid grid-cols-3 grid-rows-2 gap-1.5 w-20 shrink-0">
                    <div /><div className="flex justify-center">
                      <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.second ? "bg-amber-400" : "bg-transparent"}`} />
                    </div><div />
                    <div className="flex justify-end">
                      <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.third ? "bg-amber-400" : "bg-transparent"}`} />
                    </div><div /><div className="flex justify-start">
                      <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.first ? "bg-amber-400" : "bg-transparent"}`} />
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <span className="flex items-center gap-2 text-base font-bold text-gray-400">B <CountDots n={balls}       max={3} activeColor="bg-green-400"  dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                    <span className="flex items-center gap-2 text-base font-bold text-gray-400">S <CountDots n={strikes}     max={2} activeColor="bg-yellow-400" dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                    <span className="flex items-center gap-2 text-base font-bold text-gray-400">O <CountDots n={currentOuts} max={2} activeColor="bg-red-500"    dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                  </div>
                </div>
                {(pitcher || batter) && (
                  <div className="relative z-10 flex flex-col gap-2.5 border-t border-white/10 px-3 py-3 sm:px-5">
                    {pitcher && (
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">P</span>
                        <span className="text-sm font-bold text-white truncate">{pitcher}</span>
                      </div>
                    )}
                    {batter && (
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">B</span>
                          <span className="text-sm font-bold text-white truncate">{batter}</span>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {batterResults.length === 0
                            ? <span className="text-xs text-gray-600">-</span>
                            : batterResults.map((r, i) => <BatterResultChip key={i} result={r} />)
                          }
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="overflow-hidden rounded-2xl bg-black/75">
                <div className="flex items-center justify-between bg-white/10 px-4 py-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">Pitch Mix</span>
                  <span className="text-xs font-black text-gray-500">{pitchMix.total} P</span>
                </div>
                <div className="space-y-2 px-4 py-3">
                  {pitchMix.mix.length === 0 ? (
                    <div className="py-2 text-center text-xs font-bold text-gray-600">No pitches yet</div>
                  ) : (
                    pitchMix.mix.map(item => (
                      <div key={item.type} className="grid grid-cols-[54px_1fr_34px] items-center gap-2">
                        <span className="text-xs font-black uppercase tracking-wide" style={{ color: pitchTone(item.type) }}>
                          {pitchTypeShort(item.type)}
                        </span>
                        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${item.pct}%`, backgroundColor: pitchTone(item.type) }}
                          />
                        </div>
                        <span className="text-right font-mono text-xs font-bold text-gray-400 tabular-nums">{item.pct}%</span>
                      </div>
                    ))
                  )}
                  <div className="border-t border-white/10 pt-2">
                    <div className="mb-1 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">Out Pitch</div>
                    {pitchMix.outPitch ? (
                      <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-flex h-6 min-w-9 items-center justify-center rounded border px-2 text-xs font-black"
                            style={{
                              borderColor: `${pitchTone(pitchMix.outPitch.type)}99`,
                              color: pitchTone(pitchMix.outPitch.type),
                              backgroundColor: `${pitchTone(pitchMix.outPitch.type)}22`,
                            }}
                          >
                            {pitchTypeShort(pitchMix.outPitch.type)}
                          </span>
                          <span className="text-xs font-bold text-gray-300">
                            {pitchTypeLabel(pitchMix.outPitch.type)}
                          </span>
                        </div>
                        <span className="font-mono text-xs font-black text-white tabular-nums">
                          {pitchMix.outPitch.outs} OUT{pitchMix.outPitch.outs === 1 ? "" : "S"}
                        </span>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-white/5 px-3 py-2 text-xs font-bold text-gray-600">
                        No outs yet
                      </div>
                    )}
                  </div>
                  <div className="border-t border-white/10 pt-2">
                    <div className="mb-1 flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-gray-500">
                      <span>Last 10</span>
                      <span className="tracking-wider">Latest - Old</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {pitchMix.recent.length === 0 ? (
                        <span className="text-xs font-bold text-gray-600">—</span>
                      ) : (
                        [...pitchMix.recent].reverse().map((type, i) => {
                          const isLatest = i === 0
                          return (
                            <span
                              key={`${type}-${i}`}
                              className={`inline-flex h-5 min-w-8 items-center justify-center rounded border px-1.5 text-[10px] font-black ${isLatest ? "ring-2 ring-white/70" : ""}`}
                              title={isLatest ? "Latest pitch" : undefined}
                              style={{ borderColor: `${pitchTone(type)}99`, color: pitchTone(type), backgroundColor: `${pitchTone(type)}22` }}
                            >
                              {pitchTypeShort(type)}
                            </span>
                          )
                        })
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl bg-black/75">
                <div className="flex items-center justify-between bg-white/10 px-4 py-2">
                  <span className="text-xs font-black uppercase tracking-[0.18em] text-gray-300">Pitching Staff</span>
                  <span className="max-w-[96px] truncate text-xs font-black" style={{ color: defenseColors.primary }}>
                    {defendingTeamName.split(" ").slice(-1)[0]}
                  </span>
                </div>
                <div className="max-h-44 space-y-2 overflow-y-auto px-4 py-3">
                  {pitchingStaff.length === 0 ? (
                    <div className="py-2 text-center text-xs font-bold text-gray-600">No pitchers yet</div>
                  ) : (
                    pitchingStaff.map(member => (
                      <div
                        key={`${member.note}-${member.name}`}
                        className={`rounded-lg px-3 py-2 ${member.current ? "bg-white/10 ring-1 ring-white/20" : "bg-white/5"}`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate text-sm font-bold text-white">{member.name}</span>
                              {member.throwHand && (
                                <span className="shrink-0 rounded border border-white/15 px-1 py-0.5 text-[9px] font-black text-gray-300">
                                  {member.throwHand}HP
                                </span>
                              )}
                              {member.current && (
                                <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider" style={{ color: defenseColors.primary }}>
                                  Now
                                </span>
                              )}
                            </div>
                            <div className="truncate text-[10px] font-bold uppercase tracking-wider text-gray-500">
                              <span className={member.roleType === "Starter" ? "text-sky-400" : "text-amber-400"}>
                                {member.roleType}
                              </span>
                              {member.note !== member.roleType && <span> · {member.note}</span>}
                            </div>
                          </div>
                          <div className="shrink-0 text-right font-mono text-[11px] font-bold text-gray-400 tabular-nums">
                            <span className="text-white">{member.line.pitches}</span>P&nbsp;
                            <span className="text-red-400">{member.line.strikeouts}</span>K&nbsp;
                            <span>{member.line.runs}</span>R
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Play-by-play log */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400">
          Play by Play
        </div>
        <div ref={logRef} className="h-72 overflow-y-auto px-4 py-2 space-y-0.5 text-xs font-mono">
          {log.length === 0 && (
            <div className="text-gray-300 py-4 text-center animate-pulse">Starting game...</div>
          )}
          {log.map((entry, i) => {
            if (entry.kind === "inning") {
              return (
                <div key={i} className="pt-2 pb-0.5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  ── {entry.label} ──
                </div>
              )
            }
            if (entry.kind === "pitch") {
              return (
                <div key={i} className="text-gray-400 pl-3">
                  · {entry.text}
                </div>
              )
            }
            if (entry.kind === "play") {
              return (
                <div key={i} className={`pl-2 font-semibold ${entry.runs > 0 ? "text-green-700" : "text-gray-700"}`}>
                  {entry.emoji} {entry.text}
                </div>
              )
            }
            if (entry.kind === "announce") {
              return (
                <div key={i} className="pl-2 font-semibold text-indigo-600">
                  {entry.emoji} {entry.text}
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}
