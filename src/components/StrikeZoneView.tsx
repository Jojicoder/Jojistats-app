import { useEffect, useRef, useState } from "react"
import * as THREE from "three"

// ── pitch type colors ──────────────────────────────────────────────────────
const PITCH_COLOR: Record<string, number> = {
  fastball:  0xff4444,
  cutter:    0xff8c00,
  sinker:    0xf59e0b,
  curveball: 0x3b82f6,
  slider:    0xa855f7,
  changeup:  0x22c55e,
  splitter:  0x06b6d4,
}
function pitchColor(t: string): number { return PITCH_COLOR[t.toLowerCase()] ?? 0xaaaaaa }

export type PitchDot = {
  px: number; pz: number
  pitchType: string; outcome: string
  mx?: number; mz?: number
  velo?: number
}

// ── constants ──────────────────────────────────────────────────────────────
const ZL = -0.83, ZR = 0.83, ZB = 0.5, ZT = 2.2
const ENG_ZB = 1.5, ENG_ZT = 3.5
function mapPz(pz: number): number {
  return ZB + (pz - ENG_ZB) / (ENG_ZT - ENG_ZB) * (ZT - ZB)
}
const PITCH_Z = -30.0
const REL_Y = 5.9

// ── Geometry helpers ───────────────────────────────────────────────────────
const SKIN    = 0xf5c5a3
const UNI_P   = 0x1e3a8a
const UNI_B   = 0xcc1111
const PANT_P  = 0x1e3a8a
const PANT_B  = 0xffffff
const SHOE    = 0x111111
const CAP     = 0x1e3a8a
const GLOVE   = 0x78350f
const HELMET  = 0x0f1f4a
const BAT_H   = 0x3d1a00
const BAT_B   = 0xe8d5a3
const WHITE   = 0xffffff
const NAVY_D  = 0x0b163f

function mat(color: number) { return new THREE.MeshPhongMaterial({ color, shininess: 28 }) }

function makeCyl(r: number, h: number, color: number, pivotTop = true): THREE.Group {
  const g = new THREE.Group()
  const geo = new THREE.CylinderGeometry(r * 0.9, r, h, 8)
  if (pivotTop) geo.translate(0, -h / 2, 0)
  g.add(new THREE.Mesh(geo, mat(color)))
  return g
}

function makeSph(r: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color))
}

function makeBox(w: number, h: number, d: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color))
}

function makeSegment(a: THREE.Vector3, b: THREE.Vector3, r: number, color: number): THREE.Mesh {
  const len = a.distanceTo(b)
  const geo = new THREE.CylinderGeometry(r * 0.88, r, len, 8)
  const mesh = new THREE.Mesh(geo, mat(color))
  mesh.position.copy(a).lerp(b, 0.5)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  return mesh
}

function addFace(head: THREE.Object3D) {
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 })
  for (const x of [-0.095, 0.095]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 6), eyeMat)
    eye.position.set(x, 0.02, 0.305)
    head.add(eye)
  }
  const nose = makeSph(0.024, 0xeab08d)
  nose.scale.set(0.75, 0.9, 1.25)
  nose.position.set(0, -0.035, 0.325)
  head.add(nose)
}

function addJerseyTrim(torso: THREE.Object3D, accent: number, frontZ = 0.255) {
  const trimMat = new THREE.MeshBasicMaterial({ color: accent, transparent: true, opacity: 0.85, side: THREE.DoubleSide })
  for (const x of [-0.085, 0.085]) {
    const placket = new THREE.Mesh(new THREE.PlaneGeometry(0.035, 0.78), trimMat)
    placket.position.set(x, -0.35, frontZ)
    torso.add(placket)
  }
  const chest = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 0.035), trimMat)
  chest.position.set(0, -0.02, frontZ + 0.003)
  torso.add(chest)
}

// ── Pitcher rig ────────────────────────────────────────────────────────────
interface PitcherRig {
  root: THREE.Object3D
  hips: THREE.Object3D; torso: THREE.Object3D
  rShoulder: THREE.Object3D; rElbow: THREE.Object3D
  lShoulder: THREE.Object3D; lElbow: THREE.Object3D
  lHip: THREE.Object3D; lKnee: THREE.Object3D
  rHip: THREE.Object3D; rKnee: THREE.Object3D
  handBall: THREE.Mesh
}

