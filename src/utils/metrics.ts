import type { SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"

export function calcBattingMetrics(entries: SavedBattingGameEntry[]) {
  const t = entries.reduce(
    (acc, e) => {
      acc.games++
      acc.ab += e.statLine.AB
      acc.h += e.statLine.H
      acc.doubles += e.statLine.doubles
      acc.triples += e.statLine.triples
      acc.hr += e.statLine.HR
      acc.rbi += e.statLine.RBI
      acc.bb += e.statLine.BB
      acc.hbp += e.statLine.HBP ?? 0
      acc.sf += e.statLine.SF ?? 0
      acc.so += e.statLine.SO
      acc.sb += e.statLine.SB ?? 0
      acc.cs += e.statLine.CS ?? 0
      return acc
    },
    { games: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, hbp: 0, sf: 0, so: 0, sb: 0, cs: 0 }
  )
  const singles = Math.max(t.h - t.doubles - t.triples - t.hr, 0)
  const totalBases = singles + t.doubles * 2 + t.triples * 3 + t.hr * 4
  const pa = t.ab + t.bb + t.hbp + t.sf
  const avg = t.ab > 0 ? t.h / t.ab : 0
  const obp = pa > 0 ? (t.h + t.bb + t.hbp) / pa : 0
  const slg = t.ab > 0 ? totalBases / t.ab : 0
  const stolenBaseAttempts = t.sb + t.cs
  const sbPct = stolenBaseAttempts > 0 ? t.sb / stolenBaseAttempts : null
  return { ...t, pa, avg, obp, ops: obp + slg, sbPct }
}

export function calcPitchingMetrics(entries: SavedPitchingGameEntry[]) {
  const t = entries.reduce(
    (acc, e) => {
      acc.games++
      acc.outs += e.statLine.inningsPitchedOuts
      acc.h += e.statLine.hitsAllowed
      acc.r += e.statLine.runsAllowed
      acc.er += e.statLine.earnedRuns
      acc.bb += e.statLine.walks
      acc.hbp += e.statLine.hitBatters
      acc.so += e.statLine.strikeouts
      acc.hr += e.statLine.homeRunsAllowed
      return acc
    },
    { games: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, hbp: 0, so: 0, hr: 0 }
  )
  const ip = t.outs / 3
  const era = ip > 0 ? (t.er * 9) / ip : 0
  const whip = ip > 0 ? (t.bb + t.h) / ip : 0
  return { ...t, ip, era, whip }
}

export function fmtRate(v: number) { return v.toFixed(3).replace("0.", ".") }
export function fmtDecimal(v: number) { return v.toFixed(2) }
export function fmtIp(outs: number) { return `${Math.floor(outs / 3)}.${outs % 3}` }
