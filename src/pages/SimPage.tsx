import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import StrikeZoneView, { type PitchDot } from "../components/StrikeZoneView"
import FieldView, { type BallTraj } from "../components/FieldView"

// ── Types ──────────────────────────────────────────────────────────────────

type SimTeam = {
  name: string
  wins: number
  losses: number
  pct: number
  rsPerGame: number
  raPerGame: number
}

type SimBatter = {
  name: string
  team: string
  pa: number
  avg: number
  obp: number
  slg: number
  ops: number
  woba: number
  kPct: number
  bbPct: number
  babip: number
  rbi: number
  hr: number
  sb: number
}

type SimPitcher = {
  name: string
  team: string
  gs: number
  gr: number
  ip: number
  w: number
  era: number
  whip: number
  k9: number
  bb9: number
  kPct: number
  bbPct: number
  fip: number
  sv: number
}

type LeagueAvg = {
  kPct: number
  bbPct: number
  avg: number
  babip: number
  era: number
}

type SimStats = {
  seasons: number
  teams: SimTeam[]
  battingLeaders: SimBatter[]
  pitchingLeaders: SimPitcher[]
  leagueAvg: LeagueAvg
}

type SimView = "standings" | "batting" | "pitching" | "game"

// ── Game replay types ──────────────────────────────────────────────────────

type HalfInningEvent = {
  type: "half_inning"
  inning: number
  isTop: boolean
  score: { away: number; home: number }
}
type PitchEvent = {
  type: "pitch"
  inning: number
  isTop: boolean
  pitcher: string
  batter: string
  pitchType: string
  outcome: string
  balls: number
  strikes: number
  outs: number
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  velo?: number
  px?: number
  pz?: number
  mx?: number
  mz?: number
  batHand?: "L" | "R"
}
type PlayEvent = {
  type: "play"
  inning: number
  isTop: boolean
  batter: string
  pitcher: string
  result: string
  outs: number
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  runsScored: number
  hit?: { ev: number; la: number; sa: number; traj: BallTraj }
}
type GameEvent = HalfInningEvent | PitchEvent | PlayEvent

type GameData = {
  date: string
  away: string
  home: string
  finalScore: { away: number; home: number }
  lineScore: { away: (number | null)[]; home: (number | null)[] }
  awayLineup: string[]
  homeLineup: string[]
  events: GameEvent[]
}

// ── Team color map ─────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, { badge: string }> = {
  "Brooklyn Hammers":       { badge: "#3b82f6" },
  "Fishtown Ferals":        { badge: "#22c55e" },
  "Bronx Wolves":           { badge: "#ef4444" },
  "Newark Knights":         { badge: "#6366f1" },
  "Kensington Iron":        { badge: "#f59e0b" },
  "Manayunk Runners":       { badge: "#4ade80" },
  "Germantown Colonials":   { badge: "#a855f7" },
  "Queens Titans":          { badge: "#86efac" },
  "Harlem Eagles":          { badge: "#fb923c" },
  "Fairmount Rams":         { badge: "#818cf8" },
  "South Philly Stallions": { badge: "#94a3b8" },
  "Staten Island Foxes":    { badge: "#f97316" },
}

function teamBadge(name: string) {
  const color = TEAM_COLORS[name]
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: color?.badge ?? "#6b7280", color: "#fff" }}
    >
      {name.split(" ")[0].slice(0, 3).toUpperCase()}
    </span>
  )
}

// ── League Avg Bar ─────────────────────────────────────────────────────────

function LeagueAvgBar({ lg }: { lg: LeagueAvg }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-white px-4 py-3 shadow-sm text-xs">
      <span className="font-bold uppercase tracking-widest text-gray-400 mr-1">JBL</span>
      <span className="text-gray-600">AVG <span className="font-mono font-semibold text-gray-800">{lg.avg.toFixed(3)}</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">BABIP <span className="font-mono font-semibold text-gray-800">{lg.babip.toFixed(3)}</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">K% <span className="font-mono font-semibold text-gray-800">{lg.kPct.toFixed(1)}%</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">BB% <span className="font-mono font-semibold text-gray-800">{lg.bbPct.toFixed(1)}%</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">ERA <span className="font-mono font-semibold text-gray-800">{lg.era.toFixed(2)}</span></span>
    </div>
  )
}

