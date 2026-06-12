export const HITTING_CARDS = [
  // rate stats
  { key: "avg",          label: "AVG",   desc: "Batting Average" },
  { key: "obp",          label: "OBP",   desc: "On-base Percentage" },
  { key: "slg",          label: "SLG",   desc: "Slugging Percentage" },
  { key: "ops",          label: "OPS",   desc: "OBP + SLG" },
  // advanced
  { key: "_bbk",         label: "BB/K",  desc: "Walk / Strikeout Ratio" },
  { key: "_iso",         label: "ISO",   desc: "Isolated Power (SLG − AVG)" },
  { key: "babip",        label: "BABIP", desc: "Batting Avg on Balls in Play" },
  // counting
  { key: "homeRuns",     label: "HR",    desc: "Home Runs" },
  { key: "rbi",          label: "RBI",   desc: "Runs Batted In" },
  { key: "runs",         label: "R",     desc: "Runs Scored" },
  { key: "doubles",      label: "2B",    desc: "Doubles" },
  { key: "stolenBases",  label: "SB",    desc: "Stolen Bases" },
  { key: "strikeOuts",   label: "SO",    desc: "Strikeouts" },
]

export const PITCHING_CARDS = [
  // rate stats
  { key: "era",                label: "ERA",  desc: "Earned Run Average" },
  { key: "whip",               label: "WHIP", desc: "Walks + Hits / IP" },
  { key: "strikeoutsPer9Inn",  label: "K/9",  desc: "Strikeouts per 9 Inn." },
  { key: "walksPer9Inn",       label: "BB/9", desc: "Walks per 9 Inn." },
  { key: "strikeoutWalkRatio", label: "K/BB", desc: "Strikeout / Walk Ratio" },
  { key: "homeRunsPer9",       label: "HR/9", desc: "Home Runs per 9 Inn." },
  // counting
  { key: "wins",               label: "W",    desc: "Wins" },
  { key: "losses",             label: "L",    desc: "Losses" },
  { key: "strikeOuts",         label: "K",    desc: "Strikeouts" },
  { key: "saves",              label: "SV",   desc: "Saves" },
  { key: "holds",              label: "HLD",  desc: "Holds" },
  { key: "blownSaves",         label: "BS",   desc: "Blown Saves" },
  { key: "inningsPitched",     label: "IP",   desc: "Innings Pitched" },
]

export function getStatColor(label: string, value: string) {
  const num = parseFloat(value)
  if (isNaN(num)) return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }

  const cfg: Record<string, { hi: number; lo: number; lowerBetter?: boolean }> = {
    AVG:  { hi: 0.300, lo: 0.240 },
    OBP:  { hi: 0.370, lo: 0.300 },
    SLG:  { hi: 0.500, lo: 0.380 },
    OPS:  { hi: 0.850, lo: 0.650 },
    "BB/K": { hi: 0.50, lo: 0.25 },
    ISO:  { hi: 0.200, lo: 0.100 },
    ERA:  { hi: 3.00, lo: 4.50, lowerBetter: true },
    WHIP: { hi: 1.10, lo: 1.35, lowerBetter: true },
    "K/9":  { hi: 10.0, lo: 7.0 },
    "BB/9": { hi: 2.50, lo: 4.00, lowerBetter: true },
    "K/BB": { hi: 3.00, lo: 1.50 },
    "HR/9": { hi: 0.90, lo: 1.50, lowerBetter: true },
  }

  const c = cfg[label]
  if (!c) return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }

  const good = c.lowerBetter ? num <= c.hi : num >= c.hi
  const bad  = c.lowerBetter ? num >= c.lo : num <= c.lo

  if (good) return { bg: "bg-emerald-50", lbl: "text-emerald-700", val: "text-emerald-900" }
  if (bad)  return { bg: "bg-rose-50",    lbl: "text-rose-600",    val: "text-rose-900"   }
  return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }
}

export function enrichStats(
  raw: Record<string, unknown>,
  group: "hitting" | "pitching"
): Record<string, unknown> {
  if (group === "hitting") {
    const bb   = Number(raw.baseOnBalls ?? 0)
    const so   = Number(raw.strikeOuts  ?? 0)
    const slg  = parseFloat(String(raw.slg ?? "0"))
    const avg  = parseFloat(String(raw.avg ?? "0"))
    return {
      ...raw,
      _bbk: so > 0 ? (bb / so).toFixed(2) : "—",
      _iso: !isNaN(slg - avg) ? (slg - avg).toFixed(3).replace(/^0\./, ".") : "—",
    }
  }
  // pitching — API already provides strikeoutsPer9Inn etc.; compute as fallback
  const so  = Number(raw.strikeOuts   ?? 0)
  const bb  = Number(raw.baseOnBalls  ?? 0)
  const hr  = Number(raw.homeRuns     ?? 0)
  const ipStr = String(raw.inningsPitched ?? "0.0")
  const [w, f] = ipStr.split(".").map(Number)
  const ip = (w || 0) + (f || 0) / 3
  return {
    ...raw,
    strikeoutsPer9Inn:  raw.strikeoutsPer9Inn  ?? (ip > 0 ? ((so / ip) * 9).toFixed(2) : "—"),
    walksPer9Inn:       raw.walksPer9Inn       ?? (ip > 0 ? ((bb / ip) * 9).toFixed(2) : "—"),
    strikeoutWalkRatio: raw.strikeoutWalkRatio ?? (bb > 0 ? (so / bb).toFixed(2)        : "—"),
    homeRunsPer9:       raw.homeRunsPer9       ?? (ip > 0 ? ((hr / ip) * 9).toFixed(2) : "—"),
  }
}

