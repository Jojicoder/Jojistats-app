import { useEffect, useRef } from "react"
import * as THREE from "three"

export type BallTraj = [number, number, number][]  // [x, y, z] engine feet

type Props = {
  traj: BallTraj
  exitVelo: number
  launchAngle: number
  sprayAngle: number
}

// engine → Three.js:  X→X,  Y(depth)→-Z,  Z(height)→Y
function e2t(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, z, -y)
}

export default function FieldView({ traj, exitVelo, launchAngle, sprayAngle }: Props) {
  const mountRef  = useRef<HTMLDivElement>(null)
  const animIdRef = useRef<number>(0)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || 854, H = el.clientHeight || 480

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
    renderer.setSize(W, H)
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setClearColor(0x0f172a, 1)
    el.appendChild(renderer.domElement)

    const scene = new THREE.Scene()

    // Camera: above and behind home plate, angled toward CF
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 2000)
    camera.position.set(0, 140, 130)
    camera.lookAt(0, 0, -180)

    // ── Field ──────────────────────────────────────────────────────────────
    // Outfield grass
    const grass = new THREE.Mesh(
      new THREE.CircleGeometry(420, 64),
      new THREE.MeshBasicMaterial({ color: 0x14532d })
    )
    grass.rotation.x = -Math.PI / 2
    grass.position.set(0, -0.5, -140)
    scene.add(grass)

    // Infield dirt (rotated square)
    const dirt = new THREE.Mesh(
      new THREE.CircleGeometry(100, 4),
      new THREE.MeshBasicMaterial({ color: 0x78350f })
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

    // Pitcher's mound
    const mound = new THREE.Mesh(
      new THREE.CircleGeometry(9, 16),
      new THREE.MeshBasicMaterial({ color: 0x78350f })
    )
    mound.rotation.x = -Math.PI / 2
    mound.position.set(0, 0.1, -60.5)
    scene.add(mound)

    // ── Ball ───────────────────────────────────────────────────────────────
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(3.5, 12, 12),
      new THREE.MeshBasicMaterial({ color: 0xfef08a })
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
      new THREE.CircleGeometry(3, 12),
      new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.35 })
    )
    shadow.rotation.x = -Math.PI / 2
    shadow.position.y = 0.05
    shadow.visible = false
    scene.add(shadow)

    // Landing point marker (shown after ball lands)
    const marker = new THREE.Mesh(
      new THREE.RingGeometry(4, 7, 20),
      new THREE.MeshBasicMaterial({ color: 0xfef08a, side: THREE.DoubleSide, transparent: true, opacity: 0 })
    )
    marker.rotation.x = -Math.PI / 2
    marker.position.y = 0.2
    scene.add(marker)

    // ── Animation ──────────────────────────────────────────────────────────
    // Convert traj to Three.js points
    const pts: THREE.Vector3[] = traj.map(([x, y, z]) => e2t(x, y, z))
    if (pts.length < 2) { renderer.render(scene, camera); return }

    // Total flight distance for timing (use cumulative arc length)
    const segLens: number[] = [0]
    for (let i = 1; i < pts.length; i++) {
      segLens.push(segLens[i - 1] + pts[i].distanceTo(pts[i - 1]))
    }
    const totalLen = segLens[segLens.length - 1]

    const FLIGHT_MS = Math.min(1800, Math.max(600, totalLen * 3.5))  // ~1s for typical fly ball
    const LAND_FLASH_MS = 500
    const startTime = performance.now()
    let landed = false
    let trailCount = 0

    const animate = (now: number) => {
      animIdRef.current = requestAnimationFrame(animate)

      const elapsed = now - startTime

      if (!landed) {
        const t = Math.min(1, elapsed / FLIGHT_MS)

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

        ball.position.copy(pos)
        ball.visible = true
        shadow.position.set(pos.x, 0.05, pos.z)
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
          ball.visible = false
          shadow.visible = false
          // flash marker at landing
          const landPt = pts[pts.length - 1]
          marker.position.set(landPt.x, 0.2, landPt.z)
        }
      } else {
        // fade-in marker ring
        const ft = Math.min(1, (elapsed - FLIGHT_MS) / LAND_FLASH_MS)
        ;(marker.material as THREE.MeshBasicMaterial).opacity = 0.7 * (1 - ft * 0.3)
      }

      renderer.render(scene, camera)
    }

    animIdRef.current = requestAnimationFrame(animate)

    return () => {
      cancelAnimationFrame(animIdRef.current)
      renderer.dispose()
      el.removeChild(renderer.domElement)
    }
  }, [traj])

  return (
    <div className="relative w-full h-full">
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} className="overflow-hidden" />
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-4 text-[10px] font-mono text-gray-300 bg-black/50 px-3 py-1 rounded-full">
        <span>EV <span className="text-yellow-300">{exitVelo.toFixed(0)} mph</span></span>
        <span>LA <span className="text-yellow-300">{launchAngle > 0 ? "+" : ""}{launchAngle.toFixed(0)}°</span></span>
        <span>{sprayAngle > 0 ? "Pull" : "Oppo"} <span className="text-yellow-300">{Math.abs(sprayAngle).toFixed(0)}°</span></span>
      </div>
    </div>
  )
}
