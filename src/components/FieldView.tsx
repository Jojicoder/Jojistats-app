import { useEffect, useRef } from "react"
import * as THREE from "three"
import type { SwingInfo } from "./StrikeZoneView"

export type BallTraj = [number, number, number][]  // [x, y, z] engine feet

type Props = {
  traj: BallTraj
  exitVelo: number
  launchAngle: number
  sprayAngle: number
  result?: string
  swing?: SwingInfo | null
  defenders?: Partial<Record<string, string>>
  bases?: { first: string | null; second: string | null; third: string | null }
}

type LabelMeta = { text: string; color: string; shadow: string }

function resultLabel(result: string): { main: LabelMeta; isHit: boolean } | null {
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

// engine → Three.js:  X→X,  Y(depth)→-Z,  Z(height)→Y
function e2t(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, z, -y)
}

function easeOutCubic(x: number) {
  return 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 3)
}

function easeInOutCubic(x: number) {
  const t = Math.max(0, Math.min(1, x))
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

function isGroundBall(result: string | undefined, launchAngle: number) {
  const r = result?.toLowerCase() ?? ""
  return r.includes("ground") || launchAngle <= 8
}

function clampToFence(p: THREE.Vector3) {
  const center = new THREE.Vector3(0, 0, -25)
  const maxRadius = 360
  const flat = new THREE.Vector3(p.x, 0, p.z)
  const fromCenter = flat.clone().sub(center)
  if (fromCenter.length() > maxRadius) {
    fromCenter.setLength(maxRadius)
    flat.copy(center).add(fromCenter)
  }

  const maxFairX = Math.max(28, Math.abs(flat.z) + 18)
  flat.x = THREE.MathUtils.clamp(flat.x, -maxFairX, maxFairX)
  return flat
}

function makeRunner(color = 0xdc2626): THREE.Group {
  const root = new THREE.Group()

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 12),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  )
  dot.rotation.x = -Math.PI / 2
  dot.position.y = 0.45
  root.add(dot)

  const core = new THREE.Mesh(
    new THREE.CircleGeometry(2.6, 10),
    new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide, transparent: true, opacity: 0.9 })
  )
  core.rotation.x = -Math.PI / 2
  core.position.y = 0.5
  root.add(core)

  return root
}

type Fielder = {
  code: string
  role: string
  root: THREE.Group
  baseRing: THREE.Mesh
  start: THREE.Vector3
  target: THREE.Vector3
  active: boolean
}

function shortName(name: string) {
  const parts = name.trim().split(/\s+/)
  return parts.length > 1 ? parts.at(-1)! : name
}

function makeFielder(role: string, name: string, color = 0x2563eb): THREE.Group {
  const root = new THREE.Group()

  const dot = new THREE.Mesh(
    new THREE.CircleGeometry(5.5, 12),
    new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide })
  )
  dot.rotation.x = -Math.PI / 2
  dot.position.y = 0.45
  root.add(dot)

  const center = new THREE.Mesh(
    new THREE.CircleGeometry(2.3, 10),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe, side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
  )
  center.rotation.x = -Math.PI / 2
  center.position.y = 0.5
  root.add(center)

  const labelCanvas = document.createElement("canvas")
  labelCanvas.width = 128
  labelCanvas.height = 44
  const ctx = labelCanvas.getContext("2d")!
  ctx.fillStyle = "rgba(15,23,42,0.82)"
  ctx.roundRect?.(7, 4, 114, 36, 8)
  ctx.fill()
  ctx.font = "bold 24px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillStyle = "#ffffff"
  ctx.fillText(shortName(name || role).slice(0, 10), 64, 22)
  const label = new THREE.Sprite(new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(labelCanvas),
    transparent: true,
    depthTest: false,
  }))
  label.position.y = 11
  label.scale.set(16, 5.5, 1)
  root.add(label)

  return root
}

