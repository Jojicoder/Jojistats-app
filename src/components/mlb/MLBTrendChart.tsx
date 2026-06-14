import { useEffect, useMemo, useState } from "react"
import { getStatColor } from "./playerStats"
import type { GameLogSplit, MLBTeamStats } from "./types"

// ── MLB Trend Chart ───────────────────────────────────────────────────

const CW = 640
const CH = 240
const CP = { top: 16, right: 16, bottom: 36, left: 48 }

function fmtR(n: number) {
  return n.toFixed(3).replace(/^0\./, ".")
}

function buildHittingPoints(log: GameLogSplit[]) {
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

function buildPitchingPoints(log: GameLogSplit[]) {
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

type ChartMetric = "avg" | "obp" | "ops"

const HITTING_SUMMARY = [
  { key: "AVG" as const, desc: "Batting Average" },
  { key: "OBP" as const, desc: "On-base Percentage" },
  { key: "SLG" as const, desc: "Slugging Percentage" },
  { key: "OPS" as const, desc: "On-base Plus Slugging" },
]

type PitchRole = "SP" | "RP" | "CL"

function inferPitchRole(p: { ipPerG: number; totalSaves: number }): PitchRole {
  if (p.totalSaves >= 2) return "CL"
  if (p.ipPerG >= 3.5) return "SP"
  return "RP"
}

function dateLabel(iso: string) {
  const [, m, d] = iso.split("-")
  return `${Number(m)}/${Number(d)}`
}

type WindowMode = "recent" | "season"

function pitchCardColor(key: string, num: number) {
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

export default function MLBTrendChart({
  log,
  mode,
  teamStats,
}: {
  log: GameLogSplit[]
  mode: "hitting" | "pitching"
  teamStats: MLBTeamStats | null
}) {
  const [metric, setMetric] = useState<ChartMetric>("avg")
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [windowMode, setWindowMode] = useState<WindowMode>("recent")

  // Reset to "recent" when player changes
  useEffect(() => { setWindowMode("recent") }, [log])

  const recentLog = useMemo(() => log.slice(-15), [log])
  const displayLog = useMemo(
    () => windowMode === "recent" ? recentLog : log,
    [windowMode, recentLog, log]
  )

  const hitPoints = useMemo(() => buildHittingPoints(displayLog), [displayLog])
  const pitPoints = useMemo(() => buildPitchingPoints(displayLog), [displayLog])
  const data = mode === "hitting" ? hitPoints : pitPoints

  if (log.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
        Not enough games to show a trend yet.
      </div>
    )
  }

  // summary from last cumulative point of selected window
  const last = hitPoints[hitPoints.length - 1]
  const slg = last ? last.ops - last.obp : 0

  const getValue = (pt: typeof data[number]) => {
    if (mode === "pitching") return (pt as ReturnType<typeof buildPitchingPoints>[number]).era
    const hp = pt as ReturnType<typeof buildHittingPoints>[number]
    return metric === "obp" ? hp.obp : metric === "ops" ? hp.ops : hp.avg
  }

  const values = data.map(getValue)
  const rawTeamAverage =
    mode === "pitching"
      ? teamStats?.pitching.era
      : teamStats?.hitting[metric]
  const parsedTeamAverage = Number.parseFloat(String(rawTeamAverage ?? ""))
  const teamAverage = Number.isFinite(parsedTeamAverage) ? parsedTeamAverage : null
  const maxVal = mode === "pitching"
    ? Math.max(...values, teamAverage ?? 0, 6.0)
    : Math.max(...values, teamAverage ?? 0, 0.5)
  const plotW = CW - CP.left - CP.right
  const plotH = CH - CP.top - CP.bottom
  const getX = (i: number) =>
    data.length === 1 ? CP.left + plotW / 2 : CP.left + (plotW / (data.length - 1)) * i
  const getY = (v: number) => CP.top + plotH - (v / maxVal) * plotH

  const linePoints = data.map((pt, i) => `${getX(i)},${getY(getValue(pt))}`).join(" ")
  const areaPoints = [
    `${getX(0)},${CH - CP.bottom}`,
    ...data.map((pt, i) => `${getX(i)},${getY(getValue(pt))}`),
    `${getX(data.length - 1)},${CH - CP.bottom}`,
  ].join(" ")

  const yTicks = [0, 0.25, 0.5, 0.75, 1.0].map((t) => t * maxVal)
  const metricLabel = mode === "pitching" ? "ERA" : metric.toUpperCase()

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">
            {windowMode === "recent" ? `Last ${recentLog.length} Games` : "Full Season"}
          </h2>
          <p className="mt-0.5 text-xs font-bold uppercase tracking-widest text-green-700">
            {windowMode === "recent"
              ? `${displayLog.length} games · cumulative`
              : `${log.length} games · cumulative`}
          </p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 gap-1">
          {(["recent", "season"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowMode(w)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                windowMode === w
                  ? "bg-green-900 text-white shadow-sm"
                  : "text-gray-500 hover:text-green-900"
              }`}
            >
              {w === "recent" ? "Last 15 Games" : "Full Season"}
            </button>
          ))}
        </div>
      </div>

      {/* ── Stat summary cards ── */}
      {mode === "hitting" && last && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HITTING_SUMMARY.map(({ key, desc }) => {
            const num = key === "AVG" ? last.avg : key === "OBP" ? last.obp : key === "SLG" ? slg : last.ops
            const val = fmtR(num)
            const color = getStatColor(key === "SLG" ? "OPS" : key, val)
            return (
              <div key={key} className={`rounded-xl p-3 sm:p-4 ${color.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{key}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
                <p className={`mt-2 text-2xl font-extrabold ${color.val}`}>{val}</p>
              </div>
            )
          })}
        </div>
      )}
      {mode === "pitching" && pitPoints.length > 0 && (() => {
        const p = pitPoints[pitPoints.length - 1]
        const role = inferPitchRole(p)
        const fmtPct = (v: number | null) => v == null ? "—" : `${(v * 100).toFixed(1)}%`
        const fmtDec = (v: number) => v.toFixed(2)
        const fmtIP  = (v: number) => v.toFixed(1)

        type Card = { key: string; desc: string; val: string; color: ReturnType<typeof getStatColor | typeof pitchCardColor> }

        const kbbCard: Card = {
          key: "K-BB%", desc: "Strikeout minus walk rate",
          val: fmtPct(p.kbbPct),
          color: p.kbbPct != null ? pitchCardColor("K-BB%", p.kbbPct) : getStatColor("K-BB%", "—"),
        }

        const cards: Card[] = role === "SP"
          ? [
              kbbCard,
              { key: "IP/G", desc: "Avg innings per start", val: fmtIP(p.ipPerG), color: pitchCardColor("IP/G", p.ipPerG) },
              { key: "QS", desc: "Quality starts (6+ IP, ≤3 ER)", val: String(p.qsCount), color: { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" } },
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era), color: getStatColor("ERA", fmtDec(p.era)) },
            ]
          : role === "RP"
          ? [
              kbbCard,
              { key: "LOB%", desc: "Left on base % (strand rate)", val: fmtPct(p.lobPct), color: p.lobPct != null ? pitchCardColor("LOB%", p.lobPct) : getStatColor("LOB%", "—") },
              { key: "WHIP", desc: "Walks + hits per inning", val: fmtDec(p.whip), color: getStatColor("WHIP", fmtDec(p.whip)) },
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era), color: getStatColor("ERA", fmtDec(p.era)) },
            ]
          : [
              kbbCard,
              { key: "SLG", desc: "Slugging % against", val: p.slgAgainst != null ? fmtDec(p.slgAgainst) : "—", color: p.slgAgainst != null ? pitchCardColor("SLG", p.slgAgainst) : getStatColor("SLG", "—") },
              { key: "WHIP", desc: "Walks + hits per inning", val: fmtDec(p.whip), color: getStatColor("WHIP", fmtDec(p.whip)) },
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era), color: getStatColor("ERA", fmtDec(p.era)) },
            ]

        return (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(({ key, desc, val, color }) => (
              <div key={key} className={`rounded-xl p-3 sm:p-4 ${color.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{key}</p>
                <p className="text-[11px] text-gray-400">{desc}</p>
                <p className={`mt-2 text-2xl font-extrabold ${color.val}`}>{val}</p>
              </div>
            ))}
          </div>
        )
      })()}

      {/* ── Chart area ── */}
      <div className="mt-4 rounded-xl bg-[#f7f8f3] p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{metricLabel} Trend</p>
            <p className="text-xs text-gray-500">
              {data.length} game{data.length !== 1 ? "s" : ""}
            </p>
          </div>
          {mode === "hitting" && (
            <div className="grid grid-cols-3 rounded-xl bg-white p-1 sm:flex sm:items-center sm:gap-2">
              {(["avg", "obp", "ops"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`cursor-pointer rounded-lg px-3 py-2 text-sm font-medium uppercase transition ${
                    metric === m ? "bg-green-900 text-white shadow-sm" : "text-gray-600"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 overflow-x-auto sm:mt-6">
          <svg
            className="h-64 min-w-105 w-full sm:h-72 sm:min-w-130"
            viewBox={`0 0 ${CW} ${CH}`}
            role="img"
            aria-label="Player season trend"
          >
            <defs>
              <linearGradient id="mlb-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#166534" stopOpacity="0.15" />
                <stop offset="100%" stopColor="#166534" stopOpacity="0" />
              </linearGradient>
            </defs>

            {yTicks.map((tick) => {
              const y = getY(tick)
              return (
                <g key={tick}>
                  <line x1={CP.left} x2={CW - CP.right} y1={y} y2={y} stroke="#e5e7eb" strokeDasharray="4 4" />
                  <text x={CP.left - 10} y={y + 4} textAnchor="end" className="fill-gray-500 text-[11px]">
                    {mode === "pitching" ? tick.toFixed(2) : fmtR(tick)}
                  </text>
                </g>
              )
            })}

            <line x1={CP.left} x2={CP.left} y1={CP.top} y2={CH - CP.bottom} stroke="#d1d5db" />
            <line x1={CP.left} x2={CW - CP.right} y1={CH - CP.bottom} y2={CH - CP.bottom} stroke="#d1d5db" />

            {teamAverage !== null && (
              <g>
                <line
                  x1={CP.left}
                  x2={CW - CP.right}
                  y1={getY(teamAverage)}
                  y2={getY(teamAverage)}
                  stroke="#6b7280"
                  strokeWidth="2"
                  strokeDasharray="7 5"
                />
                <text
                  x={CW - CP.right}
                  y={Math.max(CP.top + 11, getY(teamAverage) - 6)}
                  textAnchor="end"
                  className="fill-gray-600 text-[10px]"
                  fontWeight="bold"
                >
                  Team {mode === "pitching" ? teamAverage.toFixed(2) : fmtR(teamAverage)}
                </text>
              </g>
            )}

            <polygon points={areaPoints} fill="url(#mlb-area)" />
            <polyline
              points={linePoints}
              fill="none"
              stroke="#166534"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />

            {data.map((pt, i) => {
              const cx = getX(i)
              const cy = getY(getValue(pt))
              const isHovered = hoveredIdx === i
              const val = getValue(pt)
              const display = mode === "pitching" ? val.toFixed(2) : fmtR(val)
              const ttX = Math.max(CP.left, Math.min(cx - 60, CW - CP.right - 120))
              const ttY = Math.max(CP.top + 4, cy - 42)
              const showLabel = i === 0 || (i + 1) % 5 === 0 || i === data.length - 1

              return (
                <g key={i} onMouseEnter={() => setHoveredIdx(i)} onMouseLeave={() => setHoveredIdx(null)}>
                  <circle cx={cx} cy={cy} r={isHovered ? "6" : "4.5"} fill="#166534" />

                  {isHovered && (
                    <>
                      <rect x={ttX} y={ttY} width="120" height="42" rx="6" fill="#111827" opacity="0.94" />
                      <text x={ttX + 60} y={ttY + 14} textAnchor="middle" className="fill-white text-[10px]">
                        {pt.opp ? `vs ${pt.opp}` : pt.date}
                      </text>
                      <text x={ttX + 60} y={ttY + 30} textAnchor="middle" className="fill-white text-[11px]" fontWeight="bold">
                        {metricLabel} {display}
                      </text>
                    </>
                  )}

                  {showLabel && (
                    <text x={cx} y={CH - 12} textAnchor="middle" className="fill-gray-500 text-[11px]">
                      {dateLabel(pt.date)}
                    </text>
                  )}
                </g>
              )
            })}
          </svg>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-gray-600">
          <span className="flex items-center gap-2">
            <span className="h-2 w-6 rounded-full bg-green-800" />
            Player
          </span>
          {teamAverage !== null && (
            <span className="flex items-center gap-2">
              <span className="w-6 border-t-2 border-dashed border-gray-500" />
              Team Average ({mode === "pitching" ? teamAverage.toFixed(2) : fmtR(teamAverage)})
            </span>
          )}
        </div>
      </div>
    </section>
  )
}
