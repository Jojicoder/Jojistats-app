import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

type PerformanceTrendCardProps = {
  playerEntries: SavedBattingGameEntry[]
  teamEntries: SavedBattingGameEntry[]
  seasonYear: number
}

type TrendTab = "season" | "last5" | "total"

type ChartPoint = {
  label: string
  playerAvg: number
  teamAvg: number
}

type SummaryStats = {
  avg: string
  obp: string
  slg: string
  ops: string
  numericAvg: number
  numericObp: number
  numericSlg: number
  numericOps: number
  totalAB: number
  totalPA: number
}

const chartWidth = 640
const chartHeight = 260
const chartPadding = {
  top: 20,
  right: 24,
  bottom: 36,
  left: 48,
}
const chartMaxAvg = 0.6

function formatRate(value: number): string {
  return value.toFixed(3).replace("0.", ".")
}

function getSummary(entries: SavedBattingGameEntry[]): SummaryStats {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.ab += entry.statLine.AB
      acc.h += entry.statLine.H
      acc.doubles += entry.statLine.doubles
      acc.triples += entry.statLine.triples
      acc.hr += entry.statLine.HR
      acc.bb += entry.statLine.BB
      return acc
    },
    { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0 }
  )

  const singles = Math.max(
    totals.h - totals.doubles - totals.triples - totals.hr,
    0
  )

  const totalBases =
    singles +
    totals.doubles * 2 +
    totals.triples * 3 +
    totals.hr * 4

  const numericAvg = totals.ab > 0 ? totals.h / totals.ab : 0

  const totalPA = totals.ab + totals.bb
  const numericObp =
    totalPA > 0 ? (totals.h + totals.bb) / totalPA : 0

  const numericSlg = totals.ab > 0 ? totalBases / totals.ab : 0
  const numericOps =
    totals.ab > 0 && totalPA > 0 ? numericObp + numericSlg : 0

  return {
    avg: formatRate(numericAvg),
    obp: formatRate(numericObp),
    slg: formatRate(numericSlg),
    ops: formatRate(numericOps),
    numericAvg,
    numericObp,
    numericSlg,
    numericOps,
    totalAB: totals.ab,
    totalPA,
  }
}

function filterEntriesByTab(
  entries: SavedBattingGameEntry[],
  activeTab: TrendTab,
  seasonYear: number
) {
  if (activeTab === "last5") {
    return entries.slice(-5)
  }

  if (activeTab === "season") {
    return entries.filter((entry) => entry.gameMeta.seasonYear === seasonYear)
  }

  return entries
}

function buildChartData(
  playerEntries: SavedBattingGameEntry[],
  teamEntries: SavedBattingGameEntry[]
): ChartPoint[] {
  return playerEntries.map((playerEntry, index) => {
    const sameGameTeamEntries = teamEntries.filter(
      (teamEntry) =>
        teamEntry.gameMeta.date === playerEntry.gameMeta.date &&
        teamEntry.gameMeta.matchNumber === playerEntry.gameMeta.matchNumber
    )

    const teamTotals = sameGameTeamEntries.reduce(
      (acc, entry) => {
        acc.ab += entry.statLine.AB
        acc.h += entry.statLine.H
        return acc
      },
      { ab: 0, h: 0 }
    )

    const playerAvg =
      playerEntry.statLine.AB > 0
        ? playerEntry.statLine.H / playerEntry.statLine.AB
        : 0

    const teamAvg = teamTotals.ab > 0 ? teamTotals.h / teamTotals.ab : 0

    return {
      label: `G${index + 1}`,
      playerAvg: Number(playerAvg.toFixed(3)),
      teamAvg: Number(teamAvg.toFixed(3)),
    }
  })
}

