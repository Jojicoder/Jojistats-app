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

function formatRate(value: number): string {
  return value.toFixed(3).replace("0.", ".")
}

function formatRatio(value: number): string {
  return value.toFixed(2)
}

export function useGameStats(
  savedEntries: BattingEntryData[]
): UseGameStatsReturn {
  const totals = savedEntries.reduce(
    (acc, entry) => {
      acc.AB += entry.AB
      acc.H += entry.H
      acc.doubles += entry.doubles
      acc.triples += entry.triples
      acc.HR += entry.HR
      acc.RBI += entry.RBI
      acc.BB += entry.BB
      acc.SO += entry.SO
      return acc
    },
    {
      AB: 0,
      H: 0,
      doubles: 0,
      triples: 0,
      HR: 0,
      RBI: 0,
      BB: 0,
      SO: 0,
    }
  )

  const singles = Math.max(
    totals.H - totals.doubles - totals.triples - totals.HR,
    0
  )

  const totalBases =
    singles +
    totals.doubles * 2 +
    totals.triples * 3 +
    totals.HR * 4

  const avg = totals.AB > 0 ? formatRate(totals.H / totals.AB) : ".000"

  const numericObp =
    totals.AB + totals.BB > 0
      ? (totals.H + totals.BB) / (totals.AB + totals.BB)
      : 0

  const obp = formatRate(numericObp)

  const numericSlg = totals.AB > 0 ? totalBases / totals.AB : 0
  const slg = formatRate(numericSlg)

  const ops = formatRate(numericObp + numericSlg)
  const iso = formatRate(numericSlg - (totals.AB > 0 ? totals.H / totals.AB : 0))

  let bbPerK = "0.00"
  if (totals.SO === 0 && totals.BB > 0) {
    bbPerK = "--"
  } else if (totals.SO > 0) {
    bbPerK = formatRatio(totals.BB / totals.SO)
  }

  const avgTrend: TrendPoint[] = savedEntries.map((entry, index) => {
    const gameAvg =
      entry.AB > 0 ? formatRate(entry.H / entry.AB) : ".000"

    return {
      game: `G${index + 1}`,
      value: gameAvg,
    }
  })

  const kpi: BattingCalculatedKPI = {
    avg,
    obp,
    slg,
    ops,
    iso,
    bbPerK,
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