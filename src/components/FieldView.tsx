import { useEffect, useRef } from "react"
import type { SwingInfo } from "./StrikeZoneView"

export type BallTraj = [number, number, number][]  // [x, y, z] engine feet

export type BaseName = "home" | "first" | "second" | "third"
export type RunnerAdvance = {
  runner: string
  from: BaseName
  to: BaseName
  result: "safe" | "out" | "scored" | "held"
}

type Props = {
  traj: BallTraj
  exitVelo: number
  launchAngle: number
  sprayAngle: number
  result?: string
  swing?: SwingInfo | null
  defenders?: Partial<Record<string, string>>
  bases?: { first: string | null; second: string | null; third: string | null }
  runnerAdvances?: RunnerAdvance[]
  throwTo?: BaseName
  fielderColor?: string
  fielderSecondaryColor?: string
  fielderAccentColor?: string
  runnerColor?: string
  runnerAccentColor?: string
}

type LabelMeta = { text: string; color: string; shadow: string }
type Point = { x: number; y: number; z?: number }
type Fielder = {
  code: string
  role: string
  name: string
  start: Point
  target: Point
  active: boolean
}

function resultLabel(result: string, outsOnPlay = 0): { main: LabelMeta; isHit: boolean } | null {
  // The raw result text is just "grounds out" whether it's a routine out or
  // a double/triple play — the multi-out plays only show up by counting how
  // many runners were actually retired, so that takes priority over the
  // per-batted-ball-type text below.
  if (outsOnPlay >= 3) return { main: { text: "TRIPLE PLAY", color: "#f87171", shadow: "#7f1d1d" }, isHit: false }
  if (outsOnPlay >= 2) return { main: { text: "DOUBLE PLAY", color: "#f97316", shadow: "#78350f" }, isHit: false }
  const r = result.toLowerCase()
  if (r.includes("home run"))               return { main: { text: "HOME RUN",        color: "#fbbf24", shadow: "#78350f" }, isHit: true }
  if (r.includes("triple"))                 return { main: { text: "TRIPLE",           color: "#34d399", shadow: "#064e3b" }, isHit: true }
  if (r.includes("double"))                 return { main: { text: "DOUBLE",           color: "#60a5fa", shadow: "#1e3a8a" }, isHit: true }
  if (r.includes("bunt single") || r.includes("beats out")) return { main: { text: "BUNT SINGLE", color: "#e2e8f0", shadow: "#1f2937" }, isHit: true }
  if (r.includes("single"))                 return { main: { text: "SINGLE",           color: "#e2e8f0", shadow: "#1f2937" }, isHit: true }
  if (r.includes("grounds out"))            return { main: { text: "GROUND OUT",       color: "#94a3b8", shadow: "#0f172a" }, isHit: false }
  if (r.includes("flies out"))              return { main: { text: "FLY OUT",          color: "#94a3b8", shadow: "#0f172a" }, isHit: false }
  if (r.includes("infield fly"))            return { main: { text: "INFIELD FLY",      color: "#94a3b8", shadow: "#0f172a" }, isHit: false }
  if (r.includes("sacrifice") || r.includes("squeeze")) return { main: { text: "SAC BUNT",  color: "#94a3b8", shadow: "#0f172a" }, isHit: false }
  if (r.includes("fielder's choice"))       return { main: { text: "FIELDER'S CHOICE", color: "#94a3b8", shadow: "#0f172a" }, isHit: false }
  if (r.includes("error"))                  return { main: { text: "REACH ON ERROR",   color: "#fbbf24", shadow: "#78350f" }, isHit: false }
  return null
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
}

function easeInOutCubic(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function pointLerp(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
    z: lerp(a.z ?? 0, b.z ?? 0, t),
  }
}

function distance(a: Point, b: Point) {
  const dz = (a.z ?? 0) - (b.z ?? 0)
  return Math.hypot(a.x - b.x, a.y - b.y, dz)
}

