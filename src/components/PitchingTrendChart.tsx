import { useMemo, useState } from "react"
import type { LeagueKey, SavedPitchingGameEntry } from "../types"
import { getStatColor } from "./mlb/playerStats"

const chartWidth = 640
const chartHeight = 240
const chartPad = { top: 20, right: 24, bottom: 40, left: 48 }

function formatIP(outs: number) {
  const whole = Math.floor(outs / 3)
  const rem = outs % 3
  return rem === 0 ? `${whole}.0` : `${whole}.${rem}`
}

function buildSummary(entries: SavedPitchingGameEntry[]) {
  let outs = 0, er = 0, bb = 0, h = 0, so = 0
  for (const e of entries) {
    outs += e.statLine.inningsPitchedOuts
    er += e.statLine.earnedRuns
    bb += e.statLine.walks
    h += e.statLine.hitsAllowed
    so += e.statLine.strikeouts
  }
  const ip = outs / 3
  return {
    ip: formatIP(outs),
    era: ip > 0 ? (er * 9) / ip : 0,
    whip: ip > 0 ? (bb + h) / ip : 0,
    k9: ip > 0 ? (so * 9) / ip : 0,
    outs,
  }
}

const statDescriptions: Record<string, string> = {
  ERA:  "Earned Run Average",
  WHIP: "Walks + Hits per Inning",
  "K/9": "Strikeouts per 9 Inn",
  IP:   "Innings Pitched",
}

type TrendTab = "season" | "last5" | "last3"
type TrendMetric = "era" | "whip" | "k9"

