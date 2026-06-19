import type { GameLogSplit } from "./types"

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

export function pitchCardColor(key: string, num: number) {
  const cfgs: Record<string, { hi: number; lo: number; lower?: boolean }> = {
    "K-BB%":  { hi: 0.15, lo: 0.05 },
    "LOB%":   { hi: 0.75, lo: 0.65 },
    "IP/G":   { hi: 6.0,  lo: 5.0 },
    "SLG":    { hi: 0.35, lo: 0.45, lower: true },
  }
  const c = cfgs[key]
  if (!c) return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }
  const good = c.lower ? num <= c.hi : num >= c.hi
  const bad  = c.lower ? num >= c.lo : num <= c.lo
  if (good) return { bg: "bg-emerald-50", lbl: "text-emerald-700", val: "text-emerald-900" }
  if (bad)  return { bg: "bg-rose-50",    lbl: "text-rose-600",    val: "text-rose-900" }
  return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }
}

export function inferPitchRole(p: { ipPerG: number; totalSaves: number }): PitchRole {
  if (p.totalSaves >= 2) return "CL"
  if (p.ipPerG >= 3.5) return "SP"
  return "RP"
}

export function buildHittingPoints(log: GameLogSplit[]) {
  let ab = 0, h = 0, bb = 0, hbp = 0, sf = 0, d = 0, t = 0, hr = 0
  return log.map((entry, i) => {
    const s = entry.stat
    ab += s.atBats ?? 0; h += s.hits ?? 0; bb += s.baseOnBalls ?? 0
    hbp += s.hitByPitch ?? 0; sf += s.sacFlies ?? 0
    d += s.doubles ?? 0; t += s.triples ?? 0; hr += s.homeRuns ?? 0
    const singles = Math.max(h - d - t - hr, 0)
    const tb = singles + d * 2 + t * 3 + hr * 4
    const avg = ab > 0 ? h / ab : 0
    const obpDen = ab + bb + hbp + sf
    const obp = obpDen > 0 ? (h + bb + hbp) / obpDen : 0
    const slg = ab > 0 ? tb / ab : 0
    return { game: i + 1, date: entry.date, opp: entry.opponent?.name ?? "", avg, obp, ops: obp + slg }
  })
}

function parseIP(ipStr: string): number {
  const [whole, frac] = ipStr.split(".").map(Number)
  return ((whole || 0) * 3 + (frac || 0)) / 3
}

export function buildPitchingPoints(log: GameLogSplit[]) {
  let totalER = 0, totalOuts = 0, totalH = 0, totalBB = 0, totalK = 0
  let totalHBP = 0, totalR = 0, totalHR = 0, totalBF = 0, totalAB = 0
  let totalD = 0, totalT = 0, qsCount = 0, games = 0, totalSaves = 0

  return log.map((entry, i) => {
    const s = entry.stat
    const gameIP = parseIP(String(s.inningsPitched ?? "0.0"))
    const gameER = s.earnedRuns ?? 0

    totalER  += gameER
    totalH   += s.hits ?? 0
    totalBB  += s.baseOnBalls ?? 0
    totalK   += s.strikeOuts ?? 0
    totalHBP += s.hitByPitch ?? 0
    totalR   += s.runs ?? 0
    totalHR  += s.homeRuns ?? 0
    totalBF  += s.battersFaced ?? 0
    totalAB  += s.atBats ?? 0
    totalD   += s.doubles ?? 0
    totalT   += s.triples ?? 0
    totalOuts += gameIP * 3
    games++

    totalSaves += s.saves ?? 0
    if (gameIP >= 6 && gameER <= 3) qsCount++

    const ip = totalOuts / 3
    const era   = ip > 0 ? (totalER / ip) * 9 : 0
    const whip  = ip > 0 ? (totalH + totalBB) / ip : 0
    const k9    = ip > 0 ? (totalK / ip) * 9 : 0
    const bb9   = ip > 0 ? (totalBB / ip) * 9 : 0
    const kbbPct = totalBF > 0 ? (totalK - totalBB) / totalBF : null
    const ipPerG = games > 0 ? ip / games : 0

    // LOB% = (H + BB + HBP - R) / (H + BB + HBP - 1.4×HR)
    const lobDen = totalH + totalBB + totalHBP - 1.4 * totalHR
    const lobPct = lobDen > 0 ? (totalH + totalBB + totalHBP - totalR) / lobDen : null

    // SLG against = TB / AB
    const singles = Math.max(totalH - totalD - totalT - totalHR, 0)
    const tb = singles + totalD * 2 + totalT * 3 + totalHR * 4
    const slgAgainst = totalAB > 0 ? tb / totalAB : null

    return {
      game: i + 1, date: entry.date, opp: entry.opponent?.name ?? "",
      era, whip, k9, bb9, kbbPct, ipPerG, qsCount, lobPct, slgAgainst, ip, totalSaves,
    }
  })
}