function isGroundBall(result: string | undefined, launchAngle: number) {
  const r = result?.toLowerCase() ?? ""
  return r.includes("ground") || launchAngle <= 8
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts.at(-1)! : name
}

function fielderPositions(): Array<{ code: string; role: string; pos: Point }> {
  return [
    { code: "P", role: "P", pos: { x: 0, y: 60.5 } },
    { code: "C", role: "C", pos: { x: 0, y: -8 } },
    { code: "1B", role: "1B", pos: { x: 72, y: 86 } },
    { code: "2B", role: "2B", pos: { x: 54, y: 142 } },
    { code: "SS", role: "SS", pos: { x: -54, y: 142 } },
    { code: "3B", role: "3B", pos: { x: -72, y: 86 } },
    { code: "LF", role: "LF", pos: { x: -150, y: 255 } },
    { code: "CF", role: "CF", pos: { x: 0, y: 315 } },
    { code: "RF", role: "RF", pos: { x: 150, y: 255 } },
  ]
}

function clampToFence(p: Point): Point {
  const center = { x: 0, y: 25 }
  const maxRadius = 360
  const fromCenter = { x: p.x - center.x, y: p.y - center.y }
  const len = Math.hypot(fromCenter.x, fromCenter.y)
  const next = { ...p }
  if (len > maxRadius) {
    next.x = center.x + (fromCenter.x / len) * maxRadius
    next.y = center.y + (fromCenter.y / len) * maxRadius
  }

  const maxFairX = Math.max(28, Math.abs(next.y) + 18)
  next.x = Math.max(-maxFairX, Math.min(maxFairX, next.x))
  return next
}

// Ordered path of base points a runner travels between two bases, following
// the diamond (never cutting across the infield). Reaching "home" from any
// occupied base always means completing the circuit forward, not returning
// to the batter's box.
function basePathPoints(
  from: BaseName,
  to: BaseName,
  basePoints: Record<BaseName, Point>,
): Point[] {
  const order: BaseName[] = ["home", "first", "second", "third"]
  const fromIdx = order.indexOf(from)
  const toIdx = to === "home" && from !== "home" ? 4 : order.indexOf(to)
  const path: Point[] = []
  for (let i = fromIdx; i <= toIdx; i++) {
    path.push(basePoints[order[i % 4]])
  }
  return path
}

function drawDiamond(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, fill: string, stroke = "#ffffff") {
  ctx.beginPath()
  ctx.moveTo(x, y - size)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x - size, y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = stroke
  ctx.lineWidth = 1.5
  ctx.stroke()
}

// Position along a base-running path at time fraction t (0-1), following
// the path's actual segments rather than a straight line to the target.
function pointAlongPath(path: Point[], lens: number[], totalLen: number, t: number): Point {
  if (path.length === 0) return { x: 0, y: 0 }
  if (path.length === 1 || totalLen <= 0) return path[0]
  const dist = Math.max(0, Math.min(1, t)) * totalLen
  let seg = path.length - 2
  for (let i = 1; i < lens.length; i++) {
    if (lens[i] >= dist) { seg = i - 1; break }
  }
  const segLen = lens[seg + 1] - lens[seg]
  const frac = segLen > 0 ? (dist - lens[seg]) / segLen : 0
  return pointLerp(path[seg], path[Math.min(seg + 1, path.length - 1)], frac)
}

const RUNNER_SPEED_FT_PER_S = 26 // pace for runners already on base (not the batter's primary path)

// Same red/green language GameDetails already uses for CAUGHT STEALING vs
// STOLEN BASE — reused here so a runner reads as out or safe at a glance
// instead of every runner rendering in the same offense color regardless
// of outcome.
const OUT_COLOR = "#ef4444"
const SAFE_COLOR = "#22c55e"

