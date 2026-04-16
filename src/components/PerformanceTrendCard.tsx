import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"

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

type TrendTab = "season" | "last5"
type ChartMetric = "avg" | "obp" | "ops"

type ChartPoint = {
  label: string
  fullLabel: string
  playerAvg: number
  teamAvg: number
  playerObp: number
  teamObp: number
  playerOps: number
  teamOps: number
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
}

const chartWidth = 640
const chartHeight = 260
const chartPadding = {
  top: 20,
  right: 24,
  bottom: 40,
  left: 48,
}

function formatRate(value: number): string {
  return value.toFixed(3).replace("0.", ".")
}

function formatGameLabel(date: string) {
  const [, month, day] = date.split("-")
  return `${Number(month)}/${Number(day)}`
}

function buildGameKey(entry: SavedBattingGameEntry) {
  return `${entry.gameMeta.date}-${entry.gameMeta.matchNumber}`
}

function getEntryAvg(entry: SavedBattingGameEntry): number {
  return entry.statLine.AB > 0 ? entry.statLine.H / entry.statLine.AB : 0
}

function getEntryObp(entry: SavedBattingGameEntry): number {
  const denominator = entry.statLine.AB + entry.statLine.BB
  return denominator > 0
    ? (entry.statLine.H + entry.statLine.BB) / denominator
    : 0
}

function getEntrySlg(entry: SavedBattingGameEntry): number {
  const { AB, H, doubles, triples, HR } = entry.statLine
  if (AB === 0) return 0

  const singles = Math.max(H - doubles - triples - HR, 0)
  const totalBases = singles + doubles * 2 + triples * 3 + HR * 4
  return totalBases / AB
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

  const obpDenominator = totals.ab + totals.bb
  const numericObp =
    obpDenominator > 0 ? (totals.h + totals.bb) / obpDenominator : 0

  const numericSlg = totals.ab > 0 ? totalBases / totals.ab : 0
  const numericOps = numericObp + numericSlg

  return {
    avg: formatRate(numericAvg),
    obp: formatRate(numericObp),
    slg: formatRate(numericSlg),
    ops: formatRate(numericOps),
    numericAvg,
    numericObp,
    numericSlg,
    numericOps,
  }
}

