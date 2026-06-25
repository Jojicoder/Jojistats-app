import { useEffect, useRef } from "react"
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
// Engine pitch coords (real baseball feet) → visual zone mapping
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

function mat(color: number) { return new THREE.MeshPhongMaterial({ color }) }

function makeCyl(r: number, h: number, color: number, pivotTop = true): THREE.Group {
  const g = new THREE.Group()
  const geo = new THREE.CylinderGeometry(r * 0.9, r, h, 8)
  if (pivotTop) geo.translate(0, -h / 2, 0)
  g.add(new THREE.Mesh(geo, mat(color)))
  return g
}

function makeSph(r: number, color: number): THREE.Mesh {
  return new THREE.Mesh(new THREE.SphereGeometry(r, 10, 10), mat(color))
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

function buildPitcher(): PitcherRig {
  const root = new THREE.Object3D()
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
    knee.add(foot)
    return { hip, knee }
  }
  const rLeg = mkLeg(1), lLeg = mkLeg(-1)

  const torso = new THREE.Object3D()
  torso.position.set(0, 0.05, 0)
  hips.add(torso)
  const hipMesh = makeCyl(0.28, 0.32, PANT_P, false)
  hipMesh.position.set(0, -0.14, 0)
  hips.add(hipMesh)
  torso.add(makeCyl(0.26, 1.05, UNI_P))

  const neck = makeCyl(0.11, 0.18, SKIN)
  neck.position.set(0, 1.05, 0)
  torso.add(neck)
  const head = makeSph(0.32, SKIN)
  head.position.set(0, -0.09, 0)
  neck.add(head)
  const capT = makeSph(0.34, CAP)
  capT.position.y = 0.20
  head.add(capT)
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.40, 0.05, 12), mat(CAP))
  brim.position.set(0, 0.07, 0.20)
  head.add(brim)

  const rShoulder = new THREE.Object3D()
  rShoulder.position.set(0.28, 0.95, 0)
  torso.add(rShoulder)
  const rUpper = makeCyl(0.13, 0.74, UNI_P)
  rShoulder.add(rUpper)
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
  const lElbow = new THREE.Object3D()
  lElbow.position.y = -0.74
  lUpper.add(lElbow)
  const lFore = makeCyl(0.11, 0.65, UNI_P)
  lElbow.add(lFore)
  const glove = makeSph(0.19, GLOVE)
  glove.position.set(0, -0.67, 0)
  lFore.add(glove)

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