function buildPitcher(pitchHand: "L" | "R"): PitcherRig {
  const root = new THREE.Object3D()
  root.scale.x = pitchHand === "L" ? -1 : 1
  const hips = new THREE.Object3D()
  root.add(hips)

  const mkLeg = (side: number) => {
    const hip = new THREE.Object3D()
    hip.position.set(side * 0.35, 0, 0)
    hips.add(hip)
    const thigh = makeCyl(0.20, 0.9, PANT_P)
    hip.add(thigh)
    const knee = new THREE.Object3D()
    knee.position.y = -0.9
    thigh.add(knee)
    const shin = makeCyl(0.17, 0.82, PANT_P)
    knee.add(shin)
    const foot = makeCyl(0.15, 0.26, SHOE, false)
    foot.position.set(side * 0.04, -0.82, 0.09)
    const toe = makeBox(0.26, 0.11, 0.38, SHOE)
    toe.position.set(side * 0.03, -0.83, 0.18)
    knee.add(foot)
    knee.add(toe)
    return { hip, knee }
  }
  const rLeg = mkLeg(1), lLeg = mkLeg(-1)

  const torso = new THREE.Object3D()
  torso.position.set(0, 0.05, 0)
  hips.add(torso)
  const hipMesh = makeCyl(0.28, 0.32, PANT_P, false)
  hipMesh.position.set(0, -0.14, 0)
  hips.add(hipMesh)
  const belt = makeBox(0.72, 0.08, 0.18, NAVY_D)
  belt.position.set(0, -0.28, 0.01)
  hips.add(belt)
  torso.add(makeCyl(0.26, 1.05, UNI_P))
  addJerseyTrim(torso, WHITE)

  const neck = makeCyl(0.11, 0.18, SKIN)
  neck.position.set(0, 1.05, 0)
  torso.add(neck)
  const head = makeSph(0.32, SKIN)
  head.position.set(0, -0.09, 0)
  neck.add(head)
  addFace(head)
  const capT = makeSph(0.34, CAP)
  capT.position.y = 0.20
  head.add(capT)
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.40, 0.05, 8), mat(CAP))
  brim.position.set(0, 0.07, 0.20)
  head.add(brim)
  const capLogo = new THREE.Mesh(
    new THREE.CircleGeometry(0.07, 10),
    new THREE.MeshBasicMaterial({ color: WHITE, side: THREE.DoubleSide })
  )
  capLogo.position.set(0, 0.16, 0.33)
  head.add(capLogo)

  const rShoulder = new THREE.Object3D()
  rShoulder.position.set(0.28, 0.95, 0)
  torso.add(rShoulder)
  const rUpper = makeCyl(0.13, 0.74, UNI_P)
  rShoulder.add(rUpper)
  const rCuff = makeCyl(0.135, 0.055, WHITE, false)
  rCuff.position.y = -0.68
  rShoulder.add(rCuff)
  const rElbow = new THREE.Object3D()
  rElbow.position.y = -0.74
  rUpper.add(rElbow)
  const rFore = makeCyl(0.11, 0.66, SKIN)
  rElbow.add(rFore)
  const rHand = makeSph(0.12, SKIN)
  rHand.position.set(0, -0.68, 0)
  rFore.add(rHand)
  const handBall = makeSph(0.10, 0xffffff)
  handBall.position.set(0, -0.12, 0)
  rHand.add(handBall)

  const lShoulder = new THREE.Object3D()
  lShoulder.position.set(-0.28, 0.95, 0)
  torso.add(lShoulder)
  const lUpper = makeCyl(0.13, 0.74, UNI_P)
  lShoulder.add(lUpper)
  const lCuff = makeCyl(0.135, 0.055, WHITE, false)
  lCuff.position.y = -0.68
  lShoulder.add(lCuff)
  const lElbow = new THREE.Object3D()
  lElbow.position.y = -0.74
  lUpper.add(lElbow)
  const lFore = makeCyl(0.11, 0.65, UNI_P)
  lElbow.add(lFore)
  const glove = makeSph(0.19, GLOVE)
  glove.position.set(0, -0.67, 0)
  glove.scale.set(1.15, 0.85, 1.35)
  lFore.add(glove)
  const pocket = new THREE.Mesh(
    new THREE.TorusGeometry(0.12, 0.018, 6, 14),
    new THREE.MeshBasicMaterial({ color: 0x3f1f08, transparent: true, opacity: 0.8 })
  )
  pocket.rotation.x = Math.PI / 2
  pocket.position.set(0, -0.67, 0.05)
  lFore.add(pocket)

  return {
    root, hips, torso,
    rShoulder, rElbow,
    lShoulder, lElbow,
    lHip: lLeg.hip, lKnee: lLeg.knee,
    rHip: rLeg.hip, rKnee: rLeg.knee,
    handBall,
  }
}

