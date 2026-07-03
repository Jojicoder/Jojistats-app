import { useEffect, useRef, useState } from "react"

const PITCH_COLOR: Record<string, string> = {
  fastball: "#ff4444",
  cutter: "#ff8c00",
  sinker: "#f59e0b",
  curveball: "#3b82f6",
  slider: "#a855f7",
  changeup: "#22c55e",
  splitter: "#06b6d4",
}
function pitchColor(t: string): string { return PITCH_COLOR[t.toLowerCase()] ?? "#aaaaaa" }

function isStraightPitchType(pitchType: string) {
  return pitchType.toLowerCase() === "fastball"
}

export type PitchDot = {
  px: number; pz: number
  pitchType: string; outcome: string
  mx?: number; mz?: number
  velo?: number
}

const ZL = -0.83, ZR = 0.83, ENG_ZB = 1.5, ENG_ZT = 3.5

const PITCH_FULL: Record<string, string> = {
  fastball: "Fastball", cutter: "Cutter", sinker: "Sinker",
  curveball: "Curveball", slider: "Slider", changeup: "Changeup", splitter: "Splitter",
}

export type SwingInfo = {
  label: string
  detail: string
  tone: string
  color: string
  metric?: string
}

export type Announcement = {
  label: string
  sub: string
  color: string
}

export type PickoffInfo = {
  base: "first" | "second" | "third"
  runner: string
  out: boolean
}

type PitchPoint = { px: number; pz: number; depth: number }
type AnimState = {
  active: boolean
  startTime: number
  duration: number
  path: PitchPoint[]
  pendingDot: PitchDot | null
  pendingSwing: SwingInfo | null
  pendingPlayResult: string
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n))
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - clamp01(x), 3)
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t
}

function readableTextColor(color: string) {
  const hex = color.replace("#", "")
  if (hex.length !== 6) return "#ffffff"
  const red = Number.parseInt(hex.slice(0, 2), 16)
  const green = Number.parseInt(hex.slice(2, 4), 16)
  const blue = Number.parseInt(hex.slice(4, 6), 16)
  return (red * 299 + green * 587 + blue * 114) / 1000 > 155 ? "#111827" : "#ffffff"
}

function mapPitchToZone(dot: Pick<PitchDot, "px" | "pz">, zone: { x: number; y: number; w: number; h: number }) {
  const x = zone.x + ((dot.px - ZL) / (ZR - ZL)) * zone.w
  const y = zone.y + (1 - (dot.pz - ENG_ZB) / (ENG_ZT - ENG_ZB)) * zone.h
  return { x, y }
}

function mapPitchToCamera(dot: Pick<PitchDot, "px" | "pz">, zone: { x: number; y: number; w: number; h: number }, flip: boolean) {
  const p = mapPitchToZone(dot, zone)
  return flip ? { x: zone.x + zone.w - (p.x - zone.x), y: p.y } : p
}

function computePitchPath(dot: PitchDot, pitchHand: "L" | "R", nPts = 28): PitchPoint[] {
  const side = pitchHand === "L" ? -1 : 1
  const startPx = 0.24 * side
  const startPz = 5.8
  // Fastballs are the straight pitch. Keep their data path linear; the
  // render loop also draws them directly release-to-target on screen.
  const isStraight = isStraightPitchType(dot.pitchType)
  const mx = isStraight ? 0 : dot.mx ?? 0
  const mz = isStraight ? 0 : dot.mz ?? 0
  const pts: PitchPoint[] = []
  for (let i = 0; i <= nPts; i++) {
    const t = i / nPts
    const breakX = (t * t * t - t) * mx * 0.018
    // mz follows the pfx_z convention in this data: positive means the
    // pitch resists drop (rides "above" a straight line), negative means it
    // dives more than a straight line — so the curve needs the opposite
    // sign of (t² - t), which is otherwise negative across the flight.
    const drop = -(t * t - t) * mz * 0.012
    pts.push({
      px: lerp(startPx, dot.px, t) + breakX,
      pz: lerp(startPz, dot.pz, t) + drop,
      depth: 1 - t,
    })
  }
  return pts
}

function samplePath(path: PitchPoint[], t: number): PitchPoint {
  if (!path.length) return { px: 0, pz: 2.5, depth: 0 }
  const pos = clamp01(t) * (path.length - 1)
  const i = Math.floor(pos)
  const frac = pos - i
  const a = path[i]
  const b = path[Math.min(i + 1, path.length - 1)]
  return {
    px: lerp(a.px, b.px, frac),
    pz: lerp(a.pz, b.pz, frac),
    depth: lerp(a.depth, b.depth, frac),
  }
}

function pitchOutcomeLabel(dot: PitchDot, playResult: string) {
  const oc = dot.outcome.toLowerCase()
  const pr = playResult.toLowerCase()
  if (pr.includes("strikes out") || pr.includes("strikeout") || pr.includes("strike out")) return "STRIKEOUT"
  if (pr.includes("walk")) return "FOUR BALL"
  if (oc === "ball") return "BALL"
  if (oc === "foul") return "FOUL"
  if (oc === "in play") return null
  return "STRIKE"
}

