import { useEffect, useMemo, useState } from "react"
import { getStatColor } from "../mlb/playerStats"
import type { BattingRawGame, PitchingRawGame } from "./stats"
import {
  fmtR, dateLabel,
  buildHittingPoints, buildPitchingPoints,
  inferPitchRole, HITTING_SUMMARY,
  type ChartMetric, type WindowMode,
} from "./JBLTrendChartUtils"

const CW = 640
const CH = 240
const CP = { top: 16, right: 16, bottom: 36, left: 48 }

type Props =
  | { mode: "hitting"; log: BattingRawGame[]; teamAverage: Record<ChartMetric, number> }
  | { mode: "pitching"; log: PitchingRawGame[]; teamAverage: number }

export default function JBLTrendChart(props: Props) {
  const { mode, log } = props
  const [metric, setMetric] = useState<ChartMetric>("avg")
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const [windowMode, setWindowMode] = useState<WindowMode>("recent")

  useEffect(() => { setWindowMode("recent") }, [log])

  const recentLog = useMemo(() => log.slice(-15), [log])
  const displayLog = useMemo(
    () => (windowMode === "recent" ? recentLog : log),
    [windowMode, recentLog, log]
  )

  const hitPoints = useMemo(
    () => (mode === "hitting" ? buildHittingPoints(displayLog as BattingRawGame[]) : []),
    [mode, displayLog]
  )
  const pitPoints = useMemo(
    () => (mode === "pitching" ? buildPitchingPoints(displayLog as PitchingRawGame[]) : []),
    [mode, displayLog]
  )
  const data = mode === "hitting" ? hitPoints : pitPoints

  if (log.length < 2) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
        Not enough games to show a trend yet.
      </div>
    )
  }

  const last = hitPoints[hitPoints.length - 1]

  const getValue = (pt: typeof data[number]) => {
    if (mode === "pitching") return (pt as ReturnType<typeof buildPitchingPoints>[number]).era
    const hp = pt as ReturnType<typeof buildHittingPoints>[number]
    return metric === "obp" ? hp.obp : metric === "ops" ? hp.ops : hp.avg
  }

  const values = data.map(getValue)
  const teamAverage = mode === "pitching" ? props.teamAverage : props.teamAverage[metric]
  const maxVal = mode === "pitching"
    ? Math.max(...values, teamAverage, 6.0)
    : Math.max(...values, teamAverage, 0.5)

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
            {displayLog.length} games · cumulative
          </p>
        </div>
        <div className="flex rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 gap-1">
          {(["recent", "season"] as const).map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWindowMode(w)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                windowMode === w ? "bg-green-900 text-white shadow-sm" : "text-gray-500 hover:text-green-900"
              }`}
            >
              {w === "recent" ? "Last 15 Games" : "Full Season"}
            </button>
          ))}
        </div>
      </div>

      {mode === "hitting" && last && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {HITTING_SUMMARY.map(({ key, desc }) => {
            const num = key === "AVG" ? last.avg : key === "OBP" ? last.obp : key === "SLG" ? last.ops - last.obp : last.ops
            const val = fmtR(num)
            const color = getStatColor(key === "SLG" ? "OPS" : key, val, "jbl")
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
        const fmtDec = (v: number) => v.toFixed(2)
        const fmtIP = (v: number) => v.toFixed(1)

        const cards = role === "SP"
          ? [
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era) },
              { key: "WHIP", desc: "Walks + hits per inning", val: fmtDec(p.whip) },
              { key: "IP/G", desc: "Avg innings per appearance", val: fmtIP(p.ipPerG) },
              { key: "K/9", desc: "Strikeouts per 9 Inn.", val: p.k9.toFixed(1) },
            ]
          : role === "RP"
          ? [
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era) },
              { key: "WHIP", desc: "Walks + hits per inning", val: fmtDec(p.whip) },
              { key: "K/9", desc: "Strikeouts per 9 Inn.", val: p.k9.toFixed(1) },
              { key: "BB/9", desc: "Walks per 9 Inn.", val: p.bb9.toFixed(1) },
            ]
          : [
              { key: "SV", desc: "Saves", val: String(p.totalSaves) },
              { key: "ERA", desc: "Earned run average", val: fmtDec(p.era) },
              { key: "WHIP", desc: "Walks + hits per inning", val: fmtDec(p.whip) },
              { key: "K/9", desc: "Strikeouts per 9 Inn.", val: p.k9.toFixed(1) },
            ]

        return (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {cards.map(({ key, desc, val }) => {
              const color = getStatColor(key, val, "jbl", role === "SP" ? "starter" : role === "CL" ? "closer" : "reliever")
              return (
                <div key={key} className={`rounded-xl p-3 sm:p-4 ${color.bg}`}>
                  <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{key}</p>
                  <p className="text-[11px] text-gray-400">{desc}</p>
                  <p className={`mt-2 text-2xl font-extrabold ${color.val}`}>{val}</p>
                </div>
              )
            })}
          </div>
        )
      })()}

      <div className="mt-4 rounded-xl bg-[#f7f8f3] p-3 sm:p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-gray-700">{metricLabel} Trend</p>
            <p className="text-xs text-gray-500">{data.length} game{data.length !== 1 ? "s" : ""}</p>
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
              <linearGradient id="jbl-area" x1="0" y1="0" x2="0" y2="1">
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

            <g>
              <line x1={CP.left} x2={CW - CP.right} y1={getY(teamAverage)} y2={getY(teamAverage)} stroke="#6b7280" strokeWidth="2" strokeDasharray="7 5" />
              <text x={CW - CP.right} y={Math.max(CP.top + 11, getY(teamAverage) - 6)} textAnchor="end" className="fill-gray-600 text-[10px]" fontWeight="bold">
                Team {mode === "pitching" ? teamAverage.toFixed(2) : fmtR(teamAverage)}
              </text>
            </g>

            <polygon points={areaPoints} fill="url(#jbl-area)" />
            <polyline points={linePoints} fill="none" stroke="#166534" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />

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
                      <text x={ttX + 60} y={ttY + 14} textAnchor="middle" className="fill-white text-[10px]">{pt.opp ? `vs ${pt.opp}` : pt.date}</text>
                      <text x={ttX + 60} y={ttY + 30} textAnchor="middle" className="fill-white text-[11px]" fontWeight="bold">{metricLabel} {display}</text>
                    </>
                  )}
                  {showLabel && (
                    <text x={cx} y={CH - 12} textAnchor="middle" className="fill-gray-500 text-[11px]">{dateLabel(pt.date)}</text>
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
          <span className="flex items-center gap-2">
            <span className="w-6 border-t-2 border-dashed border-gray-500" />
            Team Average ({mode === "pitching" ? teamAverage.toFixed(2) : fmtR(teamAverage)})
          </span>
        </div>
      </div>
    </section>
  )
}
