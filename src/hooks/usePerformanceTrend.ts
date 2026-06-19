import { useMemo, useState } from "react"
import type { SavedBattingGameEntry } from "../types"
import { fmtRate } from "../utils/metrics"

export type TrendTab = "season" | "last5" | "last3"
export type ChartMetric = "avg" | "obp" | "ops"

export type ChartPoint = {
  label: string
  fullLabel: string
  playerAvg: number
  teamAvg: number
  playerObp: number
  teamObp: number
  playerOps: number
  teamOps: number
}

export type SummaryStats = {
  avg: string
  obp: string
  slg: string
  ops: string
  numericAvg: number
  numericObp: number
  numericSlg: number
  numericOps: number
}

export type StatCardStyle = { bg: string; label: string; value: string }

export const chartWidth = 640
export const chartHeight = 260
export const chartPadding = {
  top: 20,
  right: 24,
  bottom: 40,
  left: 48,
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
  const hbp = entry.statLine.HBP ?? 0
  const sf = entry.statLine.SF ?? 0
  const denominator = entry.statLine.AB + entry.statLine.BB + hbp + sf
  return denominator > 0
    ? (entry.statLine.H + entry.statLine.BB + hbp) / denominator
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
      acc.hbp += entry.statLine.HBP ?? 0
      acc.sf += entry.statLine.SF ?? 0
      return acc
    },
    { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, hbp: 0, sf: 0 }
  )

  const singles = Math.max(totals.h - totals.doubles - totals.triples - totals.hr, 0)
  const totalBases = singles + totals.doubles * 2 + totals.triples * 3 + totals.hr * 4
  const numericAvg = totals.ab > 0 ? totals.h / totals.ab : 0
  const obpDenominator = totals.ab + totals.bb + totals.hbp + totals.sf
  const numericObp = obpDenominator > 0 ? (totals.h + totals.bb + totals.hbp) / obpDenominator : 0
  const numericSlg = totals.ab > 0 ? totalBases / totals.ab : 0
  const numericOps = numericObp + numericSlg

  return {
    avg: fmtRate(numericAvg),
    obp: fmtRate(numericObp),
    slg: fmtRate(numericSlg),
    ops: fmtRate(numericOps),
    numericAvg,
    numericObp,
    numericSlg,
    numericOps,
  }
}

function sortEntriesByGame(entries: SavedBattingGameEntry[]) {
  return [...entries].sort((a, b) => {
    const dateCompare = new Date(a.gameMeta.date).getTime() - new Date(b.gameMeta.date).getTime()
    if (dateCompare !== 0) return dateCompare
    return a.gameMeta.matchNumber - b.gameMeta.matchNumber
  })
}

function filterPlayerEntriesByTab(
  entries: SavedBattingGameEntry[],
  activeTab: TrendTab,
  seasonYear: number
) {
  const sorted = sortEntriesByGame(entries)
  if (activeTab === "last5") return sorted.slice(-5)
  if (activeTab === "last3") return sorted.slice(-3)
  const seasonEntries = sorted.filter((e) => e.gameMeta.seasonYear === seasonYear)
  return seasonEntries.length > 0 ? seasonEntries : sorted
}

function filterTeamEntriesForPlayerWindow(
  teamEntries: SavedBattingGameEntry[],
  playerWindowEntries: SavedBattingGameEntry[]
) {
  const gameKeys = new Set(playerWindowEntries.map(buildGameKey))
  return sortEntriesByGame(teamEntries).filter((e) => gameKeys.has(buildGameKey(e)))
}

