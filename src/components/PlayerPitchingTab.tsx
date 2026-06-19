import type { Dispatch, SetStateAction } from "react"
import type { SavedPitchingGameEntry, Team } from "../types"
import type { ProfileGoals, PitchingRoleKey } from "../pages/PlayerPage"
import PitchingTrendChart from "./PitchingTrendChart"
import { getStatColor } from "./mlb/playerStats"
import { calcPitchingMetrics, fmtDecimal, fmtIp } from "../utils/metrics"
import { formatDate } from "../utils/dateUtils"

type Props = {
  entries: SavedPitchingGameEntry[]
  team: Team | null
  metrics: ReturnType<typeof calcPitchingMetrics>
  recentMetrics: ReturnType<typeof calcPitchingMetrics>
  pitchingRole: PitchingRoleKey | null
  goals: ProfileGoals
  isEditingGoals: boolean
  isSavingGoals: boolean
  setGoals: Dispatch<SetStateAction<ProfileGoals>>
  onEditGoals: () => void
  onSaveGoals: () => void
}

export default function PlayerPitchingTab({
  entries,
  team,
  metrics,
  recentMetrics,
  pitchingRole,
  goals,
  isEditingGoals,
  isSavingGoals,
  setGoals,
  onEditGoals,
  onSaveGoals,
}: Props) {
  const pitchingWins = entries.filter((e) => e.gameMeta.result === "W").length
  const pitchingHolds = entries.reduce((total, e) => total + ((e.statLine as { holds?: number }).holds ?? 0), 0)
  const pitchingSaves = entries.reduce((total, e) => total + ((e.statLine as { saves?: number }).saves ?? 0), 0)
  const kPerNine = metrics.ip > 0 ? (metrics.so * 9) / metrics.ip : 0

  const common = {
    era: { label: "ERA", value: fmtDecimal(metrics.era) },
    whip: { label: "WHIP", value: fmtDecimal(metrics.whip) },
    ip: { label: "IP", value: fmtIp(metrics.outs) },
    wins: { label: "W", value: String(pitchingWins) },
    holds: { label: "HLD", value: String(pitchingHolds) },
    saves: { label: "SV", value: String(pitchingSaves) },
    k9: { label: "K/9", value: fmtDecimal(kPerNine) },
  }

  const statCards =
    pitchingRole === "closer" ? [common.saves, common.era, common.whip, common.k9]
    : pitchingRole === "reliever" ? [common.era, common.whip, common.holds, common.k9]
    : [common.era, common.whip, common.ip, common.k9, common.wins]

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {statCards.map((stat) => {
          const color = getStatColor(stat.label, stat.value, team?.league, pitchingRole)
          return (
            <div key={stat.label} className={`rounded-xl p-4 shadow-sm ${color.bg}`}>
              <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{stat.label}</p>
              <p className={`mt-2 text-2xl font-extrabold tracking-tight ${color.val}`}>{stat.value}</p>
            </div>
          )
        })}
      </section>

      <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-bold text-gray-900">Pitching Goals</h2>
            <button
              type="button"
              onClick={isEditingGoals ? onSaveGoals : onEditGoals}
              disabled={isSavingGoals}
              className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isEditingGoals ? (isSavingGoals ? "Saving..." : "Save") : "Edit"}
            </button>
          </div>

          <div className="mt-4 space-y-3 text-sm">
            {isEditingGoals ? (
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "eraGoal" as const, label: "ERA Goal", placeholder: "3.00" },
                  { key: "soGoal" as const, label: "SO Goal", placeholder: "50" },
                  { key: "whipGoal" as const, label: "WHIP Goal", placeholder: "1.20" },
                ].map(({ key, label, placeholder }) => (
                  <label key={key} className="block">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
                    <input
                      value={goals[key]}
                      onChange={(e) => setGoals((prev) => ({ ...prev, [key]: e.target.value }))}
                      className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                      placeholder={placeholder}
                    />
                  </label>
                ))}
              </div>
            ) : (
              <>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">ERA Goal</span>
                  <span className="text-sm font-semibold text-gray-900">under {goals.eraGoal} → {fmtDecimal(metrics.era)}</span>
                </p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">SO Goal</span>
                  <span className="text-sm font-semibold text-gray-900">{goals.soGoal} → {metrics.so}</span>
                </p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">WHIP Goal</span>
                  <span className="text-sm font-semibold text-gray-900">under {goals.whipGoal} → {fmtDecimal(metrics.whip)}</span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Recent Pitching Form</h2>
          <p className="mt-4 text-sm text-gray-500">
            Last 3 Appearances: ERA {fmtDecimal(recentMetrics.era)} · IP {fmtIp(recentMetrics.outs)} · SO {recentMetrics.so} · BB {recentMetrics.bb} · WHIP {fmtDecimal(recentMetrics.whip)}
          </p>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Strikeouts by Appearance</h2>
        <div className="mt-4 flex h-48 items-end gap-2 rounded-xl bg-[#f7f8f3] px-4 pb-0 pt-4">
          {entries.length === 0 ? (
            <p className="self-center text-sm text-gray-500">No pitching records yet.</p>
          ) : (
            entries.map((entry, index) => {
              const maxStrikeouts = Math.max(...entries.map((item) => item.statLine.strikeouts), 1)
              const height = `${Math.max((entry.statLine.strikeouts / maxStrikeouts) * 100, 8)}%`
              return (
                <div key={entry.id} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t bg-green-900"
                    style={{ height }}
                    title={`${entry.statLine.strikeouts} strikeouts vs ${entry.gameMeta.opponent}`}
                  />
                  <span className="text-xs text-gray-500">G{index + 1}</span>
                </div>
              )
            })
          )}
        </div>
      </section>

      <PitchingTrendChart entries={entries} />

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Pitching Game Log</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                {["Date", "Opponent", "IP", "H", "R", "ER", "BB", "SO", "HR"].map((h) => (
                  <th key={h} className="pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-4 text-gray-600">{formatDate(entry.gameMeta.date)}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900">{entry.gameMeta.opponent}</td>
                  <td className="py-3 pr-4 text-gray-600">{fmtIp(entry.statLine.inningsPitchedOuts)}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.hitsAllowed}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.runsAllowed}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.earnedRuns}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.walks}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.strikeouts}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.homeRunsAllowed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}