// ── Batter (static RHB) ────────────────────────────────────────────────────
function buildBatter(): THREE.Group {
  const root = new THREE.Group()

  const mkLeg = (side: number, hipRx: number, kneeRx: number) => {
    const hip = new THREE.Group()
    hip.position.set(side * 0.38, 0, 0)
    hip.rotation.x = hipRx
    root.add(hip)
    const thigh = makeCyl(0.21, 0.92, PANT_B)
    hip.add(thigh)
    const knee = new THREE.Group()
    knee.position.y = -0.92
    knee.rotation.x = kneeRx
    thigh.add(knee)
    const shin = makeCyl(0.17, 0.82, PANT_B)
    knee.add(shin)
    const foot = makeCyl(0.15, 0.28, SHOE, false)
    foot.position.set(side * 0.03, -0.82, 0.12)
    knee.add(foot)
  }
  mkLeg( 1, 0.15, 0.55)   // right leg (back)
  mkLeg(-1, 0.20, 0.45)   // left leg (front)

  const hipM = makeCyl(0.29, 0.33, PANT_B, false)
  hipM.position.set(0, -0.14, 0)
  root.add(hipM)

  const torso = new THREE.Group()
  torso.position.set(0, 0.04, 0)
  torso.rotation.set(0.08, 0.2, -0.06)
  root.add(torso)
  torso.add(makeCyl(0.27, 1.08, UNI_B))

  // number on back (simple stripe)
  const stripe = new THREE.Mesh(
    new THREE.PlaneGeometry(0.30, 0.45),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
  )
  stripe.position.set(0, -0.25, -0.26)
  torso.add(stripe)

  const neck = makeCyl(0.11, 0.17, SKIN)
  neck.position.set(0, 1.08, 0)
  torso.add(neck)

  const head = makeSph(0.32, SKIN)
  head.position.set(0, -0.09, 0)
  head.rotation.y = -0.9
  neck.add(head)

  const helmetT = makeSph(0.35, HELMET)
  helmetT.position.y = 0.19
  head.add(helmetT)
  const helmetBrim = new THREE.Mesh(
    new THREE.CylinderGeometry(0.41, 0.39, 0.055, 12), mat(HELMET))
  helmetBrim.position.set(0, 0.06, 0.20)
  head.add(helmetBrim)

  // back arm (right = dominant for RHB)
  const rSh = new THREE.Group()
  rSh.position.set(0.29, 0.93, 0)
  rSh.rotation.set(-1.0, 0, 0.38)
  torso.add(rSh)
  const rUp = makeCyl(0.13, 0.74, UNI_B)
  rSh.add(rUp)
  const rEl = new THREE.Group()
  rEl.position.y = -0.74; rEl.rotation.x = 1.35
  rUp.add(rEl)
  const rFo = makeCyl(0.11, 0.66, SKIN)
  rEl.add(rFo)
  const rHd = makeSph(0.12, SKIN)
  rHd.position.set(0, -0.68, 0)
  rFo.add(rHd)

  // bat
  const batG = new THREE.Group()
  batG.position.set(0, -0.06, 0)
  batG.rotation.set(-0.35, 0.2, 0.15)
  rHd.add(batG)
  const batHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.045, 1.05, 8), mat(BAT_H))
  batHandle.position.y = 0.52
  batG.add(batHandle)
  const batBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.10, 0.055, 1.75, 8), mat(BAT_B))
  batBarrel.position.y = 1.95
  batG.add(batBarrel)
  const batKnob = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 8), mat(BAT_H))
  batKnob.position.y = -0.02
  batG.add(batKnob)

  // front arm (left)
  const lSh = new THREE.Group()
  lSh.position.set(-0.29, 0.93, 0)
  lSh.rotation.set(-0.75, 0, -0.42)
  torso.add(lSh)
  const lUp = makeCyl(0.13, 0.74, UNI_B)
  lSh.add(lUp)
  const lEl = new THREE.Group()
  lEl.position.y = -0.74; lEl.rotation.x = 1.05
  lUp.add(lEl)
  const lFo = makeCyl(0.11, 0.65, SKIN)
  lEl.add(lFo)
  const lHd = makeSph(0.12, SKIN)
  lHd.position.set(0, -0.67, 0)
  lFo.add(lHd)

  return root
}

// ── Physics pitch trajectory ───────────────────────────────────────────────
// Generates N+1 points from release to plate with realistic gravity arc and
// late-breaking Magnus effect.
function computePitchPath(
  start: THREE.Vector3,
  end: THREE.Vector3,
  mx: number,   // horizontal break (ft)
  _mz: number,  // vertical break already encoded in end.y — not used for mid-flight
  velo: number, // mph
  nPts = 32
): THREE.Vector3[] {
  // Real flight time (60.5ft mound-to-plate at given velocity)
  const veloFps   = Math.max(velo, 60) * 1.4667
  const flightTime = 60.5 / veloFps   // ~0.44s at 90mph

  const GRAVITY = 32.2  // ft/s²

  const pts: THREE.Vector3[] = []
  for (let i = 0; i <= nPts; i++) {
    const t  = i / nPts
    const ts = t * flightTime

    // Linear base (start → end already encodes all movement + gravity endpoint)
    const bx = start.x + (end.x - start.x) * t
    const by = start.y + (end.y - start.y) * t
    const bz = start.z + (end.z - start.z) * t

    // Gravity arc: pitched balls travel ABOVE the straight line at midpoint
    // because initial vertical velocity is small (pitch is mostly horizontal).
    // Physics: deviation = 0.5 * g * ts * (T - ts), peaks at midpoint.
    // This is always non-negative → ball never rises above start or below end.
    const gravArc = 0.5 * GRAVITY * ts * (flightTime - ts) * 0.55

    // Late horizontal break: redistribute mx so break is felt more near plate.
    // (t³ - t) is 0 at endpoints, minimum at t≈0.58 → deviation then snap.
    const extraX = (t * t * t - t) * mx * 0.45

    pts.push(new THREE.Vector3(bx + extraX, by + gravArc, bz))
  }
  return pts
}

// Arc-length cumulative distances for smooth interpolation
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
const PITCH_ABBR: Record<string, string> = {
  fastball: "FB", cutter: "CT", sinker: "SI",
  curveball: "CU", slider: "SL", changeup: "CH", splitter: "SP",
}

