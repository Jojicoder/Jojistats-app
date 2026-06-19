import type { Player, SavedBattingGameEntry } from "../types"
import { calcBattingMetrics, fmtRate } from "../utils/metrics"
import type { LeagueConfig, LineupScoreWeights } from "../config/leagueConfig"
import { getPlayerLabel } from "./gameLiveUtils"

type BattingSummary = {
  player: Player
  metrics: ReturnType<typeof calcBattingMetrics>
}

type LineupStyle = "balanced" | "obp" | "power" | "contact"

function fmtStealPct(sb: number, cs: number) {
  const attempts = sb + cs
  return attempts > 0 ? fmtRate(sb / attempts) : "--"
}

function scoreWeights(values: Record<keyof LineupScoreWeights, number>, weights: LineupScoreWeights) {
  return Object.entries(weights).reduce(
    (total, [key, weight]) => total + values[key as keyof LineupScoreWeights] * (weight ?? 0),
    0
  )
}

function scoreLineupSlot(summary: BattingSummary, slotIndex: number, style: LineupStyle, config: LeagueConfig) {
  const { metrics } = summary
  const sample = Math.min(metrics.pa / config.manager.minimumRatePa, 1)
  const values = {
    avg: metrics.avg * sample,
    obp: metrics.obp * sample,
    ops: metrics.ops * sample,
    contact: (metrics.ab > 0 ? Math.max(1 - metrics.so / metrics.ab, 0) : 0) * sample,
    hrRate: (metrics.pa > 0 ? metrics.hr / metrics.pa : 0) * sample,
    rbiRate: (metrics.pa > 0 ? metrics.rbi / metrics.pa : 0) * sample,
    hitRate: (metrics.pa > 0 ? metrics.h / metrics.pa : 0) * sample,
  }
  const slotScore = scoreWeights(values, config.manager.lineupSlots[slotIndex] ?? config.manager.lineupSlots[config.manager.lineupSlots.length - 1] ?? {})
  const styleBoost = scoreWeights(values, config.manager.lineupStyleBoosts[style])
  return slotScore + styleBoost + metrics.pa / 10000
}

export function sortLineup(summaries: BattingSummary[], style: LineupStyle, config: LeagueConfig) {
  const active = summaries.filter((s) => s.metrics.pa > 0)
  const remaining = [...(active.length > 0 ? active : summaries)]
  const lineup: BattingSummary[] = []
  for (let slotIndex = 0; slotIndex < 9 && remaining.length > 0; slotIndex++) {
    let bestIndex = 0, bestScore = Number.NEGATIVE_INFINITY
    remaining.forEach((s, i) => {
      const score = scoreLineupSlot(s, slotIndex, style, config)
      if (score > bestScore) { bestScore = score; bestIndex = i }
    })
    const [selected] = remaining.splice(bestIndex, 1)
    lineup.push(selected)
  }
  return lineup
}

type Props = {
  players: Player[]
  playerSummaries: BattingSummary[]
  leaders: {
    byAvg: BattingSummary | undefined
    byHr: BattingSummary | undefined
    byRbi: BattingSummary | undefined
    bySb: BattingSummary | undefined
    byHits: BattingSummary | undefined
  }
  hotPlayers: BattingSummary[]
  coldPlayers: BattingSummary[]
  positionBalance: Record<string, number>
  suggestedLineup: BattingSummary[]
  teamTotals: ReturnType<typeof calcBattingMetrics>
  leagueConfig: LeagueConfig
  lineupStyle: LineupStyle
  setLineupStyle: (style: LineupStyle) => void
  entriesByPlayer: Record<string, SavedBattingGameEntry[]>
}