// Endpoint of a fixed-length limb rotated around its joint — swinging the
// angle (not sliding the endpoint by an offset) keeps the bone's length
// constant through the whole motion instead of visibly stretching.
function limbEnd(jointX: number, jointY: number, angleDeg: number, length: number): [number, number] {
  const rad = (angleDeg * Math.PI) / 180
  return [jointX + Math.cos(rad) * length, jointY + Math.sin(rad) * length]
}

function drawPitcher(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  scale: number,
  pitchHand: "L" | "R",
  phase: number,
  uniformColor = "#1e3a8a",
  uniformSecondaryColor = "#1e293b",
  uniformAccentColor = "#ffffff",
) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(pitchHand === "R" ? -scale : scale, scale)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.beginPath()
  ctx.ellipse(0, 42, 42, 10, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = uniformSecondaryColor
  ctx.lineWidth = 10
  ctx.beginPath()
  {
    const [ex, ey] = limbEnd(-9, 8, lerp(112, 126, phase), 36)
    ctx.moveTo(-9, 8)
    ctx.lineTo(ex, ey)
  }
  {
    const [ex, ey] = limbEnd(9, 8, lerp(64, 44, phase), 36)
    ctx.moveTo(9, 8)
    ctx.lineTo(ex, ey)
  }
  ctx.stroke()

  ctx.fillStyle = uniformColor
  ctx.beginPath()
  ctx.roundRect(-17, -36, 34, 48, 9)
  ctx.fill()
  ctx.fillStyle = uniformAccentColor
  ctx.fillRect(-18, -21, 36, 5)

  const throwHandPoint = limbEnd(12, -24, lerp(38, -8, phase), 38)
  const gloveHandPoint = limbEnd(-12, -24, lerp(128, 142, phase), 30)
  ctx.strokeStyle = "#f5c5a3"
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(-12, -24)
  ctx.lineTo(gloveHandPoint[0], gloveHandPoint[1])
  ctx.moveTo(12, -24)
  ctx.lineTo(throwHandPoint[0], throwHandPoint[1])
  ctx.stroke()

  // The off-hand wears the mitt — a distinct leather-brown shape so it
  // doesn't read as a second bare throwing hand.
  ctx.fillStyle = "#6b4226"
  ctx.beginPath()
  ctx.ellipse(gloveHandPoint[0], gloveHandPoint[1], 8, 10, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#3f2513"
  ctx.lineWidth = 1.5
  ctx.stroke()

  ctx.fillStyle = "#f5c5a3"
  ctx.beginPath()
  ctx.arc(0, -50, 13, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = uniformSecondaryColor
  ctx.beginPath()
  ctx.roundRect(-15, -64, 30, 10, 3)
  ctx.fill()
  ctx.fillStyle = uniformAccentColor
  ctx.beginPath()
  ctx.roundRect(-5, -62, 10, 6, 2)
  ctx.fill()
  // Bright, glowing ball in the throwing hand — small and mirrored along
  // with the rest of the sprite, so it's the clearest tell for which arm
  // (and therefore which side) this pitcher throws from.
  ctx.save()
  ctx.shadowColor = "rgba(255,255,255,0.95)"
  ctx.shadowBlur = 10
  ctx.fillStyle = "#ffffff"
  ctx.beginPath()
  ctx.arc(throwHandPoint[0], throwHandPoint[1], 8, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  ctx.restore()
}

// A distant runner taking a lead off second, straight back behind the
// mound — smaller and higher in frame than the pitcher to read as farther
// from camera, without touching the fixed zone/plate/mound layout.
function drawSecondBaseRunner(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number, color: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.lineCap = "round"
  ctx.lineJoin = "round"

  ctx.fillStyle = "rgba(0,0,0,0.28)"
  ctx.beginPath()
  ctx.ellipse(0, 30, 24, 6, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.strokeStyle = color
  ctx.lineWidth = 9
  ctx.beginPath()
  ctx.moveTo(-6, 6)
  ctx.lineTo(-15, 30)
  ctx.moveTo(6, 6)
  ctx.lineTo(15, 30)
  ctx.stroke()

  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(-13, -26, 26, 34, 7)
  ctx.fill()

  ctx.strokeStyle = "#f5c5a3"
  ctx.lineWidth = 7
  ctx.beginPath()
  ctx.moveTo(-9, -18)
  ctx.lineTo(-19, -2)
  ctx.moveTo(9, -18)
  ctx.lineTo(19, -2)
  ctx.stroke()

  ctx.fillStyle = "#f5c5a3"
  ctx.beginPath()
  ctx.arc(0, -36, 10, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawSecondBasePlate(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  const size = 7.5 * scale
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(1, 0.36)
  ctx.fillStyle = "#f8fafc"
  ctx.strokeStyle = "rgba(15,23,42,0.24)"
  ctx.lineWidth = Math.max(0.8, 0.85 * scale)
  ctx.beginPath()
  ctx.moveTo(0, -size)
  ctx.lineTo(size, 0)
  ctx.lineTo(0, size)
  ctx.lineTo(-size, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.restore()
}

// No batter figure on screen, but the batter's box badge keeps the
// left/right handedness readable at a glance.
// Bat-only swing sweep — deliberately no arms/torso, since a full batter
// figure at this scale reads as an uncanny stick doll. Canonical swing is
// drawn for a right-handed batter, pivoting near the waist and sweeping
// through level with the ground (not chopping down from overhead); lefties
// mirror it via the horizontal flip.
function drawBatSwing(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  batHand: "L" | "R",
  scale: number,
  t: number,
) {
  const swingT = easeOutCubic(t)
  // Angle 0 points straight out to the side (level with the pivot); the
  // swing plane is centered on that so the bat comes through from the
  // batter's side/waist height instead of chopping down from overhead.
  const startAngle = 0.55
  const endAngle = -1.4
  const angle = lerp(startAngle, endAngle, swingT)
  const batLen = 46 * scale

  ctx.save()
  ctx.translate(x, y)
  ctx.scale(batHand === "L" ? -1 : 1, 1)

  // Motion-blur arc trailing the bat head through the portion already swung.
  if (swingT > 0.05) {
    ctx.strokeStyle = "rgba(255,255,255,0.25)"
    ctx.lineWidth = 9 * scale
    ctx.lineCap = "round"
    ctx.beginPath()
    ctx.arc(0, 0, batLen, startAngle, angle, true)
    ctx.stroke()
  }

  ctx.rotate(angle)
  ctx.strokeStyle = "#c99a52"
  ctx.lineCap = "round"
  ctx.lineWidth = 5 * scale
  ctx.beginPath()
  ctx.moveTo(8 * scale, 0)
  ctx.lineTo(batLen, 0)
  ctx.stroke()
  ctx.strokeStyle = "#2b1d0e"
  ctx.lineWidth = 7 * scale
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(10 * scale, 0)
  ctx.stroke()
  ctx.restore()
}

function batterDisplayName(name: string, fallback: "L" | "R") {
  const trimmed = name.trim()
  if (!trimmed) return fallback
  return trimmed.split(/\s+/).at(-1) ?? trimmed
}

function drawBatterBadge(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  batHand: "L" | "R",
  batterName: string,
  scale: number,
  teamColor: string,
  accentColor: string,
) {
  const r = 22 * scale
  const label = batterDisplayName(batterName, batHand)
  ctx.save()
  const grad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.1, x, y, r)
  grad.addColorStop(0, accentColor)
  grad.addColorStop(0.4, teamColor)
  grad.addColorStop(1, teamColor)
  ctx.shadowColor = `${teamColor}aa`
  ctx.shadowBlur = 10 * scale
  ctx.beginPath()
  ctx.arc(x, y, r, 0, Math.PI * 2)
  ctx.fillStyle = grad
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.strokeStyle = accentColor
  ctx.lineWidth = Math.max(1.2, 2 * scale)
  ctx.stroke()
  ctx.fillStyle = readableTextColor(teamColor)
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  // Shrink the name to fit inside the circle rather than overflowing it.
  const maxWidth = r * 1.6
  let fontSize = label.length <= 1 ? 20 * scale : 12 * scale
  ctx.font = `800 ${Math.round(fontSize)}px sans-serif`
  while (fontSize > 6 * scale && ctx.measureText(label).width > maxWidth) {
    fontSize -= scale
    ctx.font = `800 ${Math.round(fontSize)}px sans-serif`
  }
  ctx.fillText(label, x, y + 1)
  ctx.restore()
}

// The camera sits right behind the catcher's shoulder, so only the mitt
// pokes up into frame near the bottom edge — the rest of the catcher is
// implied, not drawn.
function drawCatcherMittHint(ctx: CanvasRenderingContext2D, x: number, y: number, scale: number) {
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillStyle = "rgba(0,0,0,0.35)"
  ctx.beginPath()
  ctx.ellipse(0, 4, 64, 20, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = "#5b3418"
  ctx.beginPath()
  ctx.ellipse(0, -18, 34, 26, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.strokeStyle = "#3b220e"
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.arc(0, -18, 24, Math.PI * 0.15, Math.PI * 0.85)
  ctx.stroke()
  ctx.fillStyle = "#eab676"
  ctx.beginPath()
  ctx.ellipse(-30, -8, 8, 12, 0.4, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawPitchLabel(ctx: CanvasRenderingContext2D, dot: PitchDot, x: number, y: number) {
  if (!dot.velo) return
  const name = PITCH_FULL[dot.pitchType.toLowerCase()] ?? dot.pitchType
  const kmh = Math.round(dot.velo * 1.60934)
  ctx.save()
  ctx.font = "700 11px sans-serif"
  const w = Math.max(78, ctx.measureText(name).width + 22)
  ctx.fillStyle = "rgba(0,0,0,0.72)"
  ctx.beginPath()
  ctx.roundRect(x - w / 2, y - 34, w, 28, 7)
  ctx.fill()
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(`${kmh} km/h`, x, y - 24)
  ctx.fillStyle = pitchColor(dot.pitchType)
  ctx.fillText(name, x, y - 12)
  ctx.restore()
}

export default function StrikeZoneView({
  history,
  incoming,
  batHand = "R",
  batterName = "",
  pitchHand = "R",
  playResult,
  swing,
  pitcherColor,
  pitcherSecondaryColor = "#1e293b",
  pitcherAccentColor = "#ffffff",
  batterColor = "#1e293b",
  batterAccentColor = "#ffffff",
  runnerOnSecond,
  runnerColor = "#dc2626",
  pickoff,
  hideOverlay,
}: {
  history: PitchDot[]
  incoming?: PitchDot
  batHand?: "L" | "R"
  batterName?: string
  pitchHand?: "L" | "R"
  playResult?: string
  swing?: SwingInfo | null
  pitcherColor?: string
  pitcherSecondaryColor?: string
  pitcherAccentColor?: string
  batterColor?: string
  batterAccentColor?: string
  runnerOnSecond?: boolean
  runnerColor?: string
  pickoff?: PickoffInfo | null
  // Lets the parent hide the STRIKE/BALL/FOUL overlay when it's showing its
  // own announcement (steal, pickoff, substitution) at the same position —
  // those don't arrive via a new `incoming` pitch, so this component has no
  // other way to know it should step aside.
  hideOverlay?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rafRef = useRef<number>(0)
  const animRef = useRef<AnimState>({
    active: false,
    startTime: 0,
    duration: 620,
    path: [],
    pendingDot: null,
    pendingSwing: null,
    pendingPlayResult: "",
  })
  const swingRef = useRef<SwingInfo | null>(null)
  const historyRef = useRef(history)
  const runnerOnSecondRef = useRef(runnerOnSecond)
  const runnerColorRef = useRef(runnerColor)
  const pickoffRef = useRef<{ event: PickoffInfo; startTime: number } | null>(null)
  const [outcomeLabel, setOutcomeLabel] = useState<string | null>(null)
  const [swingDisplay, setSwingDisplay] = useState<SwingInfo | null>(null)

  useEffect(() => { swingRef.current = swing ?? null }, [swing])
  useEffect(() => { historyRef.current = history }, [history])
  useEffect(() => { animRef.current.pendingSwing = swing ?? null }, [swing])
  useEffect(() => { runnerOnSecondRef.current = runnerOnSecond }, [runnerOnSecond])
  useEffect(() => { runnerColorRef.current = runnerColor }, [runnerColor])
  // Drop the cached outcome/swing text while hidden — otherwise it just
  // waits offscreen and pops back up once the parent's announcement clears.
  useEffect(() => {
    if (!hideOverlay) return
    setOutcomeLabel(null)
    setSwingDisplay(null)
  }, [hideOverlay])
  useEffect(() => {
    if (!pickoff) return
    pickoffRef.current = { event: pickoff, startTime: performance.now() }
  }, [pickoff])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

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

    let impactStart = -1000
    let impactDot: PitchDot | null = null
    let swingAnimStart = -1000
    const SWING_DURATION = 260
    let lastRender = 0

    const render = (now: number) => {
      rafRef.current = requestAnimationFrame(render)
      const anim = animRef.current
      const pickoffAnim = pickoffRef.current
      const isAnimating =
        anim.active ||
        now - impactStart < 420 ||
        now - swingAnimStart < SWING_DURATION ||
        Boolean(pickoffAnim && now - pickoffAnim.startTime < 1300)
      const minInterval = isAnimating ? 34 : 1000
      if (now - lastRender < minInterval) return
      lastRender = now

      const w = canvas.clientWidth || 854
      const h = canvas.clientHeight || 480

      // Low catcher camera: the strike zone stays centered on the plate.
      // Only the batter-side UI flips; the mound and pitcher stay on the
      // center line so they align with the extended foul lines.
      const flip = batHand === "R"
      const plateY = h - Math.max(66, h * 0.1)
      const zoneW = Math.min(w * 0.68, h * 0.6)
      const zoneH = zoneW * 1.08
      const zone = {
        x: w / 2 - zoneW / 2,
        y: Math.max(64, h * 0.15),
        w: zoneW,
        h: zoneH,
      }
      const plateX = zone.x + zone.w / 2
      const mound = {
        x: plateX,
        y: zone.y + zone.h * 0.16,
      }
      const boxScale = zone.w / 158
      const secondBasePoint = { x: mound.x, y: mound.y - 48 * boxScale }
      const pickoffTargets = {
        first: { x: plateX + zone.w * 0.62, y: zone.y + zone.h * 0.54 },
        second: secondBasePoint,
        third: { x: plateX - zone.w * 0.62, y: zone.y + zone.h * 0.54 },
      }

      ctx.clearRect(0, 0, w, h)
      const bg = ctx.createLinearGradient(0, 0, 0, h)
      bg.addColorStop(0, "#050a14")
      bg.addColorStop(0.5, "#163f2a")
      bg.addColorStop(1, "#7a4620")
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, w, h)

      // Distant stadium glow at the release point sells the depth.
      const glow = ctx.createRadialGradient(mound.x, mound.y - 10, 0, mound.x, mound.y - 10, w * 0.32)
      glow.addColorStop(0, "rgba(255,255,255,0.14)")
      glow.addColorStop(1, "rgba(255,255,255,0)")
      ctx.fillStyle = glow
      ctx.fillRect(0, 0, w, h)

      // Infield dirt, widening toward the camera.
      ctx.fillStyle = "rgba(120,53,15,0.78)"
      ctx.beginPath()
      ctx.ellipse(w / 2, h + 18, w * 0.74, h * 0.46, 0, Math.PI, Math.PI * 2)
      ctx.fill()

      ctx.fillStyle = "rgba(92,51,23,0.95)"
      ctx.beginPath()
      ctx.ellipse(mound.x, mound.y + 34 * boxScale, 44 * boxScale, 11 * boxScale, 0, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = "#eeeeee"
      ctx.fillRect(mound.x - 8 * boxScale, mound.y + 30 * boxScale, 16 * boxScale, 2.2 * boxScale)

      const pitchT = anim.active ? clamp01((now - anim.startTime) / anim.duration) : 0
      const releasePhase = anim.active ? easeOutCubic(clamp01(pitchT / 0.35)) : 0

      drawSecondBasePlate(ctx, secondBasePoint.x, secondBasePoint.y, boxScale)

      // A runner taking a lead off second sits straight back behind the
      // mound, drawn first (and smaller) so the pitcher reads as closer.
      if (runnerOnSecondRef.current) {
        drawSecondBaseRunner(
          ctx,
          secondBasePoint.x,
          secondBasePoint.y + 4 * boxScale,
          0.16 * boxScale,
          runnerColorRef.current ?? "#dc2626",
        )
      }

      drawPitcher(
        ctx,
        mound.x,
        mound.y + 25 * boxScale,
        0.31 * boxScale,
        pitchHand,
        releasePhase,
        pitcherColor,
        pitcherSecondaryColor,
        pitcherAccentColor,
      )

      ctx.fillStyle = "rgba(0,0,0,0.18)"
      ctx.beginPath()
      ctx.roundRect(zone.x - 14, zone.y - 14, zone.w + 28, zone.h + 28, 14)
      ctx.fill()
      const zoneFill = ctx.createLinearGradient(0, zone.y, 0, zone.y + zone.h)
      zoneFill.addColorStop(0, "rgba(255,255,255,0.08)")
      zoneFill.addColorStop(1, "rgba(217,119,6,0.18)")
      ctx.fillStyle = zoneFill
      ctx.fillRect(zone.x, zone.y, zone.w, zone.h)
      ctx.strokeStyle = "rgba(255,255,255,0.72)"
      ctx.lineWidth = 2
      ctx.strokeRect(zone.x, zone.y, zone.w, zone.h)
      ctx.strokeStyle = "rgba(255,255,255,0.22)"
      ctx.lineWidth = 1
      for (let i = 1; i < 3; i++) {
        const x = zone.x + zone.w / 3 * i
        const y = zone.y + zone.h / 3 * i
        ctx.beginPath()
        ctx.moveTo(x, zone.y)
        ctx.lineTo(x, zone.y + zone.h)
        ctx.moveTo(zone.x, y)
        ctx.lineTo(zone.x + zone.w, y)
        ctx.stroke()
      }

      ctx.strokeStyle = "rgba(255,255,255,0.34)"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(plateX, plateY)
      ctx.lineTo(-w * 0.08, zone.y + zone.h * 0.36)
      ctx.moveTo(plateX, plateY)
      ctx.lineTo(w * 1.08, zone.y + zone.h * 0.36)
      ctx.stroke()

      if (pickoffRef.current) {
        const elapsed = now - pickoffRef.current.startTime
        if (elapsed < 1300) {
          const pickoffT = clamp01(elapsed / 760)
          const target = pickoffTargets[pickoffRef.current.event.base]
          const start = {
            x: mound.x + (pitchHand === "L" ? -12 : 12) * boxScale,
            y: mound.y + 10 * boxScale,
          }
          const ball = {
            x: lerp(start.x, target.x, easeOutCubic(pickoffT)),
            y: lerp(start.y, target.y, easeOutCubic(pickoffT)),
          }
          const fade = elapsed < 980 ? 1 : 1 - clamp01((elapsed - 980) / 320)
          ctx.save()
          ctx.globalAlpha = fade
          ctx.strokeStyle = pickoffRef.current.event.out ? "rgba(249,115,22,0.9)" : "rgba(148,163,184,0.85)"
          ctx.lineWidth = 2.5
          ctx.setLineDash([7, 8])
          ctx.beginPath()
          ctx.moveTo(start.x, start.y)
          ctx.lineTo(target.x, target.y)
          ctx.stroke()
          ctx.setLineDash([])
          ctx.shadowColor = pickoffRef.current.event.out ? "#f97316" : "#e2e8f0"
          ctx.shadowBlur = 14
          ctx.fillStyle = "#ffffff"
          ctx.beginPath()
          ctx.arc(ball.x, ball.y, 6.5, 0, Math.PI * 2)
          ctx.fill()
          ctx.shadowBlur = 0
          if (elapsed > 620) {
            const ringT = clamp01((elapsed - 620) / 420)
            ctx.strokeStyle = pickoffRef.current.event.out ? `rgba(249,115,22,${1 - ringT})` : `rgba(226,232,240,${1 - ringT})`
            ctx.lineWidth = 3
            ctx.beginPath()
            ctx.arc(target.x, target.y, 10 + ringT * 28, 0, Math.PI * 2)
            ctx.stroke()
          }
          ctx.restore()
        } else {
          pickoffRef.current = null
        }
      }

      // Ground shadow first, so the plate reads as sitting in the dirt
      // rather than floating on top of it.
      ctx.fillStyle = "rgba(0,0,0,0.3)"
      ctx.beginPath()
      ctx.ellipse(plateX, plateY + 20 * boxScale, 34 * boxScale, 12 * boxScale, 0, 0, Math.PI * 2)
      ctx.fill()

      const platePath = new Path2D()
      platePath.moveTo(plateX, plateY)
      platePath.lineTo(plateX + 30 * boxScale, plateY + 13 * boxScale)
      platePath.lineTo(plateX + 20 * boxScale, plateY + 35 * boxScale)
      platePath.lineTo(plateX - 20 * boxScale, plateY + 35 * boxScale)
      platePath.lineTo(plateX - 30 * boxScale, plateY + 13 * boxScale)
      platePath.closePath()

      const plateFill = ctx.createLinearGradient(0, plateY, 0, plateY + 35 * boxScale)
      plateFill.addColorStop(0, "#ffffff")
      plateFill.addColorStop(1, "#dbe2ea")
      ctx.fillStyle = plateFill
      ctx.fill(platePath)
      ctx.strokeStyle = "rgba(15,23,42,0.35)"
      ctx.lineWidth = 1.5
      ctx.stroke(platePath)

      // Catcher stays mostly out of frame — the camera sits right behind
      // them — only the mitt pokes up into the shot, near the bottom edge.
      drawCatcherMittHint(ctx, plateX, h + 8, boxScale * 1.3)

      ctx.strokeStyle = "rgba(255,255,255,0.22)"
      ctx.lineWidth = 2
      ctx.strokeRect(plateX - 105 * boxScale, plateY - 44 * boxScale, 70 * boxScale, 112 * boxScale)
      ctx.strokeRect(plateX + 35 * boxScale, plateY - 44 * boxScale, 70 * boxScale, 112 * boxScale)

      // No batter figure — just a badge in whichever box they're standing in
      // so it's still obvious this is a lefty or a righty at the plate.
      const batterBoxX = flip ? plateX - 70 * boxScale : plateX + 70 * boxScale
      const batterBadgeY = plateY - 12 * boxScale
      drawBatterBadge(ctx, batterBoxX, batterBadgeY, batHand, batterName, boxScale, batterColor, batterAccentColor)

      if (now - swingAnimStart < SWING_DURATION) {
        const swingT = clamp01((now - swingAnimStart) / SWING_DURATION)
        drawBatSwing(ctx, batterBoxX, batterBadgeY - 2 * boxScale, batHand, boxScale * 1.05, swingT)
      }

      for (const dot of historyRef.current) {
        const p = mapPitchToCamera(dot, zone, flip)
        ctx.beginPath()
        ctx.arc(p.x, p.y, 6.5, 0, Math.PI * 2)
        ctx.fillStyle = pitchColor(dot.pitchType)
        ctx.globalAlpha = 0.85
        ctx.fill()
        ctx.globalAlpha = 1
        ctx.strokeStyle = "rgba(255,255,255,0.72)"
        ctx.lineWidth = 1.5
        ctx.stroke()
        if (dot.velo) drawPitchLabel(ctx, dot, p.x, p.y)
      }

      if (anim.active) {
        const t = pitchT
        const flightT = t < 0.35 ? 0 : (t - 0.35) / 0.65
        const pitchTint = anim.pendingDot ? pitchColor(anim.pendingDot.pitchType) : "#ffffff"

        // Release flash — a sharp pop right as the ball leaves the hand,
        // instead of a slow glow smeared across the whole flight.
        if (releasePhase < 1) {
          const hx = mound.x + (pitchHand === "L" ? -18 : 18)
          const hy = mound.y + 2
          const flash = 1 - releasePhase
          ctx.save()
          const flashGrad = ctx.createRadialGradient(hx, hy, 0, hx, hy, 14)
          flashGrad.addColorStop(0, `${pitchTint}dd`)
          flashGrad.addColorStop(1, `${pitchTint}00`)
          ctx.globalAlpha = flash
          ctx.fillStyle = flashGrad
          ctx.beginPath()
          ctx.arc(hx, hy, 14, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        if (flightT > 0) {
          const straightFastball = anim.pendingDot ? isStraightPitchType(anim.pendingDot.pitchType) : false
          const speedFactor = anim.pendingDot?.velo
            ? Math.min(1.6, Math.max(0.7, anim.pendingDot.velo / 92))
            : 1
          const nSamples = 14
          const trail: { x: number; y: number; r: number; depth: number }[] = []
          const releasePoint = {
            x: mound.x + (pitchHand === "L" ? -18 : 18) * boxScale,
            y: mound.y + 2 * boxScale,
          }
          const targetPoint = anim.pendingDot
            ? mapPitchToCamera(anim.pendingDot, zone, flip)
            : { x: plateX, y: zone.y + zone.h * 0.5 }
          for (let i = 0; i < nSamples; i++) {
            const back = (nSamples - 1 - i) * 0.018 * speedFactor
            const st = Math.max(0, flightT - back)
            const travelT = straightFastball ? st : undefined
            const pitch = straightFastball ? null : samplePath(anim.path, st)
            const depth = straightFastball ? 1 - st : pitch!.depth
            const position = straightFastball
              ? {
                  x: lerp(releasePoint.x, targetPoint.x, travelT!),
                  y: lerp(releasePoint.y, targetPoint.y, travelT!),
                }
              : (() => {
                  const p = mapPitchToCamera(pitch!, zone, flip)
                  return {
                    x: lerp(mound.x + (pitchHand === "L" ? -7 : 7), p.x, 1 - pitch!.depth),
                    y: lerp(mound.y - 10, p.y, 1 - pitch!.depth),
                  }
                })()
            const size = lerp(
              straightFastball ? 1.6 : 1.1,
              straightFastball ? 8.8 : 9.5,
              easeOutCubic(1 - depth),
            )
            trail.push({
              ...position,
              r: size,
              depth,
            })
            }

          // Tapered, pitch-colored motion-blur streak.
          for (let i = 0; i < trail.length - 1; i++) {
            const a = trail[i]
            const b = trail[i + 1]
            ctx.globalAlpha = (i / trail.length) * 0.55
            ctx.strokeStyle = pitchTint
            ctx.lineWidth = lerp(1, a.r * 1.4, i / trail.length)
            ctx.lineCap = "round"
            ctx.beginPath()
            ctx.moveTo(a.x, a.y)
            ctx.lineTo(b.x, b.y)
            ctx.stroke()
          }
          ctx.globalAlpha = 1

          const current = trail[trail.length - 1]

          // Seam-spin flicker on the ball itself.
          ctx.save()
          ctx.translate(current.x, current.y)
          ctx.rotate((now * 0.03) % (Math.PI * 2))
          ctx.strokeStyle = "rgba(255,255,255,0.85)"
          ctx.lineWidth = Math.max(1, current.r * 0.22)
          ctx.beginPath()
          ctx.arc(0, 0, current.r * 0.62, 0.3, 2.2)
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(0, 0, current.r * 0.62, Math.PI + 0.3, Math.PI + 2.2)
          ctx.stroke()
          ctx.restore()

          // Core ball, glowing brighter as it closes in.
          ctx.beginPath()
          ctx.arc(current.x, current.y, current.r, 0, Math.PI * 2)
          ctx.fillStyle = pitchTint
          ctx.shadowColor = pitchTint
          ctx.shadowBlur = lerp(6, 22, easeOutCubic(1 - current.depth))
          ctx.fill()
          ctx.shadowBlur = 0
          ctx.beginPath()
          ctx.arc(current.x - current.r * 0.3, current.y - current.r * 0.3, current.r * 0.35, 0, Math.PI * 2)
          ctx.fillStyle = "rgba(255,255,255,0.85)"
          ctx.fill()
        }

        if (t >= 1) {
          anim.active = false
          if (anim.pendingDot) {
            impactStart = now
            impactDot = anim.pendingDot
            historyRef.current = [...historyRef.current, anim.pendingDot]
            setOutcomeLabel(pitchOutcomeLabel(anim.pendingDot, anim.pendingPlayResult))
            setSwingDisplay(anim.pendingSwing)
            if (anim.pendingSwing) swingAnimStart = now
            anim.pendingDot = null
          }
        }
      }

      if (impactDot && now - impactStart < 460) {
        const it = clamp01((now - impactStart) / 460)
        const p = mapPitchToCamera(impactDot, zone, flip)
        const tint = pitchColor(impactDot.pitchType)

        // Quick bright flash burst on catch.
        if (it < 0.3) {
          const flashT = it / 0.3
          ctx.save()
          const burstGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 40)
          burstGrad.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - flashT)})`)
          burstGrad.addColorStop(1, "rgba(255,255,255,0)")
          ctx.fillStyle = burstGrad
          ctx.beginPath()
          ctx.arc(p.x, p.y, 40, 0, Math.PI * 2)
          ctx.fill()
          ctx.restore()
        }

        // Expanding ring, tinted by pitch type.
        const ringAlpha = Math.round(0.65 * (1 - it) * 255).toString(16).padStart(2, "0")
        ctx.beginPath()
        ctx.arc(p.x, p.y, 9 + it * 34, 0, Math.PI * 2)
        ctx.strokeStyle = `${tint}${ringAlpha}`
        ctx.lineWidth = 3
        ctx.stroke()

        // Sparks radiating outward from the mitt.
        const sparkCount = 6
        for (let i = 0; i < sparkCount; i++) {
          const angle = (i / sparkCount) * Math.PI * 2 + 0.4
          const dist = 10 + it * 30
          const sx = p.x + Math.cos(angle) * dist
          const sy = p.y + Math.sin(angle) * dist
          ctx.beginPath()
          ctx.arc(sx, sy, Math.max(0, 2.2 * (1 - it)), 0, Math.PI * 2)
          ctx.fillStyle = `rgba(255,255,255,${0.6 * (1 - it)})`
          ctx.fill()
        }
      }
    }

    rafRef.current = requestAnimationFrame(render)
    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver?.disconnect()
    }
  }, [batHand, batterName, pitchHand, pitcherColor, pitcherSecondaryColor, pitcherAccentColor, batterColor, batterAccentColor])

  useEffect(() => {
    if (!incoming) return
    const clearFrame = requestAnimationFrame(() => {
      setOutcomeLabel(null)
      setSwingDisplay(null)
    })

    const velo = incoming.velo ?? 90
    const veloFps = velo * 1.4667
    const flightSec = 60.5 / veloFps
    const straightFastball = isStraightPitchType(incoming.pitchType)
    const isPowerPitch = straightFastball || ["sinker", "cutter"].includes(incoming.pitchType.toLowerCase())
    const mult = straightFastball ? 0.78 : isPowerPitch ? 1.08 : 1.42
    const minDuration = straightFastball ? 430 : 760
    const duration = Math.max(minDuration, Math.round(flightSec * 1000 * mult))

    animRef.current = {
      active: true,
      startTime: performance.now(),
      duration,
      path: computePitchPath(incoming, pitchHand),
      pendingDot: incoming,
      pendingSwing: swingRef.current,
      pendingPlayResult: playResult ?? "",
    }
    return () => cancelAnimationFrame(clearFrame)
  }, [incoming, pitchHand, playResult])

  const outcomeMeta: Record<string, { color: string; shadow: string }> = {
    STRIKE: { color: "#f87171", shadow: "#7f1d1d" },
    BALL: { color: "#60a5fa", shadow: "#1e3a8a" },
    FOUL: { color: "#facc15", shadow: "#78350f" },
    STRIKEOUT: { color: "#f87171", shadow: "#7f1d1d" },
    "FOUR BALL": { color: "#60a5fa", shadow: "#1e3a8a" },
  }
  const om = outcomeLabel ? outcomeMeta[outcomeLabel] : null
  const swingOnlyLabel = !outcomeLabel && swingDisplay ? swingDisplay.label : null
  const showPitchOverlay = !hideOverlay && ((outcomeLabel && om) || swingOnlyLabel)

  return (
    <div className="relative w-full h-full">
      <canvas ref={canvasRef} className="block h-full w-full bg-slate-950" />

      {showPitchOverlay && (
        <div
          className="absolute top-[19%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
          style={{ animation: "fadeInPop 0.18s ease-out forwards" }}
        >
          <span
            className="font-black tracking-widest select-none whitespace-nowrap"
            style={{
              fontSize: outcomeLabel === "STRIKEOUT" ? "3.5rem" : "2.8rem",
              color: om?.color ?? swingDisplay?.color ?? "#10b981",
              textShadow: `0 0 22px ${om?.shadow ?? `${swingDisplay?.color ?? "#10b981"}88`}, 0 2px 8px rgba(0,0,0,0.95)`,
              opacity: 0.95,
            }}
          >
            {outcomeLabel ?? swingOnlyLabel}
          </span>
          {swingDisplay && outcomeLabel !== "STRIKEOUT" && outcomeLabel !== "FOUL" && (
            <div className="flex items-center gap-3">
              <span
                className="font-black uppercase tracking-widest select-none"
                style={{
                  fontSize: "1.5rem",
                  color: swingDisplay.color,
                  textShadow: `0 0 16px ${swingDisplay.color}88, 0 2px 6px rgba(0,0,0,0.9)`,
                }}
              >
                {swingDisplay.detail}
              </span>
              {swingDisplay.metric && (
                <span
                  className="font-bold uppercase tracking-wide select-none"
                  style={{ fontSize: "1.3rem", color: "#e2e8f0", textShadow: "0 2px 6px rgba(0,0,0,0.9)" }}
                >
                  {swingDisplay.metric}
                </span>
              )}
            </div>
          )}
        </div>
      )}

    </div>
  )
}