function makePitchLabel(pitchType: string, veloMph: number): THREE.Sprite {
  const kmh  = Math.round(veloMph * 1.60934)
  const abbr = PITCH_ABBR[pitchType.toLowerCase()] ?? pitchType.slice(0, 2).toUpperCase()
  const hexColor = `#${pitchColor(pitchType).toString(16).padStart(6, "0")}`

  const W = 128, H = 44
  const canvas = document.createElement("canvas")
  canvas.width = W; canvas.height = H
  const ctx = canvas.getContext("2d")!
  ctx.clearRect(0, 0, W, H)

  // Background
  ctx.fillStyle = "rgba(0,0,0,0.70)"
  ctx.fillRect(2, 2, W - 4, H - 4)

  // Speed
  ctx.font = "bold 18px sans-serif"
  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(`${kmh} km/h`, W / 2, 16)

  // Pitch type
  ctx.font = "bold 13px sans-serif"
  ctx.fillStyle = hexColor
  ctx.fillText(abbr, W / 2, 32)

  const tex = new THREE.CanvasTexture(canvas)
  const spr = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }))
  spr.scale.set(0.7, 0.24, 1)
  return spr
}

// ── Component ──────────────────────────────────────────────────────────────
type AnimState = {
  active: boolean; startTime: number; duration: number
  path: THREE.Vector3[]; lens: number[]
  ballColor: number; pendingDot: PitchDot | null
}