export default function ManagerBattingSection({
  players,
  leaders,
  hotPlayers,
  coldPlayers,
  positionBalance,
  suggestedLineup,
  leagueConfig,
  lineupStyle,
  setLineupStyle,
  entriesByPlayer,
}: Props) {
  return (
    <>
      <section className="grid grid-cols-1 gap-5 xl:grid-cols-4">
        <MgrCard title="Team Leaders">
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Min {leagueConfig.manager.minimumRatePa} PA for AVG
          </p>
          <div className="mt-4 space-y-2">
            {[
              { label: "AVG",  text: leaders.byAvg  ? leaders.byAvg.player.name  : "", val: leaders.byAvg  ? fmtRate(leaders.byAvg.metrics.avg)  : "—" },
              { label: "HR",   text: leaders.byHr   ? leaders.byHr.player.name   : "", val: leaders.byHr   ? String(leaders.byHr.metrics.hr)     : "—" },
              { label: "RBI",  text: leaders.byRbi  ? leaders.byRbi.player.name  : "", val: leaders.byRbi  ? String(leaders.byRbi.metrics.rbi)   : "—" },
              { label: "SB",   text: leaders.bySb   ? leaders.bySb.player.name   : "", val: leaders.bySb   ? String(leaders.bySb.metrics.sb)     : "—" },
              { label: "Hits", text: leaders.byHits ? leaders.byHits.player.name : "", val: leaders.byHits ? String(leaders.byHits.metrics.h)    : "—" },
            ].map(({ label, text, val }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <div className="text-right">
                  <p className="text-sm font-semibold text-gray-900">{text || "No data"}</p>
                  {text && <p className="text-xs font-bold text-green-900">{val}</p>}
                </div>
              </div>
            ))}
          </div>
        </MgrCard>

        <MgrCard title="Hot Players">
          <p className="mt-1 text-[11px] font-bold uppercase tracking-widest text-gray-400">
            Min {leagueConfig.manager.minimumRatePa} PA
          </p>
          <div className="mt-4 space-y-2">
            {hotPlayers.length === 0 ? (
              <p className="text-sm text-gray-400">No qualified hitters yet.</p>
            ) : (
              hotPlayers.map((s) => (
                <div key={s.player.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <p className="text-sm font-semibold text-gray-900">{s.player.name}</p>
                  <p className="text-xs font-bold text-green-900">OPS {fmtRate(s.metrics.ops)} · {s.metrics.pa} PA</p>
                </div>
              ))
            )}
          </div>
        </MgrCard>

        <MgrCard title="Cold Players">
          <div className="mt-4 space-y-2">
            {coldPlayers.length === 0 ? (
              <p className="text-sm text-gray-400">No batting data yet.</p>
            ) : (
              coldPlayers.map((s) => (
                <div key={s.player.id} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <p className="text-sm font-semibold text-gray-900">{s.player.name}</p>
                  <p className="text-xs font-bold text-green-900">AVG {fmtRate(s.metrics.avg)}</p>
                </div>
              ))
            )}
          </div>
        </MgrCard>

        <MgrCard title="Position Balance">
          <div className="mt-4 space-y-2">
            {Object.entries(positionBalance).map(([label, count]) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-sm font-extrabold text-green-950">{count}</p>
              </div>
            ))}
          </div>
        </MgrCard>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-base font-bold text-gray-900">Suggested Lineup</h2>
          <div className="flex flex-wrap gap-2">
            {(["balanced", "obp", "power", "contact"] as const).map((style) => (
              <button
                key={style}
                type="button"
                onClick={() => setLineupStyle(style)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition ${
                  lineupStyle === style ? "bg-green-900 text-white" : "border border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {suggestedLineup.map((s, i) => (
            <div key={s.player.id} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">
                <span className="mr-1.5 text-xs text-gray-400">{i + 1}.</span>
                {getPlayerLabel(s.player)}{" "}
                <span className="text-xs text-gray-400">{s.player.positions.join(", ")}</span>
              </p>
              <p className="mt-1 text-xs text-gray-400">
                PA {s.metrics.pa} · AVG {fmtRate(s.metrics.avg)} · OBP {fmtRate(s.metrics.obp)} · OPS {fmtRate(s.metrics.ops)}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Roster Overview</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                <th className="pb-3 pr-4 text-left">Player</th>
                <th className="pb-3 px-2 text-center">Pos</th>
                <th className="pb-3 px-2 text-center">G</th>
                <th className="pb-3 px-2 text-center">AB</th>
                <th className="pb-3 px-2 text-center">H</th>
                <th className="pb-3 px-2 text-center text-green-700">AVG</th>
                <th className="pb-3 px-2 text-center">HR</th>
                <th className="pb-3 px-2 text-center">RBI</th>
                <th className="pb-3 px-2 text-center">SB</th>
                <th className="pb-3 px-2 text-center">CS</th>
                <th className="pb-3 px-2 text-center">SB%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {players.map((player) => {
                const totals = calcBattingMetrics(entriesByPlayer[player.id] ?? [])
                return (
                  <tr key={player.id}>
                    <td className="py-3 pr-4 font-semibold text-gray-900">
                      {player.jerseyNumber != null && (
                        <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                      )}
                      {player.name}
                    </td>
                    <td className="px-2 py-3 text-center text-gray-500">{player.positions.join(", ")}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.games}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.ab}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.h}</td>
                    <td className="px-2 py-3 text-center font-bold text-green-900">{fmtRate(totals.avg)}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.hr}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.rbi}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.sb}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{totals.cs}</td>
                    <td className="px-2 py-3 text-center text-gray-500">{fmtStealPct(totals.sb, totals.cs)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}

function MgrCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}