// ── Pitcher poses ──────────────────────────────────────────────────────────
interface Pose {
  hips: [number,number,number]; torso: [number,number,number]
  rShoulder: [number,number,number]; rElbow: [number,number,number]
  lShoulder: [number,number,number]; lElbow: [number,number,number]
  lHip: [number,number,number]; lKnee: [number,number,number]
  rHip: [number,number,number]; rKnee: [number,number,number]
}

const P_SET: Pose    = { hips:[0,.1,0],    torso:[.05,0,0],    rShoulder:[-.3,0,.4],   rElbow:[.6,0,0],  lShoulder:[-.5,0,-.7],  lElbow:[1.2,0,0], lHip:[0,0,0],    lKnee:[0,0,0],   rHip:[0,0,0],   rKnee:[.1,0,0]  }
const P_WIND: Pose   = { hips:[0,.3,.05],  torso:[.1,-.1,.1],  rShoulder:[-1.6,0,.5],  rElbow:[1.4,0,0], lShoulder:[-.3,0,-.9],  lElbow:[.8,0,0],  lHip:[-1.3,0,0], lKnee:[1.5,0,0], rHip:[-.2,0,0], rKnee:[.25,0,0] }
const P_REL: Pose    = { hips:[.05,-.3,-.1],torso:[.4,-.2,-.25],rShoulder:[1.3,0,-.6], rElbow:[-.1,0,0], lShoulder:[.3,0,-.4],   lElbow:[.6,0,0],  lHip:[.9,0,-.05],lKnee:[.2,0,0],  rHip:[.1,0,0],  rKnee:[.1,0,0]  }
const P_FOLLOW: Pose = { hips:[.1,-.5,-.15],torso:[.9,-.2,-.4], rShoulder:[2.2,0,-1.0], rElbow:[.6,0,0], lShoulder:[.5,0,-.2],   lElbow:[.4,0,0],  lHip:[1.4,0,-.05],lKnee:[.1,0,0],rHip:[.5,0,.1], rKnee:[.3,0,0]  }
const POSES = { set:P_SET, wind:P_WIND, rel:P_REL, fol:P_FOLLOW }

function ss(x: number) { return x*x*(3-2*x) }
function easeOutCubic(x: number) { return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3) }
function lerp3(a:[number,number,number], b:[number,number,number], t:number):[number,number,number] {
  return [a[0]+(b[0]-a[0])*t, a[1]+(b[1]-a[1])*t, a[2]+(b[2]-a[2])*t]
}
function applyPose(r: PitcherRig, p: Pose) {
  const s = (o:THREE.Object3D, v:[number,number,number]) => o.rotation.set(v[0],v[1],v[2])
  s(r.hips,p.hips); s(r.torso,p.torso)
  s(r.rShoulder,p.rShoulder); s(r.rElbow,p.rElbow)
  s(r.lShoulder,p.lShoulder); s(r.lElbow,p.lElbow)
  s(r.lHip,p.lHip); s(r.lKnee,p.lKnee)
  s(r.rHip,p.rHip); s(r.rKnee,p.rKnee)
}
function blendPose(r: PitcherRig, a: Pose, b: Pose, t: number) {
  const x = ss(Math.max(0,Math.min(1,t)))
  const keys: (keyof Pose)[] = ["hips","torso","rShoulder","rElbow","lShoulder","lElbow","lHip","lKnee","rHip","rKnee"]
  const out: Partial<Pose> = {}
  for (const k of keys) out[k] = lerp3(a[k], b[k], x)
  applyPose(r, out as Pose)
}