export default function StrikeZoneView({
  history,
  incoming,
  batHand = "R",
}: {
  history: PitchDot[]
  incoming?: PitchDot
  batHand?: "L" | "R"
}) {
  const mountRef = useRef<HTMLDivElement>(null)
  const dotsRef  = useRef<THREE.Group | null>(null)
  const ballRef  = useRef<THREE.Mesh | null>(null)
  const rigRef   = useRef<PitcherRig | null>(null)
  const animRef  = useRef<AnimState>({
    active: false, startTime: 0, duration: 520,
    path: [], lens: [],
    ballColor: 0xffffff, pendingDot: null,
  })
  const rafRef = useRef<number>(0)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth  || 854
    const H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x060c18, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.fog = new THREE.Fog(0x060c18, 28, 70)

    // Camera: behind batter's rear shoulder, waist height (Pro Spirits style)
    // RHB → camera on 1st base side (+X); LHB → 3rd base side (-X)
    const sx = batHand === "L" ? -1 : 1
    const camera = new THREE.PerspectiveCamera(52, W / H, 0.1, 200)
    // Do not change camera position (sx * 0.8, 1.5, 4.6) is best
    camera.position.set(sx * 0.8, 1.3, 4.6)
    camera.lookAt(sx * -0.4, 2.2, -18)

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.5))
    const sun = new THREE.DirectionalLight(0xffe4c8, 1.0)
    sun.position.set(8, 15, 5)
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0xaabbff, 0.3)
    fill.position.set(-5, 4, 8)
    scene.add(fill)

    // Ground
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(50, 90),
      new THREE.MeshPhongMaterial({ color: 0x1a3d1a })
    )
    ground.rotation.x = -Math.PI / 2
    ground.position.set(0, 0, -20)
    scene.add(ground)

    // Batter's box dirt
    const box = new THREE.Mesh(
      new THREE.PlaneGeometry(8, 6),
      new THREE.MeshPhongMaterial({ color: 0x6b3f1c })
    )
    box.rotation.x = -Math.PI / 2
    box.position.set(0, 0.01, 0.5)
    scene.add(box)

    // Pitcher's mound — large sphere mostly underground, peak ~0.75ft above ground
    const moundDome = new THREE.Mesh(
      new THREE.SphereGeometry(17, 24, 14),
      new THREE.MeshPhongMaterial({ color: 0x5c3317 })
    )
    moundDome.position.set(0.1, -16.25, PITCH_Z)
    scene.add(moundDome)
    // Rubber on top of mound
    const rubber = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.15),
      new THREE.MeshPhongMaterial({ color: 0xeeeeee })
    )
    rubber.position.set(0.1, 0.76, PITCH_Z + 1.1)
    scene.add(rubber)

    // Home plate
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-0.71,0.03,0.3), new THREE.Vector3(0.71,0.03,0.3),
      new THREE.Vector3(0.71,0.03,0),   new THREE.Vector3(0,0.03,-0.22),
      new THREE.Vector3(-0.71,0.03,0),  new THREE.Vector3(-0.71,0.03,0.3),
    ]), new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 })))

    // Strike zone — amber fill + white outline + grid
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

    // Pitcher
    const rig = buildPitcher()
    rig.root.position.set(0.2, 1.78, PITCH_Z + 0.5)
    scene.add(rig.root)
    applyPose(rig, P_SET)
    rigRef.current = rig

    // Batter: RHB stands on 3rd base side (-X), LHB on 1st base side (+X)
    const batter = buildBatter()
    batter.position.set(sx * -1.1, 1.85, 0.9)
    // RHB chest faces 3rd base (+Y rotation); LHB chest faces 1st base (mirror)
    batter.rotation.y = sx * Math.PI * 0.55
    scene.add(batter)

    // Animated ball
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.145, 14, 14),
      new THREE.MeshPhongMaterial({ color: 0xffffff, emissive: 0x222222 })
    )
    ball.visible = false
    scene.add(ball)
    ballRef.current = ball

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.28, 10, 10),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.08, side: THREE.FrontSide })
    )
    ball.add(glow)

    // Dots
    const dotsGroup = new THREE.Group()
    scene.add(dotsGroup)
    dotsRef.current = dotsGroup

    // Render loop
    const anim = animRef.current
    const animate = (now: number) => {
      rafRef.current = requestAnimationFrame(animate)
      const r = rigRef.current
      if (!r) { renderer.render(scene, camera); return }

      if (anim.active) {
        const t = Math.min(1, (now - anim.startTime) / anim.duration)

        if (t < 0.35)      blendPose(r, POSES.set,  POSES.wind, t / 0.35)
        else if (t < 0.72) blendPose(r, POSES.wind, POSES.rel,  (t-0.35)/0.37)
        else               blendPose(r, POSES.rel,  POSES.fol,  (t-0.72)/0.28)

        if (t >= 0.35) {
          const bt = (t - 0.35) / 0.65
          const pos = samplePath(anim.path, anim.lens, bt)
          ball.position.copy(pos)
          ;(ball.material as THREE.MeshPhongMaterial).color.setHex(anim.ballColor)
          ball.visible = true
          r.handBall.visible = false
          ;(glow.material as THREE.MeshBasicMaterial).opacity = 0.12 * (1 - bt * 0.6)
        } else {
          ball.visible = false
          r.handBall.visible = true
        }

        if (t >= 1) {
          anim.active = false
          ball.visible = false
          r.handBall.visible = true
          applyPose(r, P_SET)
          if (anim.pendingDot) { addDot(dotsGroup, anim.pendingDot); anim.pendingDot = null }
        }
      }

      renderer.render(scene, camera)
    }
    rafRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(rafRef.current)
      renderer.dispose()
      el.removeChild(renderer.domElement)
      dotsRef.current = null; ballRef.current = null; rigRef.current = null
    }
  }, [batHand])

  useEffect(() => {
    const g = dotsRef.current
    if (!g) return
    while (g.children.length) g.remove(g.children[0])
    for (const d of history) addDot(g, d)
  }, [history])

  useEffect(() => {
    if (!incoming) return
    const anim  = animRef.current
    const color = pitchColor(incoming.pitchType)
    const mx   = incoming.mx   ?? 0
    const mz   = incoming.mz   ?? 0
    const velo = incoming.velo ?? 90

    const start = new THREE.Vector3(0.25, REL_Y, PITCH_Z + 1.0)
    const end   = new THREE.Vector3(incoming.px, mapPz(incoming.pz), 0)

    const path = computePitchPath(start, end, mx, mz, velo)
    const lens = arcLengths(path)

    // Duration: faster for hard pitches, slightly stretched for breaking balls
    const veloFps   = velo * 1.4667
    const flightSec = 60.5 / veloFps
    const isFast    = ["fastball", "sinker", "cutter"].includes(incoming.pitchType.toLowerCase())
    const mult      = isFast ? 0.80 : 1.10
    const duration  = Math.round(flightSec * 1000 * mult)

    anim.path       = path
    anim.lens       = lens
    anim.ballColor  = color
    anim.duration   = duration
    anim.startTime  = performance.now()
    anim.active     = true
    anim.pendingDot = incoming
  }, [incoming])

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} className="overflow-hidden" />
      <div className="flex flex-wrap gap-x-2 gap-y-0.5 justify-center">
        {Object.entries(PITCH_COLOR).map(([type, hex]) => (
          <span key={type} className="flex items-center gap-0.5 text-[9px] font-mono text-gray-400">
            <span className="inline-block h-2 w-2 rounded-full flex-shrink-0"
              style={{ backgroundColor: `#${hex.toString(16).padStart(6,"0")}` }} />
            {type.slice(0,4)}
          </span>
        ))}
      </div>
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
