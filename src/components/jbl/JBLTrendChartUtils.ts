import type { BattingRawGame, PitchingRawGame } from "./stats"

export type ChartMetric = "avg" | "obp" | "ops"
export type PitchRole = "SP" | "RP" | "CL"
export type WindowMode = "recent" | "season"

export const HITTING_SUMMARY = [
  { key: "AVG" as const, desc: "Batting Average" },
  { key: "OBP" as const, desc: "On-base Percentage" },
  { key: "SLG" as const, desc: "Slugging Percentage" },
  { key: "OPS" as const, desc: "On-base Plus Slugging" },
]

export function fmtR(n: number) {
  return n.toFixed(3).replace(/^0\./, ".")
}

export function dateLabel(iso: string) {
  const [, m, d] = iso.split("-")
  return `${Number(m)}/${Number(d)}`
}

export function inferPitchRole(p: { ipPerG: number; totalSaves: number }): PitchRole {
  if (p.totalSaves >= 2) return "CL"
  if (p.ipPerG >= 3.5) return "SP"
  return "RP"
}

export function buildHittingPoints(log: BattingRawGame[]) {
  let ab = 0, h = 0, bb = 0, hr = 0
  return log.map((entry, i) => {
    ab += entry.ab; h += entry.h; bb += entry.bb; hr += entry.hr
    // No doubles/triples in the sim's exported box score, so every non-HR hit
    // is treated as a single — the same approximation the season totals use.
    const singles = Math.max(h - hr, 0)
    const tb = singles + hr * 4
    const pa = ab + bb
    const avg = ab > 0 ? h / ab : 0
    const obp = pa > 0 ? (h + bb) / pa : 0
    const slg = ab > 0 ? tb / ab : 0
    return { game: i + 1, date: entry.date, opp: entry.opp, avg, obp, ops: obp + slg }
  })
}

export function buildPitchingPoints(log: PitchingRawGame[]) {
  let totalER = 0, totalIp = 0, totalH = 0, totalBB = 0, totalSO = 0, totalSaves = 0, games = 0

  return log.map((entry, i) => {
    totalER += entry.er
    totalIp += entry.ip
    totalH += entry.h
    totalBB += entry.bb
    totalSO += entry.so
    totalSaves += entry.saves
    games++

    const era = totalIp > 0 ? (totalER * 9) / totalIp : 0
    const whip = totalIp > 0 ? (totalH + totalBB) / totalIp : 0
    const k9 = totalIp > 0 ? (totalSO * 9) / totalIp : 0
    const bb9 = totalIp > 0 ? (totalBB * 9) / totalIp : 0
    const ipPerG = games > 0 ? totalIp / games : 0

    return { game: i + 1, date: entry.date, opp: entry.opp, era, whip, k9, bb9, ipPerG, ip: totalIp, totalSaves }
  })
}
