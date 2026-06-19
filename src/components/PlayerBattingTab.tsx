import type { Dispatch, SetStateAction } from "react"
import type { SavedBattingGameEntry, Team } from "../types"
import type { ProfileGoals } from "../pages/PlayerPage"
import PerformanceTrendCard from "./PerformanceTrendCard"
import { getStatColor } from "./mlb/playerStats"
import { calcBattingMetrics, fmtRate } from "../utils/metrics"
import { formatDate } from "../utils/dateUtils"

type Props = {
  entries: SavedBattingGameEntry[]
  allTeamEntries: SavedBattingGameEntry[]
  team: Team | null
  metrics: ReturnType<typeof calcBattingMetrics>
  recentMetrics: ReturnType<typeof calcBattingMetrics>
  bestGame: SavedBattingGameEntry | undefined
  goals: ProfileGoals
  isEditingGoals: boolean
  isSavingGoals: boolean
  setGoals: Dispatch<SetStateAction<ProfileGoals>>
  onEditGoals: () => void
  onSaveGoals: () => void
}

export default function PlayerBattingTab({
  entries,
  allTeamEntries,
  team,
  metrics,
  recentMetrics,
  bestGame,
  goals,
  isEditingGoals,
  isSavingGoals,
  setGoals,
  onEditGoals,
  onSaveGoals,
}: Props) {
  const bbPerK = metrics.so > 0 ? (metrics.bb / metrics.so).toFixed(2) : "--"
  const stealAttempts = metrics.sb + metrics.cs
  const sbPct = stealAttempts > 0 && metrics.sbPct != null ? fmtRate(metrics.sbPct) : "--"

  const statCards = [
    { label: "AVG", value: fmtRate(metrics.avg) },
    { label: "OBP", value: fmtRate(metrics.obp) },
    { label: "OPS", value: fmtRate(metrics.ops) },
    { label: "BB/K", value: bbPerK },
    { label: "H", value: String(metrics.h) },
    { label: "HR", value: String(metrics.hr) },
    { label: "RBI", value: String(metrics.rbi) },
    { label: "SB", value: String(metrics.sb) },
    { label: "CS", value: String(metrics.cs) },
    { label: "SB%", value: sbPct },
    { label: "BB", value: String(metrics.bb) },
    { label: "SO", value: String(metrics.so) },
  ]

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
        {statCards.map((stat) => {
          const color = getStatColor(stat.label, stat.value, team?.league)
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
            <h2 className="text-base font-bold text-gray-900">Season Goals</h2>
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
              <>
                <label className="block">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">Season Goal</span>
                  <input
                    value={goals.seasonGoal}
                    onChange={(e) => setGoals((prev) => ({ ...prev, seasonGoal: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                  />
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { key: "avgGoal" as const, label: "AVG Goal", placeholder: ".350" },
                    { key: "hrGoal" as const, label: "HR Goal", placeholder: "5" },
                    { key: "rbiGoal" as const, label: "RBI Goal", placeholder: "20" },
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
              </>
            ) : (
              <>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">AVG Goal</span>
                  <span className="text-sm font-semibold text-gray-900">{goals.avgGoal} → {fmtRate(metrics.avg)}</span>
                </p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">HR Goal</span>
                  <span className="text-sm font-semibold text-gray-900">{goals.hrGoal} → {metrics.hr}</span>
                </p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">RBI Goal</span>
                  <span className="text-sm font-semibold text-gray-900">{goals.rbiGoal} → {metrics.rbi}</span>
                </p>
              </>
            )}
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold text-gray-900">Recent Form</h2>
          <p className="mt-4 text-sm text-gray-500">
            Last 5 Games: AVG {fmtRate(recentMetrics.avg)} · H {recentMetrics.h} · RBI {recentMetrics.rbi} · SO {recentMetrics.so}
          </p>
          <div className="mt-4 rounded-xl bg-[#f7f8f3] p-4 text-sm text-gray-700">
            {bestGame ? (
              <>
                <p className="font-bold text-gray-900">Personal Strength</p>
                <p className="mt-1 text-gray-500">Best game: {bestGame.statLine.H} hits vs {bestGame.gameMeta.opponent}</p>
              </>
            ) : (
              <span className="text-gray-400">No games recorded yet.</span>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Hits by Game</h2>
        <div className="mt-4 flex h-48 items-end gap-2 rounded-xl bg-[#f7f8f3] px-4 pb-0 pt-4">
          {entries.length === 0 ? (
            <p className="self-center text-sm text-gray-500">No games recorded yet.</p>
          ) : (
            entries.map((entry, index) => {
              const maxHits = Math.max(...entries.map((item) => item.statLine.H), 1)
              const height = `${Math.max((entry.statLine.H / maxHits) * 100, 8)}%`
              return (
                <div key={entry.id} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div
                    className="w-full rounded-t bg-green-900"
                    style={{ height }}
                    title={`${entry.statLine.H} hits vs ${entry.gameMeta.opponent}`}
                  />
                  <span className="text-xs text-gray-500">G{index + 1}</span>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Game Log</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-xs font-bold uppercase tracking-wide text-gray-400">
                {["Date", "Opponent", "AB", "H", "HR", "RBI", "SB", "CS", "BB", "SO"].map((h) => (
                  <th key={h} className="pb-3 pr-4">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="py-3 pr-4 text-gray-600">{formatDate(entry.gameMeta.date)}</td>
                  <td className="py-3 pr-4 font-medium text-gray-900">{entry.gameMeta.opponent}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.AB}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.H}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.HR}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.RBI}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.SB ?? 0}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.CS ?? 0}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.BB}</td>
                  <td className="py-3 pr-4 text-gray-600">{entry.statLine.SO}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {team && (
        <PerformanceTrendCard
          playerEntries={entries}
          teamEntries={allTeamEntries}
          seasonYear={team.currentSeasonYear}
        />
      )}
    </>
  )
}