// ── Batter ─────────────────────────────────────────────────────────────────
function buildBatter(batHand: "L" | "R"): THREE.Group {
  const root = new THREE.Group()
  const handedness = batHand === "L" ? -1 : 1
  root.scale.set(1.18 * handedness, 1.35, 1.18)
  root.rotation.z = -0.08

  const addLimb = (a: THREE.Vector3, b: THREE.Vector3, r: number, color: number) => {
    root.add(makeSegment(a, b, r, color))
  }

  addLimb(new THREE.Vector3(-0.18, -0.04, -0.02), new THREE.Vector3(-0.34, -0.62, -0.08), 0.10, PANT_B)
  addLimb(new THREE.Vector3( 0.19, -0.04,  0.03), new THREE.Vector3( 0.34, -0.62,  0.10), 0.10, PANT_B)

  const backFoot = makeBox(0.34, 0.10, 0.20, SHOE)
  backFoot.position.set(-0.39, -0.66, 0.03)
  backFoot.rotation.y = -0.35
  root.add(backFoot)
  const frontFoot = makeBox(0.34, 0.10, 0.20, SHOE)
  frontFoot.position.set(0.38, -0.66, 0.16)
  frontFoot.rotation.y = 0.28
  root.add(frontFoot)

  const body = new THREE.Mesh(
    new THREE.CylinderGeometry(0.23, 0.30, 0.92, 10),
    new THREE.MeshPhongMaterial({ color: UNI_B, shininess: 28 })
  )
  body.scale.set(1, 1, 0.72)
  body.position.set(0, 0.34, 0.02)
  body.rotation.x = 0.10
  root.add(body)

  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 10, 8),
    new THREE.MeshPhongMaterial({ color: SKIN, shininess: 22 })
  )
  head.position.set(0.02, 0.99, 0.05)
  root.add(head)
  addFace(head)

  const helmet = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 6),
    new THREE.MeshPhongMaterial({ color: HELMET, shininess: 38 })
  )
  helmet.scale.set(1.08, 0.58, 1)
  helmet.position.set(0.02, 1.13, 0.04)
  root.add(helmet)
  const brim = makeBox(0.40, 0.045, 0.18, HELMET)
  brim.position.set(0.02, 1.10, 0.28)
  brim.rotation.x = -0.08
  root.add(brim)

  const rearShoulder = new THREE.Vector3(-0.22, 0.74, 0.05)
  const leadShoulder = new THREE.Vector3(0.22, 0.70, 0.07)
  const grip = new THREE.Vector3(-0.18, 0.78, 0.55)
  addLimb(rearShoulder, new THREE.Vector3(-0.32, 0.62, 0.32), 0.065, UNI_B)
  addLimb(new THREE.Vector3(-0.32, 0.62, 0.32), grip, 0.055, SKIN)
  addLimb(leadShoulder, new THREE.Vector3(0.06, 0.67, 0.35), 0.065, UNI_B)
  addLimb(new THREE.Vector3(0.06, 0.67, 0.35), new THREE.Vector3(-0.10, 0.76, 0.54), 0.055, SKIN)

  const rearHand = makeSph(0.075, SKIN)
  rearHand.position.copy(grip)
  root.add(rearHand)
  const leadHand = makeSph(0.068, SKIN)
  leadHand.position.set(-0.10, 0.76, 0.54)
  root.add(leadHand)

  const batKnobPos = new THREE.Vector3(-0.23, 0.73, 0.56)
  const batBarrelPos = new THREE.Vector3(-0.08, 1.36, 0.74)
  root.add(makeSegment(batKnobPos, batBarrelPos, 0.045, BAT_B))
  const knob = makeSph(0.06, BAT_H)
  knob.position.copy(batKnobPos)
  root.add(knob)

  return root
}

// ── Physics pitch trajectory ───────────────────────────────────────────────
function computePitchPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  mx: number,
  _mz: number,
  velo: number,
  nPts = 24
): THREE.Vector3[] {
  const veloFps    = Math.max(velo, 60) * 1.4667
  const flightTime = 60.5 / veloFps
  const GRAVITY = 32.2
  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= nPts; i++) {
    const t  = i / nPts
    const ts = t * flightTime
    const bx = start.x + (end.x - start.x) * t
    const by = start.y + (end.y - start.y) * t
    const bz = start.z + (end.z - start.z) * t
    const gravArc = 0.5 * GRAVITY * ts * (flightTime - ts) * 0.55
    const extraX  = (t * t * t - t) * mx * 0.45
    pts.push(new THREE.Vector3(bx + extraX, by + gravArc, bz))
  }
  return pts
}