function fielderPositions(): Array<{ code: string; role: string; pos: THREE.Vector3 }> {
  return [
    { code: "P", role: "P", pos: new THREE.Vector3(0, 0, -60.5) },
    { code: "C", role: "C", pos: new THREE.Vector3(0, 0, 8) },
    { code: "1B", role: "1B", pos: new THREE.Vector3(72, 0, -86) },
    { code: "2B", role: "2B", pos: new THREE.Vector3(54, 0, -142) },
    { code: "SS", role: "SS", pos: new THREE.Vector3(-54, 0, -142) },
    { code: "3B", role: "3B", pos: new THREE.Vector3(-72, 0, -86) },
    { code: "LF", role: "LF", pos: new THREE.Vector3(-150, 0, -255) },
    { code: "CF", role: "CF", pos: new THREE.Vector3(0, 0, -315) },
    { code: "RF", role: "RF", pos: new THREE.Vector3(150, 0, -255) },
  ]
}

export default function FieldView({ traj, exitVelo, launchAngle, sprayAngle, result, swing, defenders = {}, bases }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const animIdRef = useRef<number>(0)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || 854, H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(1)
    renderer.setClearColor(0x0f172a, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    scene.add(new THREE.AmbientLight(0xffffff, 0.65))
    const sun = new THREE.DirectionalLight(0xfff1d6, 0.9)
    sun.position.set(-120, 220, 80)
    scene.add(sun)

    // Camera: above and behind home plate, angled toward CF
    const camera = new THREE.PerspectiveCamera(58, W / H, 0.1, 2000)
    camera.position.set(0, 155, 215)
    camera.lookAt(0, 0, -125)

    const resize = () => {
      const w = el.clientWidth || 854
      const h = el.clientHeight || 480
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null
    resizeObserver?.observe(el)

    // ── Field ──────────────────────────────────────────────────────────────
    // Outfield grass
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(420, 36),
      new THREE.MeshPhongMaterial({ color: 0x14532d })
    )
    grass.rotation.x = -Math.PI / 2
    grass.position.set(0, -0.5, -140)
    scene.add(grass)

    // Infield dirt (rotated square)
    const dirt = new THREE.Mesh(
      new THREE.CircleGeometry(100, 4),
      new THREE.MeshPhongMaterial({ color: 0x78350f })
    )
    dirt.rotation.x = -Math.PI / 2
    dirt.rotation.z = Math.PI / 4
    dirt.position.set(0, -0.4, -64)
    scene.add(dirt)

    // Foul lines
    const lm = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(-340, 0, -340)
    ]), lm))
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0), new THREE.Vector3(340, 0, -340)
    ]), lm))

    const wallPts: THREE.Vector3[] = []
    for (let i = -24; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 0.38 - Math.PI / 2
      wallPts.push(new THREE.Vector3(Math.cos(a) * 385, 9, Math.sin(a) * 385 - 25))
    }
    const wall = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(wallPts),
      new THREE.LineBasicMaterial({ color: 0x60a5fa, transparent: true, opacity: 0.45 })
    )
    scene.add(wall)

    // Bases
    const bm = new THREE.MeshBasicMaterial({ color: 0xffffff })
    ;([[63.6, 63.6], [0, 127.3], [-63.6, 63.6]] as [number, number][]).forEach(([bx, by]) => {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(5, 5), bm)
      b.rotation.x = -Math.PI / 2
      b.position.set(bx, 0.1, -by)
      scene.add(b)
    })
    // Home plate
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), bm)
    hp.rotation.x = -Math.PI / 2
    hp.position.set(0, 0.1, 0)
    scene.add(hp)

    const launchFlash = new THREE.Mesh(
      new THREE.RingGeometry(8, 14, 20),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.75 })
    )
    launchFlash.rotation.x = -Math.PI / 2
    launchFlash.position.set(0, 0.18, -2)
    scene.add(launchFlash)

    // Pitcher's mound
    const mound = new THREE.Mesh(
      new THREE.CircleGeometry(9, 10),
      new THREE.MeshBasicMaterial({ color: 0x78350f })
    )
    mound.rotation.x = -Math.PI / 2
    mound.position.set(0, 0.1, -60.5)
    scene.add(mound)

    const fielders: Fielder[] = fielderPositions().map(({ code, role, pos }) => {
      const root = makeFielder(role, defenders[code] ?? role)
      root.position.copy(pos)
      scene.add(root)
      const baseRing = new THREE.Mesh(
        new THREE.RingGeometry(6.5, 9.5, 16),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8, side: THREE.DoubleSide, transparent: true, opacity: 0.55 })
      )
      baseRing.rotation.x = -Math.PI / 2
      baseRing.position.set(pos.x, 0.22, pos.z)
      scene.add(baseRing)
      return {
        code,
        role,
        root,
        baseRing,
        start: pos.clone(),
        target: pos.clone(),
        active: false,
      }
    })

    const baseRunnerSpots: Array<{ occupied: boolean; pos: THREE.Vector3 }> = [
      { occupied: !!bases?.first,  pos: new THREE.Vector3(63.6, 0, -63.6) },
      { occupied: !!bases?.second, pos: new THREE.Vector3(0, 0, -127.3) },
      { occupied: !!bases?.third,  pos: new THREE.Vector3(-63.6, 0, -63.6) },
    ]
    for (const { occupied, pos } of baseRunnerSpots) {
      if (!occupied) continue
      const baseRunner = makeRunner(0xf97316)
      baseRunner.position.copy(pos)
      baseRunner.scale.setScalar(0.9)
      scene.add(baseRunner)
    }

    const runner = makeRunner()
    runner.visible = false
    runner.position.set(0, 0, 0)
    scene.add(runner)

    // ── Ball ───────────────────────────────────────────────────────────────
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 8, 8),
      new THREE.MeshPhongMaterial({ color: 0xfef08a, emissive: 0x3f2f00 })
    )
    ball.visible = false
    scene.add(ball)

    // Trail line (grows as ball moves)
    const MAX_TRAIL = traj.length
    const trailPositions = new Float32Array(MAX_TRAIL * 3)
    const trailGeo = new THREE.BufferGeometry()
    trailGeo.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3))
    trailGeo.setDrawRange(0, 0)
    const trailLine = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xfef08a, transparent: true, opacity: 0.6 }))
    scene.add(trailLine)

    // Shadow on ground (circle that follows x/z of ball)
    const shadow = new THREE.Mesh(
      new THREE.CircleGeometry(3, 8),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.05
    shadow.visible = false
    scene.add(shadow)

    // Landing point marker (shown after ball lands)
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(5, 9, 18),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    )
    marker.rotation.x = -Math.PI / 2
    marker.position.y = 0.2
    scene.add(marker)

    // ── Animation ──────────────────────────────────────────────────────────
    // Convert traj to Three.js points
    const pts: THREE.Vector3[] = traj.map(([x, y, z]) => e2t(x, y, z))
    if (pts.length < 2) {
      renderer.render(scene, camera)
      return () => {
        resizeObserver?.disconnect()
        renderer.dispose()
        el.removeChild(renderer.domElement)
      }
    }

    // Total flight distance for timing (use cumulative arc length)
    const segLens: number[] = [0]
    for (let i = 1; i < pts.length; i++) {
      segLens.push(segLens[i - 1] + pts[i].distanceTo(pts[i - 1]))
    }
    const totalLen = segLens[segLens.length - 1]
    const landPt = pts[pts.length - 1]
    const playableLand = clampToFence(landPt)
    const grounder = isGroundBall(result, launchAngle)
    const firstBase = new THREE.Vector3(63.6, 0, -63.6)
    const primaryFielder = fielders.reduce((best, f) => {
      const d = f.start.distanceTo(playableLand)
      return d < best.distance ? { fielder: f, distance: d } : best
    }, { fielder: fielders[0], distance: Infinity }).fielder
    primaryFielder.active = true
    primaryFielder.target.copy(playableLand).lerp(primaryFielder.start, grounder ? 0.02 : 0.08)
    primaryFielder.root.scale.setScalar(1.9)
    ;(primaryFielder.baseRing.material as THREE.MeshBasicMaterial).color.setHex(0xfacc15)
    ;(primaryFielder.baseRing.material as THREE.MeshBasicMaterial).opacity = 0.9

    for (const f of fielders) {
      if (f === primaryFielder) continue
      const supportT = f.code === "P" || f.code === "C" ? 0.22 : 0.13
      f.target.copy(f.start).lerp(playableLand, supportT)
    }

    const routePositions = new Float32Array(6)
    const routeGeo = new THREE.BufferGeometry()
    routeGeo.setAttribute("position", new THREE.BufferAttribute(routePositions, 3))
    const routeLine = new THREE.Line(
      routeGeo,
      new THREE.LineBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.78 })
    )
    scene.add(routeLine)

    const catchMarker = new THREE.Mesh(
      new THREE.RingGeometry(7, 11, 18),
      new THREE.MeshBasicMaterial({ color: 0xfacc15, side: THREE.DoubleSide, transparent: true, opacity: 0.62 })
    )
    catchMarker.rotation.x = -Math.PI / 2
    catchMarker.position.set(primaryFielder.target.x, 0.28, primaryFielder.target.z)
    scene.add(catchMarker)

    const throwPositions = new Float32Array(6)
    const throwGeo = new THREE.BufferGeometry()
    throwGeo.setAttribute("position", new THREE.BufferAttribute(throwPositions, 3))
    const throwLine = new THREE.Line(
      throwGeo,
      new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 })
    )
    scene.add(throwLine)

    const FLIGHT_MS = Math.min(grounder ? 900 : 1800, Math.max(520, totalLen * (grounder ? 4.2 : 3.5)))
    const THROW_MS = grounder ? 760 : 0
    const RUNNER_MS = grounder ? FLIGHT_MS + THROW_MS + 260 : 0
    const LAND_FLASH_MS = 500

    // Hit runner base path (computed once per play)
    const hitR = (result ?? "").toLowerCase()
    const HR_HOME = new THREE.Vector3(0, 0, 0)
    const HR_1B   = new THREE.Vector3(63.6, 0, -63.6)
    const HR_2B   = new THREE.Vector3(0, 0, -127.3)
    const HR_3B   = new THREE.Vector3(-63.6, 0, -63.6)
    let hitRunPath: THREE.Vector3[] = []
    if      (hitR.includes("home run"))  hitRunPath = [HR_HOME, HR_1B, HR_2B, HR_3B, new THREE.Vector3(0, 0, 0)]
    else if (hitR.includes("triple"))    hitRunPath = [HR_HOME, HR_1B, HR_2B, HR_3B]
    else if (hitR.includes("double"))    hitRunPath = [HR_HOME, HR_1B, HR_2B]
    else if (hitR.includes("single") || hitR.includes("beats out") || hitR.includes("error") || hitR.includes("fielder's choice")) hitRunPath = [HR_HOME, HR_1B]
    const hitRunLens: number[] = [0]
    for (let i = 1; i < hitRunPath.length; i++)
      hitRunLens.push(hitRunLens[i - 1] + hitRunPath[i].distanceTo(hitRunPath[i - 1]))
    const totalHitRunLen = hitRunLens[hitRunLens.length - 1] || 0
    const HIT_TROT = hitR.includes("home run")
    const HIT_RUN_MS = totalHitRunLen > 0 ? (totalHitRunLen / (HIT_TROT ? 18 : 24)) * 1000 : 0
    const startTime = performance.now()
    let landed = false
    let trailCount = 0
    const target = new THREE.Vector3(0, 0, -150)
    const TOTAL_ANIM_MS = FLIGHT_MS + Math.max(RUNNER_MS, HIT_RUN_MS + 280) + 1500
    let lastRender = 0

    const animate = (now: number) => {
      animIdRef.current = requestAnimationFrame(animate)
      if (el.offsetParent === null) return
      const elapsed = now - startTime
      const minInterval = elapsed > TOTAL_ANIM_MS ? 2000 : 50  // 20fps active, ~0fps idle
      if (now - lastRender < minInterval) return
      lastRender = now

      if (!landed) {
        const t = Math.min(1, elapsed / FLIGHT_MS)
        const flashT = Math.min(1, elapsed / 320)
        launchFlash.scale.setScalar(0.5 + flashT * 1.9)
        ;(launchFlash.material as THREE.MeshBasicMaterial).opacity = 0.75 * (1 - flashT)

        // find segment by arc length
        const targetLen = t * totalLen
        let seg = 0
        for (let i = 1; i < segLens.length; i++) {
          if (segLens[i] >= targetLen) { seg = i - 1; break }
          seg = i - 1
        }
        const segT = segLens[seg + 1] > segLens[seg]
          ? (targetLen - segLens[seg]) / (segLens[seg + 1] - segLens[seg])
          : 0
        const pos = pts[seg].clone().lerp(pts[Math.min(seg + 1, pts.length - 1)], segT)
        const fielderT = easeOutCubic(Math.min(1, Math.max(0, (t - 0.08) / 0.82)))
        for (const f of fielders) {
          const moveT = f.active ? fielderT : fielderT * 0.68
          f.root.position.copy(f.start).lerp(f.target, moveT)
          f.baseRing.position.x = f.root.position.x
          f.baseRing.position.z = f.root.position.z
          const pulse = f.active ? 1 + Math.sin(elapsed * 0.014) * 0.1 : 1
          f.root.scale.setScalar(f.active ? 1.25 + Math.sin(elapsed * 0.014) * 0.08 : 1)
          f.baseRing.scale.setScalar(pulse)
        }

        routePositions[0] = primaryFielder.root.position.x
        routePositions[1] = 0.35
        routePositions[2] = primaryFielder.root.position.z
        routePositions[3] = primaryFielder.target.x
        routePositions[4] = 0.35
        routePositions[5] = primaryFielder.target.z
        routeGeo.attributes.position.needsUpdate = true
        catchMarker.scale.setScalar(1 + Math.sin(elapsed * 0.012) * 0.08)

        ball.position.copy(pos)
        ball.rotation.x += 0.22
        ball.rotation.z += 0.15
        ball.visible = true
        shadow.position.set(pos.x, 0.05, pos.z)
        const shadowScale = Math.max(0.45, 1 - pos.y / 170)
        shadow.scale.setScalar(shadowScale)
        shadow.visible = true

        // grow trail
        const trailIdx = Math.min(seg + 1, pts.length - 1)
        if (trailIdx > trailCount) {
          for (let i = trailCount; i <= trailIdx; i++) {
            trailPositions[i * 3]     = pts[i].x
            trailPositions[i * 3 + 1] = pts[i].y
            trailPositions[i * 3 + 2] = pts[i].z
          }
          trailCount = trailIdx + 1
          trailGeo.attributes.position.needsUpdate = true
          trailGeo.setDrawRange(0, trailCount)
        }

        if (t >= 1) {
          landed = true
          ball.visible = grounder
          shadow.visible = grounder
          // flash marker at landing
          marker.position.set(playableLand.x, 0.2, playableLand.z)
        }

        const actionFocus = pos.clone().lerp(primaryFielder.root.position, 0.4)
        actionFocus.y = Math.max(0, pos.y * 0.25)
        target.lerp(actionFocus, 0.08)
        const cameraT = easeOutCubic(t)
        const desiredCamera = new THREE.Vector3(
          actionFocus.x * 0.1,
          150 + Math.min(44, Math.max(0, pos.y * 0.18)) - cameraT * 8,
          THREE.MathUtils.clamp(215 + actionFocus.z * 0.06 - cameraT * 26, -95, 220)
        )
        camera.position.lerp(desiredCamera, 0.07)
        camera.lookAt(target.x * 0.45, Math.max(0, target.y * 0.55), target.z - 12)
      } else {
        // fade-in marker ring
        const ft = Math.min(1, (elapsed - FLIGHT_MS) / LAND_FLASH_MS)
        marker.scale.setScalar(1 + ft * 0.9)
        ;(marker.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - ft * 0.35)
        catchMarker.scale.setScalar(1 + Math.sin(elapsed * 0.012) * 0.08)

        if (grounder) {
          const playElapsed = elapsed - FLIGHT_MS
          const runnerT = easeInOutCubic(Math.min(1, elapsed / RUNNER_MS))
          runner.visible = true
          runner.position.copy(new THREE.Vector3(0, 0, 0).lerp(firstBase, runnerT))
          runner.scale.setScalar(1 + Math.sin(elapsed * 0.018) * 0.08)

          const throwT = easeInOutCubic(Math.min(1, Math.max(0, playElapsed - 130) / THROW_MS))
          const release = primaryFielder.root.position.clone()
          release.y = 6
          const glove = firstBase.clone()
          glove.y = 7
          const throwPos = release.clone().lerp(glove, throwT)
          throwPos.y += Math.sin(throwT * Math.PI) * 16
          ball.position.copy(throwPos)
          ball.visible = true
          shadow.position.set(throwPos.x, 0.05, throwPos.z)
          shadow.scale.setScalar(Math.max(0.45, 1 - throwPos.y / 90))
          shadow.visible = true

          ;(throwLine.material as THREE.LineBasicMaterial).opacity = throwT > 0 && throwT < 1 ? 0.65 : 0.25
          throwPositions[0] = release.x
          throwPositions[1] = 2
          throwPositions[2] = release.z
          throwPositions[3] = firstBase.x
          throwPositions[4] = 2
          throwPositions[5] = firstBase.z
          throwGeo.attributes.position.needsUpdate = true

          target.lerp(new THREE.Vector3(35, 10, -45), 0.04)
          camera.position.lerp(new THREE.Vector3(22, 118, 132), 0.045)
          camera.lookAt(target.x, target.y, target.z)
        }
      }

      // Hit runner animation (runs from contact through all bases)
      if (!grounder && hitRunPath.length > 1) {
        const runElapsed = Math.max(0, elapsed - 280)  // 280ms after hit = batter leaving box
        if (runElapsed > 0) {
          const runT = Math.min(1, runElapsed / HIT_RUN_MS)
          const runDist = runT * totalHitRunLen
          let rseg = hitRunPath.length - 2
          for (let i = 1; i < hitRunLens.length; i++) {
            if (hitRunLens[i] >= runDist) { rseg = i - 1; break }
          }
          const rfrac = hitRunLens[rseg + 1] > hitRunLens[rseg]
            ? (runDist - hitRunLens[rseg]) / (hitRunLens[rseg + 1] - hitRunLens[rseg])
            : 0
          const rpos = hitRunPath[rseg].clone().lerp(hitRunPath[Math.min(rseg + 1, hitRunPath.length - 1)], rfrac)
          runner.visible = true
          runner.position.set(rpos.x, Math.abs(Math.sin(runElapsed * 0.06)) * 1.5, rpos.z)
          runner.scale.setScalar(1 + Math.sin(runElapsed * 0.045) * 0.08)

          // After ball lands, camera transitions to follow runner
          if (landed) {
            const blend = Math.min(0.055, 0.015 + (elapsed - FLIGHT_MS) / 25000)
            target.lerp(new THREE.Vector3(rpos.x * 0.45, 0, rpos.z - 22), blend)
            camera.position.lerp(new THREE.Vector3(rpos.x * 0.28 - 16, 72, rpos.z + 92), blend * 0.75)
            camera.lookAt(target)
          }
        }
      }

      renderer.render(scene, camera)
    }

    animIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animIdRef.current)
      resizeObserver?.disconnect()
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [traj])

  const rl = result ? resultLabel(result) : null

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} className="overflow-hidden" />
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
