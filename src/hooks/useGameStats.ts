import type {
  BattingCalculatedKPI,
  BattingEntryData,
  TrendPoint,
} from "../types"

type UseGameStatsReturn = {
  totals: BattingEntryData
  kpi: BattingCalculatedKPI
  avgTrend: TrendPoint[]
}

export function useGameStats(
  savedEntries: BattingEntryData[]
): UseGameStatsReturn {
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

  const avg =
    totals.AB > 0
      ? (totals.H / totals.AB).toFixed(3).replace("0.", ".")
      : ".000"

  const obp =
    totals.AB + totals.BB > 0
      ? ((totals.H + totals.BB) / (totals.AB + totals.BB))
          .toFixed(3)
          .replace("0.", ".")
      : ".000"

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