// ── Standings ──────────────────────────────────────────────────────────────

function StandingsView({ teams }: { teams: SimTeam[] }) {
  const sorted = [...teams].sort((a, b) => b.pct - a.pct)
  const leader = sorted[0]

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
          JBL — All 12 Teams
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Team</th>
              <th className="py-2 px-3 text-right">W</th>
              <th className="py-2 px-3 text-right">L</th>
              <th className="py-2 px-3 text-right">PCT</th>
              <th className="py-2 px-3 text-right">GB</th>
              <th className="py-2 px-3 text-right">RS/G</th>
              <th className="py-2 px-4 text-right">RA/G</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, i) => {
              const gb = i === 0 ? "—" : ((leader.wins - team.wins) / 2).toFixed(1)
              const color = TEAM_COLORS[team.name]
              return (
                <tr key={team.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color?.badge ?? "#6b7280" }} />
                      <span className="font-semibold text-gray-800">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">{team.wins.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{team.losses.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">{team.pct.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-400">{gb}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-700">{team.rsPerGame.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-red-600">{team.raPerGame.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Batting ────────────────────────────────────────────────────────────────

function BattingView({ batters }: { batters: SimBatter[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Batting Leaders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Player</th>
              <th className="py-2 px-2 text-left">Tm</th>
              <th className="py-2 px-3 text-right">AVG</th>
              <th className="py-2 px-3 text-right">OBP</th>
              <th className="py-2 px-3 text-right">SLG</th>
              <th className="py-2 px-3 text-right">OPS</th>
              <th className="py-2 px-3 text-right">wOBA</th>
              <th className="py-2 px-3 text-right">BABIP</th>
              <th className="py-2 px-3 text-right">K%</th>
              <th className="py-2 px-3 text-right">BB%</th>
              <th className="py-2 px-3 text-right">HR/162</th>
              <th className="py-2 px-3 text-right">RBI/162</th>
              <th className="py-2 px-4 text-right">SB/162</th>
            </tr>
          </thead>
          <tbody>
            {batters.map((p, i) => {
              const gamesEquiv = p.pa / 4.3
              const hrPer162  = (p.hr  / gamesEquiv * 162).toFixed(0)
              const rbiPer162 = (p.rbi / gamesEquiv * 162).toFixed(0)
              const sbPer162  = (p.sb  / gamesEquiv * 162).toFixed(0)
              return (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-2">{teamBadge(p.team)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{p.avg.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.obp.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.slg.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-green-700">{p.ops.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-700">{p.woba.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{p.babip.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-500">{p.kPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-600">{p.bbPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-600">{hrPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-600">{rbiPer162}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{sbPer162}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Pitching ───────────────────────────────────────────────────────────────

function PitchingView({ pitchers }: { pitchers: SimPitcher[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Pitching Leaders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Player</th>
              <th className="py-2 px-2 text-left">Tm</th>
              <th className="py-2 px-3 text-right">Role</th>
              <th className="py-2 px-3 text-right">W/162</th>
              <th className="py-2 px-3 text-right">IP/162</th>
              <th className="py-2 px-3 text-right">ERA</th>
              <th className="py-2 px-3 text-right">FIP</th>
              <th className="py-2 px-3 text-right">WHIP</th>
              <th className="py-2 px-3 text-right">K/9</th>
              <th className="py-2 px-3 text-right">BB/9</th>
              <th className="py-2 px-3 text-right">K%</th>
              <th className="py-2 px-3 text-right">BB%</th>
              <th className="py-2 px-4 text-right">SV/162</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p, i) => {
              const totalGames = p.gs + p.gr
              const gamesEquiv = totalGames > 0 ? totalGames : 1
              const wPer162   = (p.w  / gamesEquiv * 162).toFixed(0)
              const ipPer162  = (p.ip / gamesEquiv * 162).toFixed(1)
              const svPer162  = (p.sv / gamesEquiv * 162).toFixed(0)
              const role = p.sv > 0 ? "CL" : p.gs > p.gr ? "SP" : "RP"
              const roleColor = role === "CL" ? "text-red-600" : role === "SP" ? "text-blue-700" : "text-gray-500"
              return (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-2">{teamBadge(p.team)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold text-xs ${roleColor}`}>{role}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{wPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{ipPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{p.era.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600">{p.fip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.whip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-700">{p.k9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-500">{p.bb9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-600">{p.kPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-400">{p.bbPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{svPer162}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Game Replay ────────────────────────────────────────────────────────────

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
  if (r.includes("strikeout") || r.includes("strike out")) return "🌀"
  if (r.includes("error")) return "❌"
  return "·"
}

function BaseDiamond({ bases }: { bases: PitchEvent["bases"] }) {
  const dot = (on: boolean) => (
    <span
      className={`inline-block h-3 w-3 rotate-45 rounded-[2px] border border-amber-400 ${on ? "bg-amber-400" : "bg-white"}`}
    />
  )
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-1 w-12 select-none">
      <div />
      <div className="flex justify-center">{dot(!!bases.second)}</div>
      <div />
      <div className="flex justify-end">{dot(!!bases.third)}</div>
      <div />
      <div className="flex justify-start">{dot(!!bases.first)}</div>
    </div>
  )
}

function CountDots({ n, max, activeColor }: { n: number; max: number; activeColor: string }) {
  return (
    <span className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`inline-block h-2 w-2 rounded-full ${i < n ? activeColor : "bg-gray-200"}`} />
      ))}
    </span>
  )
}

type LogEntry =
  | { kind: "inning"; label: string }
  | { kind: "pitch"; text: string; isInPlay: boolean }
  | { kind: "play"; text: string; emoji: string; runs: number }

function eventDelay(ev: GameEvent, speed: number): number {
  const base =
    ev.type === "half_inning" ? 700 :
    ev.type === "pitch" ? (ev.outcome === "in play" ? 0 : 900) :
    1800
  return Math.max(50, base / speed)
}

// SPEED: pitch=900ms, play=1800ms, inning=700ms
const GAME_SPEED = 1

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
    }
  }
  return log
}

function GameView({ game }: { game: GameData }) {
  const events = game.events
  const storageKey = `jbl-game-idx-${game.date}`

  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? Math.min(parseInt(saved, 10), events.length) : 0
  })
  const [log, setLog] = useState<LogEntry[]>(() => buildLog(events, idx))
  const [speed, setSpeed] = useState(1)
  const logRef = useRef<HTMLDivElement>(null)

  const lastPitch = [...events].slice(0, idx).reverse().find((e): e is PitchEvent => e.type === "pitch")
  const lastPlay  = [...events].slice(0, idx).reverse().find((e): e is PlayEvent  => e.type === "play")
  const lastHalf  = [...events].slice(0, idx).reverse().find((e): e is HalfInningEvent => e.type === "half_inning")

  const currentScore  = lastPlay?.score ?? lastPitch?.score ?? lastHalf?.score ?? { away: 0, home: 0 }
  const currentBases  = lastPitch?.bases ?? lastPlay?.bases ?? { first: null, second: null, third: null }
  const currentOuts   = lastPitch?.outs  ?? lastPlay?.outs  ?? 0
  const currentInning = lastHalf?.inning ?? 1
  const currentTop    = lastHalf?.isTop  ?? true
  const pitcher       = lastPitch?.pitcher ?? lastPlay?.pitcher ?? ""
  const batter        = lastPitch?.batter  ?? lastPlay?.batter  ?? ""
  const balls         = lastPitch?.balls   ?? 0
  const strikes       = lastPitch?.strikes ?? 0
  const isDone        = idx >= events.length

  // ── Strike zone: 現在の打席の全投球ドット ─────────────────────────────
  const lastPlayIdx = [...events].slice(0, idx).map((e, i) => e.type === "play" ? i : -1).filter(i => i >= 0).at(-1) ?? -1
  const atBatPitches = events.slice(lastPlayIdx + 1, idx).filter((e): e is PitchEvent => e.type === "pitch" && (e as PitchEvent).px !== undefined)
  const pitchHistory: PitchDot[] = atBatPitches.slice(0, -1).map(p => ({
    px: p.px!, pz: p.pz!, pitchType: p.pitchType, outcome: p.outcome, mx: p.mx, mz: p.mz,
  }))
  const lastP = atBatPitches.at(-1)
  const pitchIncoming: PitchDot | undefined = lastP ? {
    px: lastP.px!, pz: lastP.pz!, pitchType: lastP.pitchType, outcome: lastP.outcome,
    mx: lastP.mx, mz: lastP.mz, velo: lastP.velo,
  } : undefined
  const batHand: "L" | "R" = lastP?.batHand ?? "R"

  // ── 直前の play に打球データがあれば表示 ─────────────────────────────
  // play の直後 n イベントは次の at-bat pitchが来るまでフィールドを表示
  const showFieldFor = 3  // play後この数のイベントはフィールドを表示
  const lastPlayFromEnd = [...events].slice(0, idx).reverse().findIndex(e => e.type === "play")
  const showField = lastPlayFromEnd >= 0 && lastPlayFromEnd < showFieldFor && lastPlay?.hit !== undefined
  const fieldHit = showField ? lastPlay!.hit! : null

  // 進行位置を localStorage に保存
  useEffect(() => {
    localStorage.setItem(storageKey, String(idx))
  }, [idx, storageKey])

  // auto-advance — starts immediately on mount
  useEffect(() => {
    if (isDone) return
    const ev = events[idx]
    const delay = eventDelay(ev, speed)
    const timer = setTimeout(() => {
      if (ev.type === "half_inning") {
        setLog(l => [...l, { kind: "inning", label: halfLabel(ev.inning, ev.isTop) }])
      } else if (ev.type === "pitch" && ev.outcome !== "in play") {
        setLog(l => [...l, {
          kind: "pitch",
          text: `${ev.pitchType[0].toUpperCase() + ev.pitchType.slice(1)} — ${pitchOutcomeLabel(ev.outcome)}`,
          isInPlay: false,
        }])
      } else if (ev.type === "play") {
        setLog(l => [...l, {
          kind: "play",
          text: `${ev.batter} — ${ev.result}${ev.runsScored > 0 ? ` (${ev.runsScored}R)` : ""}`,
          emoji: resultEmoji(ev.result),
          runs: ev.runsScored,
        }])
      }
      setIdx(i => i + 1)
    }, delay)
    return () => clearTimeout(timer)
  }, [idx, events, isDone, speed])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const awayShort = game.away.split(" ").slice(-1)[0].toUpperCase()
  const homeShort = game.home.split(" ").slice(-1)[0].toUpperCase()
  const awayColor = TEAM_COLORS[game.away]?.badge ?? "#6b7280"
  const homeColor = TEAM_COLORS[game.home]?.badge ?? "#6b7280"

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Today's JBL Game · {game.date}
          </span>
          <div className="flex items-center gap-2">
            {isDone
              ? <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Final</span>
              : <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
            }
            <button
              onClick={() => {
                localStorage.removeItem(storageKey)
                setIdx(0)
                setLog([])
              }}
              className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5"
            >
              ↺
            </button>
            {[0.5, 1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] rounded px-1.5 py-0.5 border ${speed === s ? "bg-green-700 text-white border-green-700" : "text-gray-400 border-gray-200 hover:text-gray-600"}`}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 px-6 py-5">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: awayColor }}>{awayShort}</span>
            <span className="text-4xl font-black text-gray-800 font-mono">{currentScore.away}</span>
            <span className="text-[10px] text-gray-400 text-center">{game.away}</span>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isDone ? "—" : halfLabel(currentInning, currentTop)}
            </span>
            <span className="text-2xl text-gray-200 font-black">VS</span>
            {!isDone && (
              <span className="text-xs text-gray-400">{currentOuts} OUT{currentOuts !== 1 ? "S" : ""}</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: homeColor }}>{homeShort}</span>
            <span className="text-4xl font-black text-gray-800 font-mono">{currentScore.home}</span>
            <span className="text-[10px] text-gray-400 text-center">{game.home}</span>
          </div>
        </div>

        {isDone && (
          <div className="border-t border-gray-100 overflow-x-auto px-4 pb-4">
            <table className="text-xs font-mono text-center mx-auto">
              <thead>
                <tr className="text-gray-400">
                  <th className="pr-3 text-left font-semibold py-1">Team</th>
                  {game.lineScore.away.map((_, i) => (
                    <th key={i} className="w-6 py-1">{i + 1}</th>
                  ))}
                  <th className="pl-2 py-1 font-bold">R</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: awayShort, runs: game.lineScore.away, total: game.finalScore.away, color: awayColor },
                  { label: homeShort, runs: game.lineScore.home, total: game.finalScore.home, color: homeColor },
                ].map(({ label, runs, total, color }) => (
                  <tr key={label}>
                    <td className="pr-3 text-left font-bold py-1" style={{ color }}>{label}</td>
                    {runs.map((r, i) => (
                      <td key={i} className="w-6 py-1 text-gray-600">{r ?? "X"}</td>
                    ))}
                    <td className="pl-2 py-1 font-black text-gray-800">{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live at-bat status + visualization */}
      {!isDone && (
        <div className="bg-white shadow-sm overflow-hidden -mx-3 lg:-mx-4">
          {/* 3D view — ページ端まで全幅 */}
          <div className="w-full aspect-video">
            {fieldHit ? (
              <FieldView
                key={`field-${idx}`}
                traj={fieldHit.traj}
                exitVelo={fieldHit.ev}
                launchAngle={fieldHit.la}
                sprayAngle={fieldHit.sa}
              />
            ) : (
              <StrikeZoneView history={pitchHistory} incoming={pitchIncoming} batHand={batHand} />
            )}
          </div>

          {/* Bottom bar: diamond + count + matchup */}
          <div className="px-5 py-3 flex flex-wrap gap-6 items-center border-t border-gray-100">
            <BaseDiamond bases={currentBases} />
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500">
                {pitcher && (
                  <><span className="font-semibold text-gray-700">{pitcher}</span>
                  {" → "}
                  <span className="font-semibold text-gray-700">{batter}</span></>
                )}
              </div>
              <div className="flex gap-4 items-center">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  B <CountDots n={balls}       max={4} activeColor="bg-green-500" />
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  S <CountDots n={strikes}     max={3} activeColor="bg-red-400" />
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  O <CountDots n={currentOuts} max={3} activeColor="bg-gray-500" />
                </span>
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
            return null
          })}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SimPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view") as SimView | null
  const validViews: SimView[] = ["standings", "batting", "pitching", "game"]
  const [activeView, setActiveView] = useState<SimView>(
    validViews.includes(requestedView as SimView) ? (requestedView as SimView) : "standings"
  )
  const [stats, setStats] = useState<SimStats | null>(null)
  const [gameDates, setGameDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [game, setGame] = useState<GameData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/sim-stats.json")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Failed to load sim stats."))
    fetch("/games/index.json")
      .then((r) => r.json())
      .then((dates: string[]) => {
        setGameDates(dates)
        if (dates.length > 0) setSelectedDate(dates[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setGame(null)
    fetch(`/games/game-${selectedDate}.json`)
      .then((r) => r.json())
      .then(setGame)
      .catch(() => {})
  }, [selectedDate])

  const handleChangeView = (view: string) => {
    const next = view as SimView
    setActiveView(next)
    setSearchParams({ view: next })
  }

  return (
    <PageShell
      activeView={activeView}
      onChangeView={handleChangeView}
      headerProps={{
        teamName: "JBL",
        teams: [],
        onChangeTeam: () => {},
        placeholder: "",
      }}
      tabs={[
        { label: "Standings", view: "standings" },
        { label: "Batting", view: "batting" },
        { label: "Pitching", view: "pitching" },
        { label: "Today's Game", view: "game" },
        { label: "Back to Stats", href: "/stats" },
      ]}
    >
      {error && (
        <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>
      )}

      {/* GameView は常にマウントしてタイマーを維持、非表示時は hidden */}
      {game && (
        <div className={activeView === "game" ? undefined : "hidden"}>
          {gameDates.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Game</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 font-mono"
              >
                {gameDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          <GameView key={selectedDate} game={game} />
        </div>
      )}
      {activeView === "game" && !game && (
        <div className="p-4 text-sm text-gray-500">Loading game data...</div>
      )}

      {activeView !== "game" && (
        <>
          {!stats && !error && (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          )}
          {stats && (
            <>
              <div className="mb-3 text-xs text-gray-400">
                {stats.seasons}-season simulation average · {stats.teams.length} teams · 96-game schedule
              </div>
              {stats.leagueAvg && <LeagueAvgBar lg={stats.leagueAvg} />}
              {activeView === "standings" && <StandingsView teams={stats.teams} />}
              {activeView === "batting"   && <BattingView   batters={stats.battingLeaders} />}
              {activeView === "pitching"  && <PitchingView  pitchers={stats.pitchingLeaders} />}
            </>
          )}
        </>
      )}
    </PageShell>
  )
}