function sortEntriesByGame(entries: SavedBattingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare =
      new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()

    if (dateCompare !== 0) return dateCompare

    return a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

function filterPlayerEntriesByTab(
  entries: SavedBattingGameEntry[],
  activeTab: TrendTab,
  seasonYear: number
) {
  const sortedEntries = sortEntriesByGame(entries)

  if (activeTab === "last5") {
    return sortedEntries.slice(-5)
  }

  return sortedEntries.filter(
    (entry) => entry.gameMeta.seasonYear === seasonYear
  )
}

function filterTeamEntriesForPlayerWindow(
  teamEntries: SavedBattingGameEntry[],
  playerWindowEntries: SavedBattingGameEntry[]
) {
  const gameKeys = new Set(playerWindowEntries.map(buildGameKey))
  return sortEntriesByGame(teamEntries).filter((entry) =>
    gameKeys.has(buildGameKey(entry))
  )
}

function buildChartData(
  playerEntries: SavedBattingGameEntry[],
  teamEntries: SavedBattingGameEntry[]
): ChartPoint[] {
  return playerEntries.map((playerEntry) => {
    const sameGameTeamEntries = teamEntries.filter(
      (teamEntry) =>
        teamEntry.gameMeta.date === playerEntry.gameMeta.date &&
        teamEntry.gameMeta.matchNumber === playerEntry.gameMeta.matchNumber
    )

    const teamTotals = sameGameTeamEntries.reduce(
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

    const playerAvg = getEntryAvg(playerEntry)
    const playerObp = getEntryObp(playerEntry)
    const playerSlg = getEntrySlg(playerEntry)
    const playerOps = playerObp + playerSlg

    const teamSingles = Math.max(
      teamTotals.h - teamTotals.doubles - teamTotals.triples - teamTotals.hr,
      0
    )

    const teamTotalBases =
      teamSingles +
      teamTotals.doubles * 2 +
      teamTotals.triples * 3 +
      teamTotals.hr * 4

    const teamAvg = teamTotals.ab > 0 ? teamTotals.h / teamTotals.ab : 0

    const teamObpDenominator = teamTotals.ab + teamTotals.bb
    const teamObp =
      teamObpDenominator > 0
        ? (teamTotals.h + teamTotals.bb) / teamObpDenominator
        : 0

    const teamSlg = teamTotals.ab > 0 ? teamTotalBases / teamTotals.ab : 0
    const teamOps = teamObp + teamSlg

    return {
      label: formatGameLabel(playerEntry.gameMeta.date),
      fullLabel: `${playerEntry.gameMeta.date} vs ${playerEntry.gameMeta.opponent}`,
      playerAvg: Number(playerAvg.toFixed(3)),
      teamAvg: Number(teamAvg.toFixed(3)),
      playerObp: Number(playerObp.toFixed(3)),
      teamObp: Number(teamObp.toFixed(3)),
      playerOps: Number(playerOps.toFixed(3)),
      teamOps: Number(teamOps.toFixed(3)),
    }
  })
}

function getStatCardClass(
  playerValue: number,
  _teamValue: number,
  type: "avg" | "obp" | "neutral"
) {
  const strongGood = "rounded-xl border border-emerald-300 bg-emerald-100 p-4"
  const good = "rounded-xl border border-green-200 bg-green-50 p-4"
  const neutral = "rounded-xl border border-gray-200 bg-white p-4"
  const weak = "rounded-xl border border-rose-200 bg-rose-50 p-4"
  const bad = "rounded-xl border border-red-200 bg-red-50 p-4"

  if (type === "avg") {
    if (playerValue >= 0.33) return strongGood
    if (playerValue >= 0.3) return good
    if (playerValue >= 0.25) return neutral
    if (playerValue >= 0.22) return weak
    return bad
  }

  if (type === "obp") {
    if (playerValue >= 0.4) return strongGood
    if (playerValue >= 0.37) return good
    if (playerValue >= 0.31) return neutral
    if (playerValue >= 0.28) return weak
    return bad
  }

  return neutral
}

function getChartValues(point: ChartPoint, metric: ChartMetric) {
  if (metric === "obp") {
    return {
      player: point.playerObp,
      team: point.teamObp,
    }
  }

  if (metric === "ops") {
    return {
      player: point.playerOps,
      team: point.teamOps,
    }
  }

  return {
    player: point.playerAvg,
    team: point.teamAvg,
  }
}

function getPointPosition(
  point: ChartPoint,
  index: number,
  total: number,
  metric: ChartMetric,
  chartMax: number
) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const x =
    total === 1
      ? chartPadding.left + plotWidth / 2
      : chartPadding.left + (plotWidth / (total - 1)) * index

  const { player, team } = getChartValues(point, metric)

  const getY = (value: number) =>
    chartPadding.top +
    plotHeight -
    (Math.min(value, chartMax) / chartMax) * plotHeight

  return {
    x,
    playerY: getY(player),
    teamY: getY(team),
  }
}

function buildPolyline(
  data: ChartPoint[],
  valueKey: "playerY" | "teamY",
  metric: ChartMetric,
  chartMax: number
) {
  return data
    .map((point, index) => {
      const position = getPointPosition(
        point,
        index,
        data.length,
        metric,
        chartMax
      )
      return `${position.x},${position[valueKey]}`
    })
    .join(" ")
}

function formatTick(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

function clampTooltipY(topY: number) {
  return Math.max(chartPadding.top + 4, topY)
}

function getChartTitle(metric: ChartMetric) {
  if (metric === "obp") return "OBP Trend"
  if (metric === "ops") return "OPS Trend"
  return "AVG Trend"
}

function getMetricBaseMax(metric: ChartMetric) {
  if (metric === "ops") return 1.0
  return 0.6
}

function getChartMax(data: ChartPoint[], metric: ChartMetric) {
  const values = data.flatMap((point) => {
    const current = getChartValues(point, metric)
    return [current.player, current.team]
  })

  const maxValue = Math.max(...values, 0)
  const paddedMax = maxValue * 1.15
  const baseMax = getMetricBaseMax(metric)

  return Math.max(baseMax, paddedMax)
}

export default function PerformanceTrendCard({
  playerEntries,
  teamEntries,
  seasonYear,
}: PerformanceTrendCardProps) {
  const [activeTab, setActiveTab] = useState<TrendTab>("season")
  const [activeMetric, setActiveMetric] = useState<ChartMetric>("avg")
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  const filteredPlayerEntries = useMemo(
    () => filterPlayerEntriesByTab(playerEntries, activeTab, seasonYear),
    [playerEntries, activeTab, seasonYear]
  )

  const filteredTeamEntries = useMemo(
    () => filterTeamEntriesForPlayerWindow(teamEntries, filteredPlayerEntries),
    [teamEntries, filteredPlayerEntries]
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

  const chartMax = useMemo(
    () => getChartMax(chartData, activeMetric),
    [chartData, activeMetric]
  )

  const yTicks = [
    chartMax,
    chartMax * 0.75,
    chartMax * 0.5,
    chartMax * 0.25,
    0,
  ]

  const playerLinePoints = buildPolyline(
    chartData,
    "playerY",
    activeMetric,
    chartMax
  )

  const teamLinePoints = buildPolyline(
    chartData,
    "teamY",
    activeMetric,
    chartMax
  )

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
      "avg"
    )}
  >
    <div>
      <p className="text-xs font-semibold text-gray-700">AVG</p>
      <p className="text-[11px] text-gray-400">{statDescriptions.AVG}</p>
    </div>
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
      "obp"
    )}
  >
            <div>
              <p className="text-xs font-semibold text-gray-700">OBP</p>
              <p className="text-[11px] text-gray-400">{statDescriptions.OBP}</p>
            </div>
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
              "neutral"
            )}
          >
            <div>
              <p className="text-xs font-semibold text-gray-700">SLG</p>
              <p className="text-[11px] text-gray-400">{statDescriptions.SLG}</p>
            </div>
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
              "neutral"
            )}
          >
            <div>
              <p className="text-xs font-semibold text-gray-700">OPS</p>
              <p className="text-[11px] text-gray-400">{statDescriptions.OPS}</p>
            </div>
            <p className="mt-2 text-2xl font-bold text-gray-900">
              {playerSummary.ops}
            </p>
            <p className="mt-1 text-xs text-gray-500">
              Team {teamSummary.ops}
            </p>
          </div>
        </div>

          <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-medium text-gray-700">
                  {getChartTitle(activeMetric)}
                </p>
                <p className="text-xs text-gray-500">
                  {filteredPlayerEntries.length} game
                  {filteredPlayerEntries.length === 1 ? "" : "s"}
                </p>
              </div>

              <div className="flex items-center gap-2 rounded-xl bg-white p-1">
                <button
                  type="button"
                  onClick={() => setActiveMetric("avg")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    activeMetric === "avg"
                      ? "bg-green-900 text-white shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  AVG
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMetric("obp")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    activeMetric === "obp"
                      ? "bg-green-900 text-white shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  OBP
                </button>

                <button
                  type="button"
                  onClick={() => setActiveMetric("ops")}
                  className={`rounded-lg px-3 py-2 text-sm font-medium ${
                    activeMetric === "ops"
                      ? "bg-green-900 text-white shadow-sm"
                      : "text-gray-600"
                  }`}
                >
                  OPS
                </button>
              </div>
            </div>

            <div className="mt-6 overflow-x-auto">
              <svg
                className="h-72 min-w-130 w-full"
                viewBox={`0 0 ${chartWidth} ${chartHeight}`}
                role="img"
                aria-label="Player and team performance trend"
              >
                {yTicks.map((tick) => {
                  const y =
                    chartPadding.top +
                    (chartHeight - chartPadding.top - chartPadding.bottom) *
                      (1 - tick / chartMax)

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
                    chartData.length,
                    activeMetric,
                    chartMax
                  )

                  const values = getChartValues(point, activeMetric)
                  const isHovered = hoveredIndex === index

                  return (
                    <g
                      key={`${point.fullLabel}-${index}`}
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

                      {isHovered &&
                        (() => {
                          const tooltipY = clampTooltipY(
                            Math.min(position.playerY, position.teamY) - 42
                          )

                          return (
                            <>
                              <rect
                                x={position.x - 60}
                                y={tooltipY}
                                width="120"
                                height="48"
                                rx="6"
                                fill="#111827"
                                opacity="0.94"
                              />
                              <text
                                x={position.x}
                                y={tooltipY + 13}
                                textAnchor="middle"
                                className="fill-white text-[10px]"
                              >
                                {point.fullLabel}
                              </text>
                              <text
                                x={position.x}
                                y={tooltipY + 27}
                                textAnchor="middle"
                                className="fill-white text-[11px]"
                              >
                                {`Player ${formatTick(values.player)}`}
                              </text>
                              <text
                                x={position.x}
                                y={tooltipY + 40}
                                textAnchor="middle"
                                className="fill-white text-[11px]"
                              >
                                {`Team ${formatTick(values.team)}`}
                              </text>
                            </>
                          )
                        })()}

                      <text
                        x={position.x}
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