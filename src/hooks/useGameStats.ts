import { useMemo } from "react"
import type {
  BattingCalculatedKPI,
  BattingEntryData,
  TrendPoint,
} from "../types"
import { fmtRate } from "../utils/metrics"

type UseGameStatsReturn = {
  totals: BattingEntryData
  kpi: BattingCalculatedKPI
  avgTrend: TrendPoint[]
}

export function useGameStats(
  savedEntries: BattingEntryData[]
): UseGameStatsReturn {
  return useMemo(() => {
    const totals = savedEntries.reduce(
      (acc, entry) => {
        acc.AB += entry.AB
        acc.H += entry.H
        acc.doubles += entry.doubles
        acc.triples += entry.triples
        acc.HR += entry.HR
        acc.RBI += entry.RBI
        acc.BB += entry.BB
        acc.HBP += entry.HBP ?? 0
        acc.SF += entry.SF ?? 0
        acc.SO += entry.SO
        acc.SB += entry.SB ?? 0
        acc.CS += entry.CS ?? 0
        return acc
      },
      { AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0, BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "" }
    )

    const singles = Math.max(totals.H - totals.doubles - totals.triples - totals.HR, 0)
    const totalBases = singles + totals.doubles * 2 + totals.triples * 3 + totals.HR * 4

    const numericObp =
      totals.AB + totals.BB + totals.HBP + totals.SF > 0
        ? (totals.H + totals.BB + totals.HBP) / (totals.AB + totals.BB + totals.HBP + totals.SF)
        : 0
    const numericSlg = totals.AB > 0 ? totalBases / totals.AB : 0
    const stolenBaseAttempts = totals.SB + totals.CS

    const kpi: BattingCalculatedKPI = {
      avg: totals.AB > 0 ? fmtRate(totals.H / totals.AB) : ".000",
      obp: fmtRate(numericObp),
      slg: fmtRate(numericSlg),
      ops: fmtRate(numericObp + numericSlg),
      iso: fmtRate(numericSlg - (totals.AB > 0 ? totals.H / totals.AB : 0)),
      bbPerK: totals.SO > 0 ? (totals.BB / totals.SO).toFixed(2) : "--",
      hr: totals.HR,
      rbi: totals.RBI,
      hbp: totals.HBP,
      sb: totals.SB,
      cs: totals.CS,
      sbPct: stolenBaseAttempts > 0 ? fmtRate(totals.SB / stolenBaseAttempts) : "--",
      gamesPlayed: savedEntries.length,
    }

    const avgTrend: TrendPoint[] = savedEntries.map((entry, index) => ({
      game: `G${index + 1}`,
      value: entry.AB > 0 ? fmtRate(entry.H / entry.AB) : ".000",
    }))

    return { totals, kpi, avgTrend }
  }, [savedEntries])
}