function sortByGame(entries: SavedPitchingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const d =
      new Date(a.gameMeta.date).getTime() -
      new Date(b.gameMeta.date).getTime()
    return d !== 0 ? d : a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

function buildChartData(entries: SavedPitchingGameEntry[]) {
  let outs = 0
  let er = 0
  let bb = 0
  let h = 0
  let so = 0

  return entries.map((entry) => {
    outs += entry.statLine.inningsPitchedOuts
    er += entry.statLine.earnedRuns
    bb += entry.statLine.walks
    h += entry.statLine.hitsAllowed
    so += entry.statLine.strikeouts

    const ip = outs / 3
    const era = ip > 0 ? (er * 9) / ip : 0
    const whip = ip > 0 ? (bb + h) / ip : 0
    const k9 = ip > 0 ? (so * 9) / ip : 0

    const [, month, day] = entry.gameMeta.date.split("-")

    return {
      label: `${Number(month)}/${Number(day)}`,
      fullLabel: `${entry.gameMeta.date} vs ${entry.gameMeta.opponent}`,
      era,
      whip,
      k9,
    }
  })
}

export default function PitchingTrendChart({
  entries,
  league,
  pitchingRole,
}: {
  entries: SavedPitchingGameEntry[]
  league?: LeagueKey | null
  pitchingRole?: "starter" | "reliever" | "closer" | null
}) {
  const [activeTab, setActiveTab] = useState<TrendTab>("last3")
  const [activeMetric, setActiveMetric] = useState<TrendMetric>("era")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const sorted = useMemo(() => sortByGame(entries), [entries])

  const filtered = useMemo(
    () => activeTab === "last3" ? sorted.slice(-3) : activeTab === "last5" ? sorted.slice(-5) : sorted,
    [sorted, activeTab]
  )

  const summary = useMemo(() => buildSummary(filtered), [filtered])

  const chartData = useMemo(() => buildChartData(filtered), [filtered])

  const plotW = chartWidth - chartPad.left - chartPad.right
  const plotH = chartHeight - chartPad.top - chartPad.bottom

  const values = chartData.map((p) =>
    activeMetric === "era" ? p.era : activeMetric === "whip" ? p.whip : p.k9
  )
  const rawMax = Math.max(...values, 0)
  const baseMax = activeMetric === "era" ? 9 : activeMetric === "whip" ? 3 : 12
  const chartMax = Math.max(baseMax, rawMax * 1.15)

  const getX = (i: number) =>
    chartData.length === 1
      ? chartPad.left + plotW / 2
      : chartPad.left + (plotW / (chartData.length - 1)) * i

  const getY = (v: number) =>
    chartPad.top + plotH - (Math.min(v, chartMax) / chartMax) * plotH

  const polylinePoints = chartData
    .map((p, i) => {
      const v = activeMetric === "era" ? p.era : activeMetric === "whip" ? p.whip : p.k9
      return `${getX(i)},${getY(v)}`
    })
    .join(" ")

  const yTicks = [chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0]

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Performance Trend</h2>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-green-700">
            Cumulative {activeMetric === "k9" ? "K/9" : activeMetric.toUpperCase()} over time
          </p>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1 sm:flex">
          <button
            type="button"
            onClick={() => setActiveTab("last3")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "last3"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Last 3
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("last5")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "last5"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Last 5
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("season")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "season"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Seasons
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No games available yet.
        </div>
      ) : (
        <>
          {/* Summary stat cards */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { key: "ERA",  val: summary.era.toFixed(2) },
                { key: "WHIP", val: summary.whip.toFixed(2) },
                { key: "K/9",  val: summary.k9.toFixed(2) },
                { key: "IP",   val: summary.ip },
              ] as const
            ).map(({ key, val }) => {
              const useAbsolute = league && (key === "ERA" || key === "WHIP")
              const neutral = { bg: "bg-[#f7f8f3]", label: "text-gray-400", value: "text-green-950" }
              const s = useAbsolute
                ? (() => { const c = getStatColor(key, val, league, pitchingRole); return { bg: c.bg, label: c.lbl, value: c.val } })()
                : neutral
              return (
                <div key={key} className={`rounded-xl p-3 sm:p-4 ${s.bg}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest ${s.label}`}>{key}</p>
                  <p className="text-[11px] text-gray-400">{statDescriptions[key]}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${s.value}`}>{val}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-xl bg-[#f7f8f3] p-4">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-gray-700">
                Cumulative {activeMetric === "k9" ? "K/9" : activeMetric.toUpperCase()} over time
              </p>
              <div className="grid grid-cols-3 rounded-xl bg-white p-1 sm:flex sm:items-center sm:gap-1">
                {(["era", "whip", "k9"] as TrendMetric[]).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setActiveMetric(m)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      activeMetric === m
                        ? "bg-green-900 text-white shadow-sm"
                        : "text-gray-600"
                    }`}
                  >
                    {m === "k9" ? "K/9" : m.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
            <svg
              className="h-60 min-w-105 w-full"
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              role="img"
              aria-label="Pitching performance trend"
            >
              {yTicks.map((tick) => {
                const y = chartPad.top + plotH * (1 - tick / chartMax)
                return (
                  <g key={tick}>
                    <line
                      x1={chartPad.left}
                      x2={chartWidth - chartPad.right}
                      y1={y}
                      y2={y}
                      stroke="#e5e7eb"
                      strokeDasharray="4 4"
                    />
                    <text
                      x={chartPad.left - 8}
                      y={y + 4}
                      textAnchor="end"
                      className="fill-gray-500 text-[11px]"
                    >
                      {tick.toFixed(2)}
                    </text>
                  </g>
                )
              })}

              <line
                x1={chartPad.left}
                x2={chartPad.left}
                y1={chartPad.top}
                y2={chartHeight - chartPad.bottom}
                stroke="#d1d5db"
              />
              <line
                x1={chartPad.left}
                x2={chartWidth - chartPad.right}
                y1={chartHeight - chartPad.bottom}
                y2={chartHeight - chartPad.bottom}
                stroke="#d1d5db"
              />

              <defs>
                <linearGradient id="pitching-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#166534" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#166534" stopOpacity="0" />
                </linearGradient>
              </defs>
              {chartData.length >= 1 && (
                <polygon
                  points={`${polylinePoints} ${getX(chartData.length - 1)},${chartHeight - chartPad.bottom} ${getX(0)},${chartHeight - chartPad.bottom}`}
                  fill="url(#pitching-area-fill)"
                />
              )}
              <polyline
                points={polylinePoints}
                fill="none"
                stroke="#166534"
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />

              {chartData.map((point, i) => {
                const x = getX(i)
                const v = activeMetric === "era" ? point.era : activeMetric === "whip" ? point.whip : point.k9
                const y = getY(v)
                const isHovered = hoveredIndex === i
                const tooltipX = Math.max(chartPad.left, Math.min(x - 55, chartWidth - chartPad.right - 110))

                return (
                  <g
                    key={`${point.fullLabel}-${i}`}
                    onMouseEnter={() => setHoveredIndex(i)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <circle cx={x} cy={y} r={isHovered ? "6" : "4.5"} fill="#166534" />

                    {isHovered && (
                      <>
                        <rect
                          x={tooltipX}
                          y={Math.max(chartPad.top + 4, y - 38)}
                          width="110"
                          height="34"
                          rx="6"
                          fill="#111827"
                          opacity="0.94"
                        />
                        <text
                          x={tooltipX + 55}
                          y={Math.max(chartPad.top + 4, y - 38) + 13}
                          textAnchor="middle"
                          className="fill-white text-[10px]"
                        >
                          {point.fullLabel}
                        </text>
                        <text
                          x={tooltipX + 55}
                          y={Math.max(chartPad.top + 4, y - 38) + 26}
                          textAnchor="middle"
                          className="fill-white text-[11px]"
                        >
                          {activeMetric === "k9" ? "K/9" : activeMetric.toUpperCase()} {v.toFixed(2)}
                        </text>
                      </>
                    )}

                    <text
                      x={x}
                      y={chartHeight - 12}
                      textAnchor="middle"
                      className="fill-gray-500 text-[11px]"
                    >
                      {point.label}
                    </text>
                  </g>
                )
              })}
            </svg>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
