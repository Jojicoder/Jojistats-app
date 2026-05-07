import { useMemo, useState } from "react"
import type { SavedPitchingGameEntry } from "../types"

const chartWidth = 640
const chartHeight = 240
const chartPad = { top: 20, right: 24, bottom: 40, left: 48 }

type TrendTab = "all" | "last5"
type TrendMetric = "era" | "whip"

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

  return entries.map((entry) => {
    outs += entry.statLine.inningsPitchedOuts
    er += entry.statLine.earnedRuns
    bb += entry.statLine.walks
    h += entry.statLine.hitsAllowed

    const ip = outs / 3
    const era = ip > 0 ? (er * 9) / ip : 0
    const whip = ip > 0 ? (bb + h) / ip : 0

    const [, month, day] = entry.gameMeta.date.split("-")

    return {
      label: `${Number(month)}/${Number(day)}`,
      fullLabel: `${entry.gameMeta.date} vs ${entry.gameMeta.opponent}`,
      era,
      whip,
    }
  })
}

export default function PitchingTrendChart({
  entries,
}: {
  entries: SavedPitchingGameEntry[]
}) {
  const [activeTab, setActiveTab] = useState<TrendTab>("all")
  const [activeMetric, setActiveMetric] = useState<TrendMetric>("era")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const sorted = useMemo(() => sortByGame(entries), [entries])

  const filtered = useMemo(
    () => (activeTab === "last5" ? sorted.slice(-5) : sorted),
    [sorted, activeTab]
  )

  const chartData = useMemo(() => buildChartData(filtered), [filtered])

  const plotW = chartWidth - chartPad.left - chartPad.right
  const plotH = chartHeight - chartPad.top - chartPad.bottom

  const values = chartData.map((p) =>
    activeMetric === "era" ? p.era : p.whip
  )
  const rawMax = Math.max(...values, 0)
  const chartMax = Math.max(activeMetric === "era" ? 9 : 3, rawMax * 1.15)

  const getX = (i: number) =>
    chartData.length === 1
      ? chartPad.left + plotW / 2
      : chartPad.left + (plotW / (chartData.length - 1)) * i

  const getY = (v: number) =>
    chartPad.top + plotH - (Math.min(v, chartMax) / chartMax) * plotH

  const polylinePoints = chartData
    .map((p, i) => `${getX(i)},${getY(activeMetric === "era" ? p.era : p.whip)}`)
    .join(" ")

  const yTicks = [chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0]

  return (
    <section className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Performance Trend
          </h2>
          <p className="mt-1 text-sm font-medium text-green-900">
            Cumulative {activeMetric.toUpperCase()} over time
          </p>
        </div>

        <div className="grid grid-cols-2 rounded-xl bg-gray-100 p-1 sm:flex">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "all"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-600"
            }`}
          >
            All
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
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No games available yet.
        </div>
      ) : (
        <>
          <div className="mt-4 flex gap-2 sm:mt-6">
            {(["era", "whip"] as TrendMetric[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setActiveMetric(m)}
                className={`rounded-lg px-3 py-2 text-sm font-medium ${
                  activeMetric === m
                    ? "bg-green-900 text-white shadow-sm"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {m.toUpperCase()}
              </button>
            ))}
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
                const v = activeMetric === "era" ? point.era : point.whip
                const y = getY(v)
                const isHovered = hoveredIndex === i

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
                          x={x - 55}
                          y={Math.max(chartPad.top + 4, y - 38)}
                          width="110"
                          height="34"
                          rx="6"
                          fill="#111827"
                          opacity="0.94"
                        />
                        <text
                          x={x}
                          y={Math.max(chartPad.top + 4, y - 38) + 13}
                          textAnchor="middle"
                          className="fill-white text-[10px]"
                        >
                          {point.fullLabel}
                        </text>
                        <text
                          x={x}
                          y={Math.max(chartPad.top + 4, y - 38) + 26}
                          textAnchor="middle"
                          className="fill-white text-[11px]"
                        >
                          {activeMetric.toUpperCase()} {v.toFixed(2)}
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
        </>
      )}
    </section>
  )
}