function getStatCardClass(
  playerValue: number,
  _teamValue: number,
  type: "avg" | "obp" | "neutral",
  hasData: boolean = true
) {
  if (!hasData) {
    return "rounded-xl bg-gray-50 border border-gray-200 p-4"
  }

  if (type === "avg") {
    if (playerValue >= 0.3) {
      return "rounded-xl bg-green-50 border border-green-200 p-4"
    }
    if (playerValue >= 0.25) {
      return "rounded-xl bg-yellow-50 border border-yellow-200 p-4"
    }
    return "rounded-xl bg-red-50 border border-red-200 p-4"
  }

  if (type === "obp") {
    if (playerValue >= 0.37) {
      return "rounded-xl bg-green-50 border border-green-200 p-4"
    }
    if (playerValue >= 0.31) {
      return "rounded-xl bg-yellow-50 border border-yellow-200 p-4"
    }
    return "rounded-xl bg-red-50 border border-red-200 p-4"
  }

  return "rounded-xl bg-gray-50 border border-gray-200 p-4"
}

function getPointPosition(point: ChartPoint, index: number, total: number) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const x =
    total === 1
      ? chartPadding.left + plotWidth / 2
      : chartPadding.left + (plotWidth / (total - 1)) * index

  const getY = (value: number) =>
    chartPadding.top +
    plotHeight -
    (Math.min(value, chartMaxAvg) / chartMaxAvg) * plotHeight

  return {
    x,
    playerY: getY(point.playerAvg),
    teamY: getY(point.teamAvg),
  }
}

function buildPolyline(data: ChartPoint[], valueKey: "playerY" | "teamY") {
  return data
    .map((point, index) => {
      const position = getPointPosition(point, index, data.length)
      return `${position.x},${position[valueKey]}`
    })
    .join(" ")
}