function arcLengths(pts: THREE.Vector3[]): number[] {
  const lens = [0]
  for (let i = 1; i < pts.length; i++)
    lens.push(lens[i-1] + pts[i].distanceTo(pts[i-1]))
  return lens
}

function samplePath(pts: THREE.Vector3[], lens: number[], t: number): THREE.Vector3 {
  const target = t * lens[lens.length - 1]
  let seg = 0
  for (let i = 1; i < lens.length; i++) {
    if (lens[i] >= target) { seg = i - 1; break }
    seg = i - 1
  }
  const frac = lens[seg+1] > lens[seg]
    ? (target - lens[seg]) / (lens[seg+1] - lens[seg])
    : 0
  return pts[seg].clone().lerp(pts[Math.min(seg+1, pts.length-1)], frac)
}

// ── Pitch label sprite ─────────────────────────────────────────────────────
const PITCH_FULL: Record<string, string> = {
  fastball: "Fastball", cutter: "Cutter", sinker: "Sinker",
  curveball: "Curveball", slider: "Slider", changeup: "Changeup", splitter: "Splitter",
}

function makePitchLabel(pitchType: string, veloMph: number): THREE.Sprite {
  const kmh  = Math.round(veloMph * 1.60934)
  const name = PITCH_FULL[pitchType.toLowerCase()] ?? pitchType
  const hexColor = `#${pitchColor(pitchType).toString(16).padStart(6, "0")}`
  const W = 180, H = 44
  const canvas = document.createElement("canvas")
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = "rgba(0,0,0,0.70)"
  ctx.fillRect(2, 2, W - 4, H - 4)
  ctx.font = "bold 18px sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(`${kmh} km/h`, W / 2, 14)
  ctx.font = "bold 14px sans-serif"
  ctx.fillStyle = hexColor
  ctx.fillText(name, W / 2, 32)
  const tex = new THREE.CanvasTexture(canvas)
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  spr.scale.set(1.0, 0.24, 1)
  return spr
}

