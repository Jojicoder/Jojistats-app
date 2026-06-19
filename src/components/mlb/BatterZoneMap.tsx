import { useEffect, useState } from "react"
import { getGameLiveFeed, getPlayerRecentGamePks } from "../../api/mlb"

// Strike zone grid boundaries (feet, catcher's view)
// pX: negative = catcher's left, positive = catcher's right
// pZ: 1.5 (low) to 3.5 (high)
const COL_BOUNDS: [number, number][] = [[-0.83, -0.277], [-0.277, 0.277], [0.277, 0.83]]
const ROW_BOUNDS: [number, number][] = [[2.833, 3.5], [2.167, 2.833], [1.5, 2.167]]

// "X" = in play (out), "D" = in play (no out = hit/error/FC)
const SWING_CODES = new Set(["S", "W", "F", "X", "D", "T", "M"])
const WHIFF_CODES = new Set(["S", "W", "M"])
const HIT_EVENTS = new Set(["Single", "Double", "Triple", "Home Run"])

type ZoneCell = {
  pitches: number
  swings: number
  inPlay: number
  hits: number
  whiffs: number
}

type ZoneMetric = "avg" | "swing" | "whiff"

function getColRow(pX: number, pZ: number): [number, number] | null {
  const col = COL_BOUNDS.findIndex(([lo, hi]) => pX >= lo && pX < hi)
  const row = ROW_BOUNDS.findIndex(([lo, hi]) => pZ >= lo && pZ < hi)
  if (col < 0 || row < 0) return null
  return [col, row]
}

function emptyGrid(): ZoneCell[][] {
  return Array.from({ length: 3 }, () =>
    Array.from({ length: 3 }, () => ({
      pitches: 0, swings: 0, inPlay: 0, hits: 0, whiffs: 0,
    }))
  )
}

function getCellValue(cell: ZoneCell, metric: ZoneMetric): number | null {
  if (metric === "avg") return cell.inPlay >= 3 ? cell.hits / cell.inPlay : null
  if (metric === "swing") return cell.pitches >= 3 ? cell.swings / cell.pitches : null
  if (metric === "whiff") return cell.swings >= 3 ? cell.whiffs / cell.swings : null
  return null
}

function getCellColor(value: number | null, metric: ZoneMetric): string {
  if (value === null) return "bg-gray-100 text-gray-300"
  if (metric === "avg") {
    if (value >= 0.35) return "bg-green-500 text-white"
    if (value >= 0.30) return "bg-green-300 text-green-900"
    if (value >= 0.25) return "bg-yellow-200 text-yellow-800"
    if (value >= 0.20) return "bg-orange-300 text-orange-900"
    return "bg-red-500 text-white"
  }
  if (metric === "swing") {
    if (value >= 0.70) return "bg-green-500 text-white"
    if (value >= 0.55) return "bg-green-300 text-green-900"
    if (value >= 0.40) return "bg-yellow-200 text-yellow-800"
    if (value >= 0.25) return "bg-orange-300 text-orange-900"
    return "bg-red-400 text-white"
  }
  // whiff%: high = weakness
  if (value >= 0.35) return "bg-red-500 text-white"
  if (value >= 0.25) return "bg-orange-300 text-orange-900"
  if (value >= 0.15) return "bg-yellow-200 text-yellow-800"
  if (value >= 0.08) return "bg-green-300 text-green-900"
  return "bg-green-500 text-white"
}

function formatValue(value: number | null, metric: ZoneMetric): string {
  if (value === null) return "—"
  if (metric === "avg") return value.toFixed(3).replace(/^0/, "")
  return `${Math.round(value * 100)}%`
}

type Props = {
  playerId: number
  batSide?: "R" | "L" | "S" | null
  gameLimit?: number
}

