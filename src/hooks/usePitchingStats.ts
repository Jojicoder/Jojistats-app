// src/hooks/usePitchingStats.ts

import { useMemo } from "react"
import type { PitchingEntryData } from "../types"

export function usePitchingStats(entries: PitchingEntryData[]) {
  return useMemo(() => {
    const totals = entries.reduce(
      (acc, e) => {
        acc.outs += e.inningsPitchedOuts
        acc.h += e.hitsAllowed
        acc.r += e.runsAllowed
        acc.er += e.earnedRuns
        acc.bb += e.walks
        acc.so += e.strikeouts
        acc.hr += e.homeRunsAllowed
        return acc
      },
      {
        outs: 0,
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 0,
        hr: 0,
      }
    )

    const ip = totals.outs / 3

    const era = ip > 0 ? (totals.er * 9) / ip : 0
    const whip = ip > 0 ? (totals.bb + totals.h) / ip : 0

    return {
      ip: ip.toFixed(1),
      era: era.toFixed(2),
      whip: whip.toFixed(2),
      h: totals.h,
      r: totals.r,
      er: totals.er,
      bb: totals.bb,
      so: totals.so,
      hr: totals.hr,
    }
  }, [entries])
}