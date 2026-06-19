import type { Player } from "../types"
import { calcPitchingMetrics, fmtDecimal, fmtIp } from "../utils/metrics"
import { getPlayerLabel } from "./gameLiveUtils"

type PitchingSummary = {
  player: Player
  metrics: ReturnType<typeof calcPitchingMetrics>
}

type Props = {
  pitchingLeaders: {
    byEra: PitchingSummary | undefined
    byWhip: PitchingSummary | undefined
    bySo: PitchingSummary | undefined
    byIp: PitchingSummary | undefined
  }
  pitchingUsage: PitchingSummary[]
  strikeoutLeaders: PitchingSummary[]
  pitchingRosterOverview: PitchingSummary[]
  teamPitchingTotals: ReturnType<typeof calcPitchingMetrics>
  positionBalance: Record<string, number>
}

export default function ManagerPitchingSection({
  pitchingLeaders,
  pitchingUsage,
  strikeoutLeaders,
  pitchingRosterOverview,
  teamPitchingTotals,
  positionBalance,
}: Props) {
  return (
    <>
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-4">
        <MgrCard title="Pitching Leaders">
          <div className="mt-4 space-y-2">
            {[
              { label: "ERA",  text: pitchingLeaders.byEra  ? pitchingLeaders.byEra.player.name  : "", val: pitchingLeaders.byEra  ? fmtDecimal(pitchingLeaders.byEra.metrics.era)   : "—" },
              { label: "WHIP", text: pitchingLeaders.byWhip ? pitchingLeaders.byWhip.player.name : "", val: pitchingLeaders.byWhip ? fmtDecimal(pitchingLeaders.byWhip.metrics.whip) : "—" },
              { label: "SO",   text: pitchingLeaders.bySo   ? pitchingLeaders.bySo.player.name   : "", val: pitchingLeaders.bySo   ? String(pitchingLeaders.bySo.metrics.so)        : "—" },
              { label: "IP",   text: pitchingLeaders.byIp   ? pitchingLeaders.byIp.player.name   : "", val: pitchingLeaders.byIp   ? fmtIp(pitchingLeaders.byIp.metrics.outs)       : "—" },
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

        <div className="rounded-2xl bg-white p-5 shadow-sm xl:col-span-2">
          <h2 className="text-base font-bold text-gray-900">Pitcher Usage</h2>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {pitchingUsage.length === 0 ? (
              <p className="text-sm text-gray-400">No pitching data yet.</p>
            ) : (
              pitchingUsage.map((s) => (
                <div key={s.player.id} className="rounded-xl bg-[#f7f8f3] px-4 py-3">
                  <p className="text-sm font-semibold text-gray-900">
                    {getPlayerLabel(s.player)}{" "}
                    <span className="text-xs text-gray-400">{s.player.positions.join(", ")}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    IP {fmtIp(s.metrics.outs)} · ERA {fmtDecimal(s.metrics.era)} · SO {s.metrics.so}
                  </p>
                </div>
              ))
            )}
          </div>
        </div>

        <MgrCard title="Staff Notes">
          <div className="mt-4 space-y-2">
            {[
              { label: "Pitchers",    val: String(positionBalance.Pitchers) },
              { label: "Appearances", val: String(teamPitchingTotals.games) },
              { label: "Runs",        val: String(teamPitchingTotals.r) },
              { label: "Earned Runs", val: String(teamPitchingTotals.er) },
            ].map(({ label, val }) => (
              <div key={label} className="flex items-center justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
                <p className="text-sm font-extrabold text-green-950">{val}</p>
              </div>
            ))}
          </div>
        </MgrCard>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Strikeouts by Pitcher</h2>
        <div className="mt-4 space-y-3">
          {strikeoutLeaders.length === 0 ? (
            <p className="text-sm text-gray-400">No strikeout data yet.</p>
          ) : (
            strikeoutLeaders.map((s) => {
              const maxSo = Math.max(...strikeoutLeaders.map((l) => l.metrics.so), 1)
              return (
                <div key={s.player.id}>
                  <div className="mb-1.5 flex justify-between text-sm">
                    <span className="font-semibold text-gray-900">{s.player.name}</span>
                    <span className="text-xs font-bold text-green-900">{s.metrics.so} SO</span>
                  </div>
                  <div className="h-2 rounded-full bg-[#f7f8f3]">
                    <div className="h-2 rounded-full bg-green-800" style={{ width: `${Math.max((s.metrics.so / maxSo) * 100, 6)}%` }} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">Pitching Roster Overview</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                <th className="pb-3 pr-4 text-left">Player</th>
                <th className="pb-3 px-2 text-center">Pos</th>
                <th className="pb-3 px-2 text-center">APP</th>
                <th className="pb-3 px-2 text-center">IP</th>
                <th className="pb-3 px-2 text-center text-green-700">ERA</th>
                <th className="pb-3 px-2 text-center">WHIP</th>
                <th className="pb-3 px-2 text-center">H</th>
                <th className="pb-3 px-2 text-center">ER</th>
                <th className="pb-3 px-2 text-center">BB</th>
                <th className="pb-3 px-2 text-center">SO</th>
                <th className="pb-3 px-2 text-center">HR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {pitchingRosterOverview.map(({ player, metrics: totals }) => (
                <tr key={player.id}>
                  <td className="py-3 pr-4 font-semibold text-gray-900">
                    {player.jerseyNumber != null && (
                      <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                    )}
                    {player.name}
                  </td>
                  <td className="px-2 py-3 text-center text-gray-500">{player.positions.join(", ")}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.games}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{fmtIp(totals.outs)}</td>
                  <td className="px-2 py-3 text-center font-bold text-green-900">{fmtDecimal(totals.era)}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{fmtDecimal(totals.whip)}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.h}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.er}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.bb}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.so}</td>
                  <td className="px-2 py-3 text-center text-gray-500">{totals.hr}</td>
                </tr>
              ))}
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