export default function BatterZoneMap({ playerId, batSide, gameLimit = 15 }: Props) {
  const [grid, setGrid] = useState<ZoneCell[][] | null>(null)
  const [loading, setLoading] = useState(true)
  const [gamesLoaded, setGamesLoaded] = useState(0)
  const [totalGames, setTotalGames] = useState(0)
  const [metric, setMetric] = useState<ZoneMetric>("avg")

  useEffect(() => {
    let cancelled = false
    setGrid(null)
    setLoading(true)
    setGamesLoaded(0)
    setTotalGames(0)

    async function load() {
      const gamePks = await getPlayerRecentGamePks(playerId, gameLimit)
      if (cancelled) return
      setTotalGames(gamePks.length)

      const accumulated = emptyGrid()

      for (let i = 0; i < gamePks.length; i += 5) {
        const batch = gamePks.slice(i, i + 5)
        const feeds = await Promise.all(batch.map((pk) => getGameLiveFeed(pk).catch(() => null)))
        if (cancelled) return

        for (const feed of feeds) {
          if (!feed) continue
          const plays = feed.liveData?.plays?.allPlays ?? []
          for (const play of plays) {
            if (play.matchup?.batter?.id !== playerId) continue
            const isHit = HIT_EVENTS.has(play.result?.event ?? "")
            for (const event of play.playEvents ?? []) {
              if (!event.isPitch) continue
              const pX = event.pitchData?.coordinates?.pX
              const pZ = event.pitchData?.coordinates?.pZ
              if (pX == null || pZ == null) continue
              const pos = getColRow(pX, pZ)
              if (!pos) continue
              const [col, row] = pos
              const cell = accumulated[row][col]
              const code = event.details?.call?.code ?? ""
              cell.pitches++
              if (SWING_CODES.has(code)) cell.swings++
              if (WHIFF_CODES.has(code)) cell.whiffs++
              if (event.details?.isInPlay) {
                cell.inPlay++
                if (isHit) cell.hits++
              }
            }
          }
        }

        if (!cancelled) setGamesLoaded((prev) => prev + batch.length)
      }

      if (!cancelled) {
        setGrid(accumulated)
        setLoading(false)
      }
    }

    load().catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [playerId, gameLimit])

  const ROW_LABELS = ["High", "Mid", "Low"]
  // pX negative = catcher's left = inside for RHB, outside for LHB
  const colLabels =
    batSide === "L"
      ? ["Outside", "Middle", "Inside"]
      : ["Inside", "Middle", "Outside"]

  const metrics: { key: ZoneMetric; label: string; desc: string }[] = [
    { key: "avg", label: "Batting Avg", desc: "Hits per ball in play per zone (min 3)" },
    { key: "swing", label: "Swing %", desc: "How often batter swings at pitches in zone (min 3)" },
    { key: "whiff", label: "Whiff %", desc: "Swing-and-miss rate per zone (min 3 swings)" },
  ]
  const activeMetric = metrics.find((m) => m.key === metric)!

  const batSideLabel =
    batSide === "L" ? "Bats Left" : batSide === "S" ? "Switch" : batSide === "R" ? "Bats Right" : null

  const legendItems: { color: string; label: string }[] =
    metric === "avg"
      ? [
          { color: "bg-green-500", label: ".350+" },
          { color: "bg-green-300", label: ".300" },
          { color: "bg-yellow-200", label: ".250" },
          { color: "bg-orange-300", label: ".200" },
          { color: "bg-red-500", label: "< .200" },
        ]
      : metric === "swing"
      ? [
          { color: "bg-green-500", label: "70%+" },
          { color: "bg-green-300", label: "55%" },
          { color: "bg-yellow-200", label: "40%" },
          { color: "bg-orange-300", label: "25%" },
          { color: "bg-red-400", label: "< 25%" },
        ]
      : [
          { color: "bg-red-500", label: "35%+" },
          { color: "bg-orange-300", label: "25%" },
          { color: "bg-yellow-200", label: "15%" },
          { color: "bg-green-300", label: "8%" },
          { color: "bg-green-500", label: "< 8%" },
        ]

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Zone Stats</p>
          {batSideLabel && (
            <span className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[11px] font-semibold text-gray-500">
              {batSideLabel}
            </span>
          )}
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 gap-1">
          {metrics.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setMetric(key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                metric === key
                  ? "bg-green-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-green-900"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-6">
          <p className="mb-2 text-center text-xs text-gray-400">
            {totalGames === 0
              ? "Fetching game list…"
              : `Loading pitch data — ${gamesLoaded} / ${totalGames} games`}
          </p>
          {totalGames > 0 && (
            <div className="mx-auto h-1 w-48 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full bg-green-600 transition-all duration-300"
                style={{ width: `${(gamesLoaded / totalGames) * 100}%` }}
              />
            </div>
          )}
        </div>
      )}

      {!loading && !grid && (
        <p className="py-4 text-center text-xs text-gray-400">No pitch data available.</p>
      )}

      {!loading && grid && (
        <div className="flex flex-col items-start gap-5 sm:flex-row">
          {/* Grid */}
          <div className="shrink-0">
            <div className="flex gap-2">
              {/* Row labels */}
              <div className="flex flex-col justify-around py-1">
                {ROW_LABELS.map((label) => (
                  <span key={label} className="text-[10px] font-bold uppercase tracking-widest text-gray-400 w-7 text-right">
                    {label}
                  </span>
                ))}
              </div>

              {/* Cells */}
              <div className="overflow-hidden rounded-2xl border border-gray-200 shadow-sm">
                {grid.map((row, ri) => (
                  <div key={ri} className="flex">
                    {row.map((cell, ci) => {
                      const val = getCellValue(cell, metric)
                      return (
                        <div
                          key={ci}
                          className={`relative flex h-20 w-20 flex-col items-center justify-center border border-white/40 transition-colors ${getCellColor(val, metric)}`}
                        >
                          <span className="text-lg font-extrabold leading-none tracking-tight">
                            {formatValue(val, metric)}
                          </span>
                          <span className="mt-1.5 text-[10px] font-medium opacity-55">
                            {cell.pitches} pitches
                          </span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Column labels */}
            <div className="mt-2 flex pl-9 gap-0">
              {colLabels.map((label, i) => (
                <div key={i} className="flex w-20 justify-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                    {label}
                  </span>
                </div>
              ))}
            </div>

            <p className="mt-1.5 pl-9 text-[10px] text-gray-400">
              Last {totalGames} games · strike zone pitches only
            </p>
          </div>

          {/* Legend + description */}
          <div className="flex flex-col gap-3 pt-1">
            <div>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                {metric === "avg" ? "Batting Average" : metric === "swing" ? "Swing Rate" : "Whiff Rate"}
              </p>
              <p className="max-w-52 text-xs leading-relaxed text-gray-400">
                {activeMetric.desc}
              </p>
            </div>

            {/* Color scale */}
            <div className="space-y-1.5">
              {(metric === "whiff"
                ? [...legendItems].reverse()
                : legendItems
              ).map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-3.5 w-3.5 shrink-0 rounded-sm ${color}`} />
                  <span className="text-xs text-gray-500">{label}</span>
                </div>
              ))}
              <div className="flex items-center gap-2">
                <div className="h-3.5 w-3.5 shrink-0 rounded-sm bg-gray-100 border border-gray-200" />
                <span className="text-xs text-gray-400">Not enough data</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