export default function FieldView({
  traj,
  exitVelo,
  launchAngle,
  sprayAngle,
  result,
  swing,
  defenders = {},
  bases,
  runnerAdvances = [],
  throwTo,
  fielderColor = "#1d4ed8",
  fielderSecondaryColor = "#1e293b",
  fielderAccentColor = "#e0f2fe",
  runnerColor = "#dc2626",
  runnerAccentColor = "#ffffff",
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animIdRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    const points: Point[] = traj.map(([x, y, z]) => ({ x, y, z }))
    if (points.length < 2) return

    const fielders: Fielder[] = fielderPositions().map(({ code, role, pos }) => ({
      code,
      role,
      name: defenders[code] ?? role,
      start: pos,
      target: pos,
      active: false,
    }))

    const segLens = [0]
    for (let i = 1; i < points.length; i++) segLens.push(segLens[i - 1] + distance(points[i], points[i - 1]))
    const totalLen = segLens[segLens.length - 1]
    const landPt = clampToFence(points[points.length - 1])
    const grounder = isGroundBall(result, launchAngle)
    const firstBase = { x: 63.6, y: 63.6 }
    const primary = fielders.reduce((best, f) => {
      const d = distance(f.start, landPt)
      return d < best.distance ? { fielder: f, distance: d } : best
    }, { fielder: fielders[0], distance: Infinity }).fielder
    primary.active = true
    primary.target = pointLerp(landPt, primary.start, grounder ? 0.02 : 0.08)

    for (const f of fielders) {
      if (f === primary) continue
      const supportT = f.code === "P" || f.code === "C" ? 0.22 : 0.13
      f.target = pointLerp(f.start, landPt, supportT)
    }

    const hitR = (result ?? "").toLowerCase()
    const home = { x: 0, y: 0 }
    const secondBase = { x: 0, y: 127.3 }
    const thirdBase = { x: -63.6, y: 63.6 }
    let hitRunPath: Point[] = []
    if      (hitR.includes("home run")) hitRunPath = [home, firstBase, secondBase, thirdBase, home]
    else if (hitR.includes("triple"))   hitRunPath = [home, firstBase, secondBase, thirdBase]
    else if (hitR.includes("double"))   hitRunPath = [home, firstBase, secondBase]
    else if (hitR.includes("single") || hitR.includes("beats out") || hitR.includes("error") || hitR.includes("fielder's choice")) hitRunPath = [home, firstBase]

    const hitRunLens = [0]
    for (let i = 1; i < hitRunPath.length; i++) hitRunLens.push(hitRunLens[i - 1] + distance(hitRunPath[i], hitRunPath[i - 1]))
    const totalHitRunLen = hitRunLens[hitRunLens.length - 1] || 0
    const hitRunMs = totalHitRunLen > 0 ? (totalHitRunLen / (hitR.includes("home run") ? 18 : 24)) * 1000 : 0
    const flightMs = Math.min(grounder ? 900 : 1800, Math.max(520, totalLen * (grounder ? 4.2 : 3.5)))
    const throwMs = grounder ? 760 : 0
    const runnerMs = grounder ? flightMs + throwMs + 260 : 0

    // Runners already on base run their own path (from → to, following the
    // diamond) instead of sitting still — the batter's path above is
    // handled separately since it's tied to the primary fielder's throw.
    const basePoints: Record<BaseName, Point> = { home, first: firstBase, second: secondBase, third: thirdBase }
    // Every base an out is recorded at this play — the primary force/tag
    // (throwTo) plus any other runner explicitly marked out, e.g. the second
    // leg of a double play. Capped at two legs; triple plays just show the
    // first two throws rather than a third relay.
    const outTargets: BaseName[] = []
    if (throwTo) outTargets.push(throwTo)
    for (const advance of runnerAdvances) {
      if (advance.result === "out" && !outTargets.includes(advance.to)) outTargets.push(advance.to)
    }
    // Fall back to the routine 1st-base putout when the play carries no
    // explicit throw target — most plain groundouts don't bother recording
    // one, but they're still an out that needs a throw drawn.
    if (outTargets.length === 0 && hitRunPath.length === 0) outTargets.push("first")
    // Whether the batter specifically is the one retired at first — used to
    // color their run to first red/green instead of always the neutral
    // offense color.
    const batterOutAtFirst = outTargets.includes("first")
    const THROW_SPEED_FT_PER_S = 150
    const THROW_REACTION_MS = 140
    const LONG_THROW_FT = 180
    // When the play is a hit but a *different* runner is thrown out
    // advancing an extra base, the routine reaction delay had the fielder's
    // throw start almost immediately after the catch — reading as the ball
    // beating the batter to the bag on what's supposed to be a clean hit.
    // Holding the throw back longer here lets the single/double itself
    // register first, then plays out the separate extra-base gamble after.
    const isHitWithExtraOut = hitRunPath.length > 0 && outTargets.length > 0
    const HIT_WITH_OUT_REACTION_MS = 900
    // A throw longer than an infielder's routine range is relayed through a
    // cutoff man roughly two-thirds of the way in, rather than one throw
    // flying the entire distance — same as a real outfield assist.
    const splitLongThrow = (from: Point, to: Point): Point[] =>
      distance(from, to) > LONG_THROW_FT ? [from, pointLerp(from, to, 0.6), to] : [from, to]
    const throwSegments: { from: Point; to: Point; startMs: number; durMs: number }[] = []
    {
      let cursor = isHitWithExtraOut ? HIT_WITH_OUT_REACTION_MS : THROW_REACTION_MS
      let legOrigin = primary.target
      for (const base of outTargets.slice(0, 2)) {
        const legTarget = basePoints[base]
        const hops = splitLongThrow(legOrigin, legTarget)
        for (let i = 0; i < hops.length - 1; i++) {
          const from = hops[i]
          const to = hops[i + 1]
          const durMs = Math.max(260, (distance(from, to) / THROW_SPEED_FT_PER_S) * 1000)
          throwSegments.push({ from, to, startMs: cursor, durMs })
          cursor += durMs + THROW_REACTION_MS
        }
        legOrigin = legTarget
      }
    }
    const throwSegmentsFinishMs = throwSegments.length
      ? throwSegments[throwSegments.length - 1].startMs + throwSegments[throwSegments.length - 1].durMs
      : 0
    // A fly ball or liner caught for an out (not a grounder, not a hit)
    // means any tagging runner has to legally wait for the catch before
    // leaving their base, instead of breaking as soon as contact is made.
    const isCaughtFly = !grounder && hitRunPath.length === 0
    const extraRunners = runnerAdvances
      .filter((advance) => advance.from !== "home")
      .map((advance) => {
        const path = basePathPoints(advance.from, advance.to, basePoints)
        const lens = [0]
        for (let i = 1; i < path.length; i++) lens.push(lens[i - 1] + distance(path[i], path[i - 1]))
        const totalDist = lens[lens.length - 1] || 0
        const durationMs = Math.max(260, (totalDist / RUNNER_SPEED_FT_PER_S) * 1000)
        const startAtMs = grounder ? Math.max(0, flightMs - 150) : isCaughtFly ? flightMs + 150 : 280
        return { advance, path, lens, totalDist, durationMs, startAtMs, finishAtMs: startAtMs + durationMs }
      })
    const extraRunnersFinishMs = extraRunners.reduce((max, r) => Math.max(max, r.finishAtMs), 0)

    const totalAnimMs = flightMs + Math.max(runnerMs, hitRunMs + 280, extraRunnersFinishMs, throwSegmentsFinishMs) + 1500
    const start = performance.now()
    let lastRender = 0

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.max(1, Math.floor(rect.width * dpr))
      canvas.height = Math.max(1, Math.floor(rect.height * dpr))
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    resizeObserver?.observe(canvas)
    resize()

    const render = (now: number) => {
      animIdRef.current = requestAnimationFrame(render)
      const elapsed = now - start
      const minInterval = elapsed > totalAnimMs ? 1000 : 34
      if (now - lastRender < minInterval) return
      lastRender = now

      const w = canvas.clientWidth || 854
      const h = canvas.clientHeight || 480
      const scale = Math.min(w / 520, h / 430)
      const cx = w / 2
      const homeY = h - 54
      const project = (p: Point) => ({ x: cx + p.x * scale, y: homeY - p.y * scale })

      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, "#0f172a")
      bg.addColorStop(0.48, "#14532d")
      bg.addColorStop(1, "#0f3f2c")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      const fieldCenter = project({ x: 0, y: 145 })
      ctx.beginPath()
      ctx.ellipse(fieldCenter.x, fieldCenter.y, 385 * scale, 320 * scale, 0, Math.PI * 1.08, Math.PI * 1.92)
      ctx.lineTo(cx, homeY)
      ctx.closePath()
      ctx.fillStyle = "#166534"
      ctx.fill()

      ctx.save()
      ctx.strokeStyle = "rgba(255,255,255,0.34)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx, homeY)
      ctx.lineTo(cx - 340 * scale, homeY - 340 * scale)
      ctx.moveTo(cx, homeY)
      ctx.lineTo(cx + 340 * scale, homeY - 340 * scale)
      ctx.stroke()
      ctx.restore()

      const wallCenter = project({ x: 0, y: 25 })
      ctx.beginPath()
      ctx.arc(wallCenter.x, wallCenter.y, 385 * scale, Math.PI * 1.16, Math.PI * 1.84)
      ctx.strokeStyle = "rgba(96,165,250,0.58)"
      ctx.lineWidth = 3
      ctx.stroke()

      const mound = project({ x: 0, y: 60.5 })
      const base1 = project(firstBase)
      const base2 = project(secondBase)
      const base3 = project(thirdBase)
      ctx.beginPath()
      ctx.moveTo(cx, homeY)
      ctx.lineTo(base1.x, base1.y)
      ctx.lineTo(base2.x, base2.y)
      ctx.lineTo(base3.x, base3.y)
      ctx.closePath()
      ctx.fillStyle = "#78350f"
      ctx.globalAlpha = 0.86
      ctx.fill()
      ctx.globalAlpha = 1
      ctx.strokeStyle = "rgba(255,255,255,0.28)"
      ctx.stroke()

      ctx.beginPath()
      ctx.arc(mound.x, mound.y, 9 * scale, 0, Math.PI * 2)
      ctx.fillStyle = "#92400e"
      ctx.fill()
      drawDiamond(ctx, base1.x, base1.y, 5 * scale, "#ffffff")
      drawDiamond(ctx, base2.x, base2.y, 5 * scale, "#ffffff")
      drawDiamond(ctx, base3.x, base3.y, 5 * scale, "#ffffff")
      drawDiamond(ctx, cx, homeY, 4.5 * scale, "#ffffff")

      const flightT = Math.min(1, elapsed / flightMs)
      const targetLen = flightT * totalLen
      let seg = 0
      for (let i = 1; i < segLens.length; i++) {
        if (segLens[i] >= targetLen) { seg = i - 1; break }
        seg = i - 1
      }
      const segT = segLens[seg + 1] > segLens[seg] ? (targetLen - segLens[seg]) / (segLens[seg + 1] - segLens[seg]) : 0
      const ballPos = pointLerp(points[seg], points[Math.min(seg + 1, points.length - 1)], segT)
      const activeFielderT = easeOutCubic(Math.min(1, Math.max(0, (flightT - 0.08) / 0.82)))
      const fielderNow = new Map<string, Point>()
      for (const f of fielders) {
        fielderNow.set(f.code, pointLerp(f.start, f.target, f.active ? activeFielderT : activeFielderT * 0.68))
      }

      const primaryNow = fielderNow.get(primary.code) ?? primary.start
      const primaryScreen = project(primaryNow)
      const targetScreen = project(primary.target)
      ctx.setLineDash([5, 5])
      ctx.strokeStyle = "rgba(250,204,21,0.78)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(primaryScreen.x, primaryScreen.y)
      ctx.lineTo(targetScreen.x, targetScreen.y)
      ctx.stroke()
      ctx.setLineDash([])
      ctx.beginPath()
      ctx.arc(targetScreen.x, targetScreen.y, 11 * scale * (1 + Math.sin(elapsed * 0.012) * 0.08), 0, Math.PI * 2)
      ctx.strokeStyle = "rgba(250,204,21,0.72)"
      ctx.lineWidth = 2
      ctx.stroke()

      for (const { base, occupied, pos } of [
        { base: "first" as const, occupied: !!bases?.first, pos: firstBase },
        { base: "second" as const, occupied: !!bases?.second, pos: secondBase },
        { base: "third" as const, occupied: !!bases?.third, pos: thirdBase },
      ]) {
        if (!occupied) continue
        // A runner who's advancing this play runs their own path once their
        // start time comes up; otherwise (or before that) they sit at base.
        const runner = extraRunners.find((r) => r.advance.from === base)
        const runnerT = runner ? (elapsed - runner.startAtMs) / runner.durationMs : 0
        const runnerPos = runner && runnerT > 0
          ? pointAlongPath(runner.path, runner.lens, runner.totalDist, easeInOutCubic(runnerT))
          : pos
        const p = project(runnerPos)
        // Stay the neutral team color while still in motion — only flip to
        // red/out or green/safe once the runner has actually reached the
        // base and the call is made, not for the whole run there. "held"
        // means nothing happened (they just stayed put) — that's not a
        // safe/out verdict, so it stays neutral too, not green.
        const dotColor = runner && runnerT >= 1 && runner.advance.result !== "held"
          ? (runner.advance.result === "out" ? OUT_COLOR : SAFE_COLOR)
          : runnerColor
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6.5 * scale, 0, Math.PI * 2)
        ctx.fillStyle = dotColor
        ctx.fill()
        ctx.strokeStyle = runnerAccentColor
        ctx.lineWidth = Math.max(1, 1.5 * scale)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.x, p.y, 2.8 * scale, 0, Math.PI * 2)
        ctx.fillStyle = runnerAccentColor
        ctx.fill()
      }

      for (const f of fielders) {
        const p = project(fielderNow.get(f.code) ?? f.start)
        const radius = (f.active ? 8.5 : 6.5) * scale
        if (f.active) {
          ctx.beginPath()
          ctx.arc(p.x, p.y, 14 * scale * (1 + Math.sin(elapsed * 0.014) * 0.08), 0, Math.PI * 2)
          ctx.strokeStyle = "rgba(250,204,21,0.9)"
          ctx.lineWidth = 2
          ctx.stroke()
        }
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2)
        ctx.fillStyle = fielderColor
        ctx.fill()
        ctx.strokeStyle = fielderSecondaryColor
        ctx.lineWidth = Math.max(1, 2 * scale)
        ctx.stroke()
        ctx.beginPath()
        ctx.arc(p.x, p.y, radius * 0.42, 0, Math.PI * 2)
        ctx.fillStyle = fielderAccentColor
        ctx.fill()

        ctx.font = `700 ${Math.max(9, 10 * scale)}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        const label = shortName(f.name || f.role).slice(0, 10)
        const labelW = Math.min(70, Math.max(22, ctx.measureText(label).width + 10))
        const labelY = p.y - radius - 12
        ctx.fillStyle = "rgba(15,23,42,0.82)"
        ctx.beginPath()
        ctx.roundRect(p.x - labelW / 2, labelY - 8, labelW, 16, 7)
        ctx.fill()
        ctx.fillStyle = "#ffffff"
        ctx.fillText(label, p.x, labelY + 0.5)
      }

      const trailEnd = Math.max(1, Math.min(points.length - 1, seg + 1))
      ctx.beginPath()
      for (let i = 0; i <= trailEnd; i++) {
        const p = project(points[i])
        if (i === 0) ctx.moveTo(p.x, p.y)
        else ctx.lineTo(p.x, p.y)
      }
      ctx.strokeStyle = "rgba(254,240,138,0.72)"
      ctx.lineWidth = 3
      ctx.stroke()

      const ballScreen = project(ballPos)
      const ballHeight = ballPos.z ?? 0
      const shadowScale = Math.max(0.45, 1 - ballHeight / 170)
      ctx.beginPath()
      ctx.ellipse(ballScreen.x, ballScreen.y + 5 * scale, 6 * scale * shadowScale, 3 * scale * shadowScale, 0, 0, Math.PI * 2)
      ctx.fillStyle = "rgba(0,0,0,0.32)"
      ctx.fill()
      ctx.beginPath()
      ctx.arc(ballScreen.x, ballScreen.y - Math.min(42, ballHeight * scale * 0.26), 5 * scale, 0, Math.PI * 2)
      ctx.fillStyle = "#fef08a"
      ctx.shadowColor = "rgba(250,204,21,0.85)"
      ctx.shadowBlur = 14
      ctx.fill()
      ctx.shadowBlur = 0

      if (elapsed >= flightMs) {
        const land = project(landPt)
        const ft = Math.min(1, (elapsed - flightMs) / 500)
        ctx.beginPath()
        ctx.arc(land.x, land.y, 10 * scale * (1 + ft * 0.9), 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(254,240,138,${0.8 * (1 - ft * 0.35)})`
        ctx.lineWidth = 2
        ctx.stroke()
      }

      if (elapsed > flightMs) {
        const playElapsed = elapsed - flightMs

        if (grounder) {
          const runnerT = easeInOutCubic(Math.min(1, elapsed / runnerMs))
          const runner = project(pointLerp(home, firstBase, runnerT))
          ctx.beginPath()
          ctx.arc(runner.x, runner.y, 7 * scale * (1 + Math.sin(elapsed * 0.018) * 0.08), 0, Math.PI * 2)
          ctx.fillStyle = runnerT >= 1 ? (batterOutAtFirst ? OUT_COLOR : SAFE_COLOR) : runnerColor
          ctx.fill()
          ctx.strokeStyle = runnerAccentColor
          ctx.lineWidth = Math.max(1, 1.5 * scale)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(runner.x, runner.y, 3 * scale, 0, Math.PI * 2)
          ctx.fillStyle = runnerAccentColor
          ctx.fill()
        }

        // Throws that record an out — a routine single throw, a long
        // outfield assist relayed through a cutoff man, or the two legs of
        // a double play. Works the same whether the batted ball was a
        // grounder or a fly/liner caught for an out.
        for (const seg of throwSegments) {
          if (playElapsed < seg.startMs) continue
          const t = easeInOutCubic(Math.min(1, Math.max(0, playElapsed - seg.startMs) / seg.durMs))
          const release = project(seg.from)
          const glove = project(seg.to)
          ctx.beginPath()
          ctx.moveTo(release.x, release.y)
          ctx.lineTo(glove.x, glove.y)
          ctx.strokeStyle = `rgba(255,255,255,${t > 0 && t < 1 ? 0.65 : 0.25})`
          ctx.lineWidth = 2
          ctx.stroke()
          const throwScreen = project(pointLerp(seg.from, seg.to, t))
          ctx.beginPath()
          ctx.arc(throwScreen.x, throwScreen.y - Math.sin(t * Math.PI) * 16 * scale, 4.5 * scale, 0, Math.PI * 2)
          ctx.fillStyle = "#fef08a"
          ctx.fill()
        }
      }

      if (!grounder && hitRunPath.length > 1 && elapsed > flightMs) {
        const runElapsed = Math.max(0, elapsed - 280)
        if (runElapsed > 0) {
          const runT = Math.min(1, runElapsed / hitRunMs)
          const runDist = runT * totalHitRunLen
          let rseg = hitRunPath.length - 2
          for (let i = 1; i < hitRunLens.length; i++) {
            if (hitRunLens[i] >= runDist) { rseg = i - 1; break }
          }
          const rfrac = hitRunLens[rseg + 1] > hitRunLens[rseg] ? (runDist - hitRunLens[rseg]) / (hitRunLens[rseg + 1] - hitRunLens[rseg]) : 0
          const runner = project(pointLerp(hitRunPath[rseg], hitRunPath[Math.min(rseg + 1, hitRunPath.length - 1)], rfrac))
          ctx.beginPath()
          ctx.arc(runner.x, runner.y - Math.abs(Math.sin(runElapsed * 0.06)) * 1.5, 7 * scale, 0, Math.PI * 2)
          // A categorized hit (single/double/triple/HR) is always safe.
          ctx.fillStyle = SAFE_COLOR
          ctx.fill()
          ctx.strokeStyle = runnerAccentColor
          ctx.lineWidth = Math.max(1, 1.5 * scale)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(runner.x, runner.y, 3 * scale, 0, Math.PI * 2)
          ctx.fillStyle = runnerAccentColor
          ctx.fill()
        }
      }
    }

    animIdRef.current = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(animIdRef.current)
      resizeObserver?.disconnect()
    }
  }, [bases, defenders, launchAngle, result, traj, runnerAdvances, throwTo, fielderColor, fielderSecondaryColor, fielderAccentColor, runnerColor, runnerAccentColor])

  const outsOnPlay = runnerAdvances.filter((a) => a.result === "out").length
  const rl = result ? resultLabel(result, outsOnPlay) : null
  // A hit can still cost the defense an out — a runner already on base
  // gambling for an extra one and getting thrown out. That's a real,
  // common play, but showing only "SINGLE" right before the half-inning
  // ends on it reads as a non sequitur without calling out who was out.
  const outOnPlay = runnerAdvances.find((a) => a.result === "out")

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block h-full w-full bg-slate-900" />
      {rl && (
        <div
          className="absolute top-[8%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
          style={{ animation: "fadeInPop 0.18s ease-out forwards" }}
        >
          <span
            className="font-black tracking-widest select-none whitespace-nowrap"
            style={{
              fontSize: rl.main.text === "HOME RUN" ? "3.2rem" : "2.6rem",
              color: rl.main.color,
              textShadow: `0 0 22px ${rl.main.shadow}, 0 2px 8px rgba(0,0,0,0.95)`,
              opacity: 0.95,
            }}
          >
            {rl.main.text}
          </span>
          {rl.isHit && outOnPlay && (
            <span
              className="font-black uppercase tracking-widest select-none"
              style={{
                fontSize: "1.3rem",
                color: "#f87171",
                textShadow: "0 0 16px #7f1d1d88, 0 2px 6px rgba(0,0,0,0.9)",
              }}
            >
              {shortName(outOnPlay.runner)} out at {outOnPlay.to}
            </span>
          )}
          {swing && swing.detail !== "FOUL" && swing.detail !== "MISS" && swing.detail !== "MEET" && (
            <div className="flex items-center gap-3">
              <span
                className="font-black uppercase tracking-widest select-none"
                style={{
                  fontSize: "1.5rem",
                  color: swing.color,
                  textShadow: `0 0 16px ${swing.color}88, 0 2px 6px rgba(0,0,0,0.9)`,
                }}
              >
                {swing.detail}
              </span>
              {swing.metric && (
                <span
                  className="font-bold uppercase tracking-wide select-none"
                  style={{ fontSize: "1.3rem", color: "#e2e8f0", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
                >
                  {swing.metric}
                </span>
              )}
            </div>
          )}
        </div>
      )}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] font-mono text-gray-300 bg-black/50 px-3 py-1 rounded-full">
        <span>EV <span className="text-yellow-300">{exitVelo.toFixed(0)} mph</span></span>
        <span>LA <span className="text-yellow-300">{launchAngle > 0 ? "+" : ""}{launchAngle.toFixed(0)}°</span></span>
        <span>{sprayAngle > 0 ? "Pull" : "Oppo"} <span className="text-yellow-300">{Math.abs(sprayAngle).toFixed(0)}°</span></span>
      </div>
    </div>
  )
}