function buildChartData(
  playerEntries: SavedBattingGameEntry[],
  teamEntries: SavedBattingGameEntry[]
): ChartPoint[] {
  return playerEntries.map((playerEntry) => {
    const sameGameTeamEntries = teamEntries.filter(
      (e) => e.gameMeta.date === playerEntry.gameMeta.date && e.gameMeta.matchNumber === playerEntry.gameMeta.matchNumber
    )
    const teamTotals = sameGameTeamEntries.reduce(
      (acc, e) => {
        acc.ab += e.statLine.AB; acc.h += e.statLine.H
        acc.doubles += e.statLine.doubles; acc.triples += e.statLine.triples
        acc.hr += e.statLine.HR; acc.bb += e.statLine.BB
        acc.hbp += e.statLine.HBP ?? 0; acc.sf += e.statLine.SF ?? 0
        return acc
      },
      { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, bb: 0, hbp: 0, sf: 0 }
    )

    const playerAvg = getEntryAvg(playerEntry)
    const playerObp = getEntryObp(playerEntry)
    const playerSlg = getEntrySlg(playerEntry)
    const playerOps = playerObp + playerSlg

    const teamSingles = Math.max(teamTotals.h - teamTotals.doubles - teamTotals.triples - teamTotals.hr, 0)
    const teamTotalBases = teamSingles + teamTotals.doubles * 2 + teamTotals.triples * 3 + teamTotals.hr * 4
    const teamAvg = teamTotals.ab > 0 ? teamTotals.h / teamTotals.ab : 0
    const teamObpDenominator = teamTotals.ab + teamTotals.bb + teamTotals.hbp + teamTotals.sf
    const teamObp = teamObpDenominator > 0 ? (teamTotals.h + teamTotals.bb + teamTotals.hbp) / teamObpDenominator : 0
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

export function getStatCardStyle(
  playerValue: number,
  teamValue: number,
  hasMinimumSample: boolean
): StatCardStyle {
  const map: Record<string, StatCardStyle> = {
    emerald: { bg: "bg-emerald-50",  label: "text-emerald-700", value: "text-emerald-900" },
    green:   { bg: "bg-green-50",    label: "text-green-700",   value: "text-green-900"   },
    neutral: { bg: "bg-[#f7f8f3]",   label: "text-gray-400",    value: "text-green-950"   },
    rose:    { bg: "bg-rose-50",      label: "text-rose-600",    value: "text-rose-900"    },
    red:     { bg: "bg-red-50",       label: "text-red-600",     value: "text-red-900"     },
  }
  if (!hasMinimumSample || teamValue <= 0) return map.neutral
  const ratio = playerValue / teamValue
  if (ratio >= 1.25) return map.emerald
  if (ratio >= 1.08) return map.green
  if (ratio < 0.7) return map.red
  if (ratio < 0.85) return map.rose
  return map.neutral
}

export function getChartValues(point: ChartPoint, metric: ChartMetric) {
  if (metric === "obp") return { player: point.playerObp, team: point.teamObp }
  if (metric === "ops") return { player: point.playerOps, team: point.teamOps }
  return { player: point.playerAvg, team: point.teamAvg }
}

export function getPointPosition(
  point: ChartPoint,
  index: number,
  total: number,
  metric: ChartMetric,
  chartMax: number
) {
  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const plotHeight = chartHeight - chartPadding.top - chartPadding.bottom
  const x = total === 1
    ? chartPadding.left + plotWidth / 2
    : chartPadding.left + (plotWidth / (total - 1)) * index

  const { player, team } = getChartValues(point, metric)
  const getY = (value: number) =>
    chartPadding.top + plotHeight - (Math.min(value, chartMax) / chartMax) * plotHeight

  return { x, playerY: getY(player), teamY: getY(team) }
}

export function buildPolyline(
  data: ChartPoint[],
  valueKey: "playerY" | "teamY",
  metric: ChartMetric,
  chartMax: number
) {
  return data
    .map((point, index) => {
      const pos = getPointPosition(point, index, data.length, metric, chartMax)
      return `${pos.x},${pos[valueKey]}`
    })
    .join(" ")
}

export function clampTooltipY(topY: number) {
  return Math.max(chartPadding.top + 4, topY)
}

export function getChartTitle(metric: ChartMetric) {
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
  return Math.max(getMetricBaseMax(metric), maxValue * 1.15)
}

export function usePerformanceTrend(
  playerEntries: SavedBattingGameEntry[],
  teamEntries: SavedBattingGameEntry[],
  seasonYear: number
) {
  const [activeTab, setActiveTab] = useState<TrendTab>("last3")
  const [activeMetric, setActiveMetric] = useState<ChartMetric>("avg")

  const filteredPlayerEntries = useMemo(
    () => filterPlayerEntriesByTab(playerEntries, activeTab, seasonYear),
    [playerEntries, activeTab, seasonYear]
  )
  const filteredTeamEntries = useMemo(
    () => filterTeamEntriesForPlayerWindow(teamEntries, filteredPlayerEntries),
    [teamEntries, filteredPlayerEntries]
  )
  const playerSummary = useMemo(() => getSummary(filteredPlayerEntries), [filteredPlayerEntries])
  const teamSeasonEntries = useMemo(
    () => teamEntries.filter((e) => e.gameMeta.seasonYear === seasonYear),
    [teamEntries, seasonYear]
  )
  const teamSummary = useMemo(() => getSummary(teamSeasonEntries), [teamSeasonEntries])
  const playerPlateAppearances = useMemo(
    () => filteredPlayerEntries.reduce(
      (total, entry) => total + entry.statLine.AB + entry.statLine.BB + (entry.statLine.HBP ?? 0) + (entry.statLine.SF ?? 0),
      0
    ),
    [filteredPlayerEntries]
  )
  const chartData = useMemo(
    () => buildChartData(filteredPlayerEntries, filteredTeamEntries),
    [filteredPlayerEntries, filteredTeamEntries]
  )
  const chartMax = useMemo(() => getChartMax(chartData, activeMetric), [chartData, activeMetric])

  const plotWidth = chartWidth - chartPadding.left - chartPadding.right
  const areaBottomY = chartHeight - chartPadding.bottom
  const areaFirstX = chartData.length <= 1 ? chartPadding.left + plotWidth / 2 : chartPadding.left
  const areaLastX = chartData.length <= 1 ? chartPadding.left + plotWidth : chartPadding.left + plotWidth

  const yTicks = [chartMax, chartMax * 0.75, chartMax * 0.5, chartMax * 0.25, 0]
  const playerLinePoints = buildPolyline(chartData, "playerY", activeMetric, chartMax)
  const teamLinePoints = buildPolyline(chartData, "teamY", activeMetric, chartMax)

  return {
    activeTab, setActiveTab,
    activeMetric, setActiveMetric,
    filteredPlayerEntries,
    playerSummary,
    teamSummary,
    playerPlateAppearances,
    chartData,
    chartMax,
    yTicks,
    playerLinePoints,
    teamLinePoints,
    areaBottomY,
    areaFirstX,
    areaLastX,
  }
}
