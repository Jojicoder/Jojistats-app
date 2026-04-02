import type {
  BattingCalculatedKPI,
  BattingEntryData,
  TrendPoint,
} from "../types"

// Defines the shape of the data returned by this custom hook.
// totals: cumulative raw batting totals across all saved entries
// kpi: calculated batting KPI values for dashboard cards
// avgTrend: game-by-game batting average trend for the chart
type UseGameStatsReturn = {
  totals: BattingEntryData
  kpi: BattingCalculatedKPI
  avgTrend: TrendPoint[]
}

// This hook takes saved batting entries for one player
// and converts them into dashboard-friendly calculated data.
export function useGameStats(
  savedEntries: BattingEntryData[]
): UseGameStatsReturn {
  // Sum all saved entries to build cumulative batting totals.
  const totals = savedEntries.reduce(
    (acc, entry) => {
      acc.AB += entry.AB
      acc.H += entry.H
      acc.HR += entry.HR
      acc.RBI += entry.RBI
      acc.BB += entry.BB
      acc.SO += entry.SO
      return acc
    },
    {
      AB: 0,
      H: 0,
      HR: 0,
      RBI: 0,
      BB: 0,
      SO: 0,
    }
  )

  // Calculate batting average from cumulative totals.
  const avg =
    totals.AB > 0
      ? (totals.H / totals.AB).toFixed(3).replace("0.", ".")
      : ".000"

  // Calculate a simplified OBP for MVP scope.
  // Official OBP usually includes HBP and SF,
  // but MVP currently uses only H and BB.
  const obp =
    totals.AB + totals.BB > 0
      ? ((totals.H + totals.BB) / (totals.AB + totals.BB))
          .toFixed(3)
          .replace("0.", ".")
      : ".000"

  // Build AVG trend points from each saved entry.
  // Each saved game becomes one point: G1, G2, G3, ...
  const avgTrend: TrendPoint[] = savedEntries.map((entry, index) => {
    const gameAvg =
      entry.AB > 0
        ? (entry.H / entry.AB).toFixed(3).replace("0.", ".")
        : ".000"

    return {
      game: `G${index + 1}`,
      value: gameAvg,
    }
  })

  // Build the final batting KPI object for dashboard display.
  const kpi: BattingCalculatedKPI = {
    avg,
    obp,
    hr: totals.HR,
    rbi: totals.RBI,
    gamesPlayed: savedEntries.length,
  }

  return {
    totals,
    kpi,
    avgTrend,
  }
}