// ── Component ──────────────────────────────────────────────────────────────
type AnimState = {
  active: boolean; startTime: number; duration: number
  path: THREE.Vector3[]; lens: number[]
  ballColor: number; pendingDot: PitchDot | null
  pendingSwing: SwingInfo | null
  pendingPlayResult: string
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

export default function StrikeZoneView({
  history,
  incoming,
  batHand = "R",
  pitchHand = "R",
  playResult,
  swing,
  announcement,
}: {
  history: PitchDot[]
  incoming?: PitchDot
  batHand?: "L" | "R"
  pitchHand?: "L" | "R"
  playResult?: string
  swing?: SwingInfo | null
  announcement?: Announcement | null
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const dotsRef  = useRef<THREE.Group | null>(null)
  const ballRef  = useRef<THREE.Mesh | null>(null)
  const rigRef   = useRef<PitcherRig | null>(null)
  const animRef  = useRef<AnimState>({
    active: false, startTime: 0, duration: 520,
    path: [], lens: [],
    ballColor: 0xffffff, pendingDot: null,
    pendingSwing: null, pendingPlayResult: "",
  })
  const rafRef    = useRef<number>(0)
  const swingRef  = useRef<SwingInfo | null>(null)
  swingRef.current = swing ?? null  // always sync, no effect needed
  const [outcomeLabel, setOutcomeLabel] = useState<string | null>(null)
  const [swingDisplay, setSwingDisplay] = useState<SwingInfo | null>(null)
  const setOutcomeRef = useRef(setOutcomeLabel)
  const setSwingRef   = useRef(setSwingDisplay)
  useEffect(() => { setOutcomeRef.current = setOutcomeLabel }, [setOutcomeLabel])
  useEffect(() => { setSwingRef.current   = setSwingDisplay }, [setSwingDisplay])

  // Keep pendingSwing up to date when swing info arrives after animation started
  // (separate from the animation trigger so swing changes don't restart the animation)
  useEffect(() => {
    animRef.current.pendingSwing = swing ?? null
  }, [swing])

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth  || 854
    const H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x060c18, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    const sx = batHand === "L" ? -1 : 1
    const pitchSide = pitchHand === "L" ? -1 : 1
    const pitcherX = 0.2 * pitchSide
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 200)
    camera.position.set(sx * 0.8, 1.3, 4.6)
    camera.lookAt(sx * -0.4, 1.1, -18)

    const resize = () => {
      const w = el.clientWidth || 854
      const h = el.clientHeight || 480
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    resizeObserver?.observe(el)

    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xffe4c8, 1.0)
    sun.position.set(8, 15, 5)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xaabbff, 0.45)
    fill.position.set(-5, 4, 8)
    scene.add(fill)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 90),
      new THREE.MeshPhongMaterial({ color: 0x1a3d1a })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, 0, -20)
    scene.add(ground)

    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshPhongMaterial({ color: 0x6b3f1c })
    )
    box.rotation.x = -Math.PI / 2
    box.position.set(0, 0.01, 0.5)
    scene.add(box)

    const moundDome = new THREE.Mesh(
      new THREE.SphereGeometry(17, 14, 8),
      new THREE.MeshPhongMaterial({ color: 0x5c3317 })
    )
    moundDome.position.set(0.1, -16.25, PITCH_Z)
    scene.add(moundDome)
    const rubber = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.15),
      new THREE.MeshPhongMaterial({ color: 0xeeeeee })
    )
    rubber.position.set(0.1, 0.76, PITCH_Z + 1.1)
    scene.add(rubber)

    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.71,0.03,0.3), new THREE.Vector3(0.71,0.03,0.3),
      new THREE.Vector3(0.71,0.03,0),   new THREE.Vector3(0,0.03,-0.22),
      new THREE.Vector3(-0.71,0.03,0),  new THREE.Vector3(-0.71,0.03,0.3),
    ]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })))

    const zoneFill = new THREE.Mesh(
      new THREE.PlaneGeometry(ZR - ZL, ZT - ZB),
      new THREE.MeshBasicMaterial({ color: 0xd97706, transparent: true, opacity: 0.14, side: THREE.DoubleSide })
    )
    zoneFill.position.set(0, (ZB+ZT)/2, 0.02)
    scene.add(zoneFill)

    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(ZL,ZB,0), new THREE.Vector3(ZR,ZB,0),
      new THREE.Vector3(ZR,ZT,0), new THREE.Vector3(ZL,ZT,0),
      new THREE.Vector3(ZL,ZB,0),
    ]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.65 })))

    const gm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.2 })
    for (let i = 1; i < 3; i++) {
      const x = ZL+(ZR-ZL)/3*i, y = ZB+(ZT-ZB)/3*i
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(x,ZB,0), new THREE.Vector3(x,ZT,0)]), gm))
      scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(
        [new THREE.Vector3(ZL,y,0), new THREE.Vector3(ZR,y,0)]), gm))
    }

    const rig = buildPitcher(pitchHand)
    rig.root.position.set(pitcherX, 1.78, PITCH_Z + 0.5)
    scene.add(rig.root)
    applyPose(rig, P_SET)
    rigRef.current = rig

    const batter = buildBatter(batHand)
    batter.position.set(sx * -1.1, 0.9, 0.9)
    batter.rotation.y = sx * Math.PI * 0.55
    scene.add(batter)

    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 10, 8),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222 })
    )
    ball.visible = false
    scene.add(ball)
    ballRef.current = ball

    const seamMat = new THREE.MeshBasicMaterial({ color: 0xb91c1c, transparent: true, opacity: 0.9 })
    const seamA = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.006, 4, 16), seamMat)
    const seamB = new THREE.Mesh(new THREE.TorusGeometry(0.148, 0.006, 4, 16), seamMat)
    seamA.rotation.set(Math.PI / 2, 0.45, 0)
    seamB.rotation.set(Math.PI / 2, -0.45, Math.PI / 2)
    ball.add(seamA, seamB)

    const trailSize = 10
    const trailPositions = new Float32Array(trailSize * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3))
    trailGeo.setDrawRange(0, 0)
    const trail = new THREE.Line(
      trailGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32 })
    )
    scene.add(trail)

    const dotsGroup = new THREE.Group()
    scene.add(dotsGroup)
    dotsRef.current = dotsGroup

    const impactRing = new THREE.Mesh(
      new THREE.RingGeometry(0.13, 0.25, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide })
    )
    impactRing.position.z = 0.06
    scene.add(impactRing)
    let impactStart = -1000

    // Render loop — 30fps active, ~0fps idle
    const anim = animRef.current
    let lastRender = 0
    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate)
      if (el.offsetParent === null) return
      const isAnimating = anim.active || (now - impactStart) < 400
      const minInterval = isAnimating ? 50 : 2000
      if (now - lastRender < minInterval) return
      lastRender = now

      const r = rigRef.current
      if (!r) { renderer.render(scene, camera); return }

      if (anim.active) {
        const t = Math.min(1, (now - anim.startTime) / anim.duration)

        if (t < 0.35)      blendPose(r, POSES.set,  POSES.wind, t / 0.35)
        else if (t < 0.72) blendPose(r, POSES.wind, POSES.rel,  (t-0.35)/0.37)
        else               blendPose(r, POSES.rel,  POSES.fol,  (t-0.72)/0.28)

        const drive = easeOutCubic(t)
        r.root.position.set(pitcherX - pitchSide * 0.12 * drive, 1.78 - 0.18 * Math.max(0, t - 0.4), PITCH_Z + 0.5 + 1.05 * drive)
        r.root.rotation.y = -pitchSide * 0.22 * drive

        if (t >= 0.35) {
          const bt = (t - 0.35) / 0.65
          const pos = samplePath(anim.path, anim.lens, bt)
          ball.position.copy(pos)
          ball.rotation.x += 0.9
          ball.rotation.y += 0.55
          ;(ball.material as THREE.MeshPhongMaterial).color.setHex(anim.ballColor)
          ball.visible = true
          r.handBall.visible = false
          for (let i = 0; i < trailSize; i++) {
            const st = Math.max(0, bt - (trailSize - i) * 0.009)
            const p = samplePath(anim.path, anim.lens, st)
            trailPositions[i * 3] = p.x
            trailPositions[i * 3 + 1] = p.y
            trailPositions[i * 3 + 2] = p.z
          }
          trailGeo.attributes.position.needsUpdate = true
          trailGeo.setDrawRange(0, trailSize)
        } else {
          ball.visible = false
          r.handBall.visible = true
          trailGeo.setDrawRange(0, 0)
        }

        if (t >= 1) {
          anim.active = false
          ball.visible = false
          r.handBall.visible = true
          trailGeo.setDrawRange(0, 0)
          r.root.position.set(pitcherX, 1.78, PITCH_Z + 0.5)
          r.root.rotation.set(0, 0, 0)
          applyPose(r, P_SET)
          if (anim.pendingDot) {
            impactRing.position.set(anim.pendingDot.px, mapPz(anim.pendingDot.pz), 0.06)
            impactRing.scale.setScalar(0.65)
            impactStart = now
            addDot(dotsGroup, anim.pendingDot)
            const oc = anim.pendingDot.outcome.toLowerCase()
            const pr = anim.pendingPlayResult.toLowerCase()
            const isStrikeout = pr.includes("strikes out") || pr.includes("strikeout") || pr.includes("strike out")
            const isWalk = pr.includes("walk")
            const label =
              isStrikeout        ? "STRIKEOUT"
              : isWalk           ? "FOUR BALL"
              : oc === "ball"    ? "BALL"
              : oc === "foul"    ? "FOUL"
              : oc === "in play" ? null
              : "STRIKE"
            setOutcomeRef.current(label)
            setSwingRef.current(anim.pendingSwing)
            anim.pendingDot = null
          }
        }
      }

      const impactT = Math.min(1, Math.max(0, (now - impactStart) / 360))
      if (impactT < 1) {
        impactRing.scale.setScalar(0.65 + impactT * 1.4)
        ;(impactRing.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - impactT)
      } else {
        ;(impactRing.material as THREE.MeshBasicMaterial).opacity = 0
      }

      renderer.render(scene, camera)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      resizeObserver?.disconnect()
      renderer.dispose()
      el.removeChild(renderer.domElement)
      dotsRef.current = null; ballRef.current = null; rigRef.current = null
    }
  }, [batHand, pitchHand])

  useEffect(() => {
    const g = dotsRef.current
    if (!g) return
    while (g.children.length) g.remove(g.children[0])
    for (const d of history) addDot(g, d)
  }, [history])

  useEffect(() => {
    if (!incoming) return
    setOutcomeLabel(null)
    setSwingDisplay(null)
    const anim  = animRef.current
    const color = pitchColor(incoming.pitchType)
    const mx    = incoming.mx   ?? 0
    const mz    = incoming.mz   ?? 0
    const velo  = incoming.velo ?? 90

    const pitchSide = pitchHand === "L" ? -1 : 1
    const start = new THREE.Vector3(0.25 * pitchSide, REL_Y, PITCH_Z + 1.0)
    const end   = new THREE.Vector3(incoming.px, mapPz(incoming.pz), 0)

    const path = computePitchPath(start, end, mx, mz, velo)
    const lens = arcLengths(path)

    const veloFps   = velo * 1.4667
    const flightSec = 60.5 / veloFps
    const isFast    = ["fastball", "sinker", "cutter"].includes(incoming.pitchType.toLowerCase())
    const mult      = isFast ? 1.18 : 1.42
    const duration  = Math.max(760, Math.round(flightSec * 1000 * mult))

    anim.path              = path
    anim.lens              = lens
    anim.ballColor         = color
    anim.duration          = duration
    anim.startTime         = performance.now()
    anim.active            = true
    anim.pendingDot        = incoming
    anim.pendingSwing      = swingRef.current
    anim.pendingPlayResult = playResult ?? ""
  }, [incoming, pitchHand, playResult])  // swing removed: handled by separate effect + swingRef

  const outcomeMeta: Record<string, { color: string; shadow: string }> = {
    STRIKE:    { color: "#f87171", shadow: "#7f1d1d" },
    BALL:      { color: "#60a5fa", shadow: "#1e3a8a" },
    FOUL:      { color: "#facc15", shadow: "#78350f" },
    STRIKEOUT: { color: "#f87171", shadow: "#7f1d1d" },
    "FOUR BALL": { color: "#60a5fa", shadow: "#1e3a8a" },
  }
  const om = outcomeLabel ? outcomeMeta[outcomeLabel] : null
  const swingOnlyLabel = !outcomeLabel && swingDisplay ? swingDisplay.label : null
  const showPitchOverlay = (outcomeLabel && om) || swingOnlyLabel

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} className="overflow-hidden" />

      {/* Pitch outcome overlay: STRIKE / BALL / STRIKEOUT etc. */}
      {showPitchOverlay && (
        <div
          className="absolute top-[8%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-3 pointer-events-none"
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

      {/* Announcement overlay: STOLEN BASE / PITCHING CHANGE / PICKOFF etc. */}
      {!showPitchOverlay && announcement && (
        <div
          className="absolute top-[8%] left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 pointer-events-none"
          style={{ animation: "fadeInPop 0.18s ease-out forwards" }}
        >
          <span
            className="font-black tracking-widest select-none whitespace-nowrap"
            style={{
              fontSize: "2.4rem",
              color: announcement.color,
              textShadow: `0 0 22px ${announcement.color}88, 0 2px 8px rgba(0,0,0,0.95)`,
              opacity: 0.95,
            }}
          >
            {announcement.label}
          </span>
          {announcement.sub && (
            <span
              className="font-bold select-none whitespace-nowrap"
              style={{
                fontSize: "1.1rem",
                color: "#e2e8f0",
                textShadow: "0 2px 6px rgba(0,0,0,0.9)",
              }}
            >
              {announcement.sub}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function addDot(group: THREE.Group, dot: PitchDot) {
  const x = dot.px, y = mapPz(dot.pz)
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(0.08, 10, 10),
    new THREE.MeshBasicMaterial({ color: pitchColor(dot.pitchType), transparent: true, opacity: 0.85 })
  )
  m.position.set(x, y, 0.03)
  group.add(m)

  if (dot.velo) {
    const label = makePitchLabel(dot.pitchType, dot.velo)
    label.position.set(x, y + 0.22, 0.05)
    group.add(label)
  }
}
