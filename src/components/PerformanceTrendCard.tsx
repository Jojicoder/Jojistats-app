import { useState } from "react"
import type { SavedBattingGameEntry } from "../types"
import { fmtRate } from "../utils/metrics"
import {
  usePerformanceTrend,
  getStatCardStyle, getChartValues, getPointPosition,
  clampTooltipY, getChartTitle,
  chartWidth, chartHeight, chartPadding,
} from "../hooks/usePerformanceTrend"

type PerformanceTrendCardProps = {
  playerEntries: SavedBattingGameEntry[]
  teamEntries: SavedBattingGameEntry[]
  seasonYear: number
}

const statDescriptions: Record<string, string> = {
  AVG: "Batting Average",
  OBP: "On-base Percentage",
  SLG: "Slugging Percentage",
  OPS: "On-base Plus Slugging",
}

export default function PerformanceTrendCard({
  playerEntries,
  teamEntries,
  seasonYear,
}: PerformanceTrendCardProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const {
    activeTab, setActiveTab,
    activeMetric, setActiveMetric,
    filteredPlayerEntries,
    playerSummary, teamSummary,
    playerPlateAppearances,
    chartData, chartMax, yTicks,
    playerLinePoints, teamLinePoints,
    areaBottomY, areaFirstX, areaLastX,
  } = usePerformanceTrend(playerEntries, teamEntries, seasonYear)

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-base font-bold text-gray-900">Recent Performance</h2>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-green-700">
            Player vs Team Average
          </p>
        </div>

        <div className="grid grid-cols-3 rounded-xl bg-gray-100 p-1 sm:flex sm:items-center sm:gap-2">
          {(["last3", "last5", "season"] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-lg px-3 py-2 text-sm font-medium ${
                activeTab === tab ? "bg-white text-green-900 shadow-sm" : "text-gray-600"
              }`}
            >
              {tab === "last3" ? "Last 3" : tab === "last5" ? "Last 5" : "Seasons"}
            </button>
          ))}
        </div>
      </div>

      {filteredPlayerEntries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No games available for this tab yet.
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { key: "AVG", val: playerSummary.avg, teamVal: teamSummary.avg, num: playerSummary.numericAvg, teamNum: teamSummary.numericAvg },
                { key: "OBP", val: playerSummary.obp, teamVal: teamSummary.obp, num: playerSummary.numericObp, teamNum: teamSummary.numericObp },
                { key: "SLG", val: playerSummary.slg, teamVal: teamSummary.slg, num: playerSummary.numericSlg, teamNum: teamSummary.numericSlg },
                { key: "OPS", val: playerSummary.ops, teamVal: teamSummary.ops, num: playerSummary.numericOps, teamNum: teamSummary.numericOps },
              ] as const
            ).map(({ key, val, teamVal, num, teamNum }) => {
              const s = getStatCardStyle(num, teamNum, playerPlateAppearances >= 5)
              return (
                <div key={key} className={`rounded-xl p-3 sm:p-4 ${s.bg}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest ${s.label}`}>{key}</p>
                  <p className="text-[11px] text-gray-400">{statDescriptions[key]}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${s.value}`}>{val}</p>
                  <p className="mt-0.5 text-xs text-gray-400">Team {teamVal}</p>
                </div>
              )
            })}
          </div>

          <div className="mt-4 rounded-xl bg-[#f7f8f3] p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">{getChartTitle(activeMetric)}</p>
                <p className="text-xs text-gray-500">
                  {filteredPlayerEntries.length} game{filteredPlayerEntries.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="grid grid-cols-3 rounded-xl bg-white p-1 sm:flex sm:items-center sm:gap-2">
                {(["avg", "obp", "ops"] as const).map((metric) => (
                  <button
                    key={metric}
                    type="button"
                    onClick={() => setActiveMetric(metric)}
                    className={`rounded-lg px-3 py-2 text-sm font-medium ${
                      activeMetric === metric ? "bg-green-900 text-white shadow-sm" : "text-gray-600"
                    }`}
                  >
                    {metric.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 overflow-x-auto sm:mt-6">
              <svg
                className="h-64 min-w-[420px] w-full sm:h-72 sm:min-w-130"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Player and team performance trend"
              >
                {yTicks.map((tick) => {
                  const y =
                    chartPadding.top +
                    (chartHeight - chartPadding.top - chartPadding.bottom) * (1 - tick / chartMax)
                  return (
                    <g key={tick}>
                      <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                      <text x={chartPadding.left - 10} y={y + 4} textAnchor="end" className="fill-gray-500 text-[11px]">
                        {fmtRate(tick)}
                      </text>
                    </g>
                  )
                })}

                <line x1={chartPadding.left} x2={chartPadding.left} y1={chartPadding.top} y2={chartHeight - chartPadding.bottom} stroke="#d1d5db" />
                <line x1={chartPadding.left} x2={chartWidth - chartPadding.right} y1={chartHeight - chartPadding.bottom} y2={chartHeight - chartPadding.bottom} stroke="#d1d5db" />

                <defs>
                  <linearGradient id="player-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#166534" stopOpacity="0.15" />
                    <stop offset="100%" stopColor="#166534" stopOpacity="0" />
                  </linearGradient>
                  <linearGradient id="team-area-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2563eb" stopOpacity="0.1" />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                  </linearGradient>
                </defs>

                {chartData.length >= 1 && (
                  <>
                    <polygon points={`${teamLinePoints} ${areaLastX},${areaBottomY} ${areaFirstX},${areaBottomY}`} fill="url(#team-area-fill)" />
                    <polygon points={`${playerLinePoints} ${areaLastX},${areaBottomY} ${areaFirstX},${areaBottomY}`} fill="url(#player-area-fill)" />
                  </>
                )}

                <polyline points={teamLinePoints} fill="none" stroke="#2563eb" strokeWidth="2" strokeDasharray="6 4" strokeLinejoin="round" strokeLinecap="round" />
                <polyline points={playerLinePoints} fill="none" stroke="#166534" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

                {chartData.map((point, index) => {
                  const position = getPointPosition(point, index, chartData.length, activeMetric, chartMax)
                  const values = getChartValues(point, activeMetric)
                  const isHovered = hoveredIndex === index

                  return (
                    <g
                      key={`${point.fullLabel}-${index}`}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <circle cx={position.x} cy={position.teamY} r={isHovered ? "5" : "3.5"} fill="#2563eb" />
                      <circle cx={position.x} cy={position.playerY} r={isHovered ? "6" : "4.5"} fill="#166534" />

                      {isHovered && (() => {
                        const tooltipY = clampTooltipY(Math.min(position.playerY, position.teamY) - 42)
                        const tooltipX = Math.max(chartPadding.left, Math.min(position.x - 60, chartWidth - chartPadding.right - 120))
                        return (
                          <>
                            <rect x={tooltipX} y={tooltipY} width="120" height="48" rx="6" fill="#111827" opacity="0.94" />
                            <text x={tooltipX + 60} y={tooltipY + 13} textAnchor="middle" className="fill-white text-[10px]">{point.fullLabel}</text>
                            <text x={tooltipX + 60} y={tooltipY + 27} textAnchor="middle" className="fill-white text-[11px]">{`Player ${fmtRate(values.player)}`}</text>
                            <text x={tooltipX + 60} y={tooltipY + 40} textAnchor="middle" className="fill-white text-[11px]">{`Team ${fmtRate(values.team)}`}</text>
                          </>
                        )
                      })()}

                      <text x={position.x} y={chartHeight - 12} textAnchor="middle" className="fill-gray-500 text-[11px]">
                        {point.label}
                      </text>
                    </g>
                  )
                })}
              </svg>

              <div className="mt-3 flex items-center gap-5 text-xs text-gray-600">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full bg-green-800" />
                  Player
                </span>
                <span className="flex items-center gap-2">
                  <span className="h-2 w-6 rounded-full border-2 border-blue-600 border-dashed" />
                  Team Avg
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}