function formatTick(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

export default function PerformanceTrendCard({
  playerEntries,
  teamEntries,
  seasonYear,
}: PerformanceTrendCardProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("season")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const filteredPlayerEntries = useMemo(
    () => filterEntriesByTab(playerEntries, activeTab, seasonYear),
    [playerEntries, activeTab, seasonYear]
  )

  const filteredTeamEntries = useMemo(
    () => filterEntriesByTab(teamEntries, activeTab, seasonYear),
    [teamEntries, activeTab, seasonYear]
  )

  const playerSummary = useMemo(
    () => getSummary(filteredPlayerEntries),
    [filteredPlayerEntries]
  )

  const teamSummary = useMemo(
    () => getSummary(filteredTeamEntries),
    [filteredTeamEntries]
  )

  const chartData = useMemo(
    () => buildChartData(filteredPlayerEntries, filteredTeamEntries),
    [filteredPlayerEntries, filteredTeamEntries]
  )

  const hasAvgData = playerSummary.totalAB > 0
  const hasObpData = playerSummary.totalPA > 0
  const hasSlgData = playerSummary.totalAB > 0
  const hasOpsData = playerSummary.totalAB > 0 && playerSummary.totalPA > 0

  const yTicks = [0.6, 0.45, 0.3, 0.15, 0]
  const playerLinePoints = buildPolyline(chartData, "playerY")
  const teamLinePoints = buildPolyline(chartData, "teamY")

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Recent performance
          </h2>
          <p className="mt-2 text-sm font-medium text-green-900">
            Player vs Team Average
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-xl bg-gray-100 p-1">
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
            onClick={() => setActiveTab("total")}
            className={`rounded-lg px-3 py-2 text-sm font-medium ${
              activeTab === "total"
                ? "bg-white text-green-900 shadow-sm"
                : "text-gray-600"
            }`}
          >
            Total
          </button>
        </div>
      </div>

      {filteredPlayerEntries.length === 0 ? (
        <div className="mt-6 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-500">
          No games available for this tab yet.
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-4">
            <div
              className={getStatCardClass(
                playerSummary.numericAvg,
                teamSummary.numericAvg,
                "avg",
                hasAvgData
              )}
            >
              <p className="text-xs font-medium text-gray-500">AVG</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {playerSummary.avg}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Team {teamSummary.avg}
              </p>
            </div>

            <div
              className={getStatCardClass(
                playerSummary.numericObp,
                teamSummary.numericObp,
                "obp",
                hasObpData
              )}
            >
              <p className="text-xs font-medium text-gray-500">OBP</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {playerSummary.obp}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Team {teamSummary.obp}
              </p>
            </div>

            <div
              className={getStatCardClass(
                playerSummary.numericSlg,
                teamSummary.numericSlg,
                "neutral",
                hasSlgData
              )}
            >
              <p className="text-xs font-medium text-gray-500">SLG</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {playerSummary.slg}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Team {teamSummary.slg}
              </p>
            </div>

            <div
              className={getStatCardClass(
                playerSummary.numericOps,
                teamSummary.numericOps,
                "neutral",
                hasOpsData
              )}
            >
              <p className="text-xs font-medium text-gray-500">OPS</p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {playerSummary.ops}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Team {teamSummary.ops}
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-700">AVG Trend</p>
              <p className="text-xs text-gray-500">
                {filteredPlayerEntries.length} game
                {filteredPlayerEntries.length === 1 ? "" : "s"}
              </p>
            </div>

            <div className="mt-6 overflow-x-auto">
              <svg
                className="h-72 min-w-[520px] w-full"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Player and team batting average trend"
              >
                {yTicks.map((tick) => {
                  const y =
                    chartPadding.top +
                    (chartHeight - chartPadding.top - chartPadding.bottom) *
                      (1 - tick / chartMaxAvg)

                  return (
                    <g key={tick}>
                      <line
                        x1={chartPadding.left}
                        x2={chartWidth - chartPadding.right}
                        y1={y}
                        y2={y}
                        stroke="#e5e7eb"
                        strokeDasharray="4 4"
                      />
                      <text
                        x={chartPadding.left - 10}
                        y={y + 4}
                        textAnchor="end"
                        className="fill-gray-500 text-[11px]"
                      >
                        {formatTick(tick)}
                      </text>
                    </g>
                  )
                })}

                <line
                  x1={chartPadding.left}
                  x2={chartPadding.left}
                  y1={chartPadding.top}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="#d1d5db"
                />
                <line
                  x1={chartPadding.left}
                  x2={chartWidth - chartPadding.right}
                  y1={chartHeight - chartPadding.bottom}
                  y2={chartHeight - chartPadding.bottom}
                  stroke="#d1d5db"
                />

                <polyline
                  points={teamLinePoints}
                  fill="none"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeDasharray="6 4"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <polyline
                  points={playerLinePoints}
                  fill="none"
                  stroke="#166534"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {chartData.map((point, index) => {
                  const position = getPointPosition(
                    point,
                    index,
                    chartData.length
                  )

                  const isHovered = hoveredIndex === index

                  return (
                    <g
                      key={`${point.label}-${index}`}
                      onMouseEnter={() => setHoveredIndex(index)}
                      onMouseLeave={() => setHoveredIndex(null)}
                    >
                      <circle
                        cx={position.x}
                        cy={position.teamY}
                        r={isHovered ? "5" : "3.5"}
                        fill="#2563eb"
                      />
                      <circle
                        cx={position.x}
                        cy={position.playerY}
                        r={isHovered ? "6" : "4.5"}
                        fill="#166534"
                      />

                      {isHovered && (
                        <>
                          <rect
                            x={position.x - 52}
                            y={Math.min(position.playerY, position.teamY) - 42}
                            width="104"
                            height="34"
                            rx="6"
                            fill="#111827"
                            opacity="0.92"
                          />
                          <text
                            x={position.x}
                            y={Math.min(position.playerY, position.teamY) - 28}
                            textAnchor="middle"
                            className="fill-white text-[11px]"
                          >
                            {`Player ${formatTick(point.playerAvg)}`}
                          </text>
                          <text
                            x={position.x}
                            y={Math.min(position.playerY, position.teamY) - 15}
                            textAnchor="middle"
                            className="fill-white text-[11px]"
                          >
                            {`Team ${formatTick(point.teamAvg)}`}
                          </text>
                        </>
                      )}

                      <text
                        x={position.x}
                        y={chartHeight - 14}
                        textAnchor="middle"
                        className="fill-gray-500 text-[11px]"
                      >
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