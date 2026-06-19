import { useMemo, useState } from "react"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry, Team } from "../types"
import { calcBattingMetrics, calcPitchingMetrics, fmtRate, fmtDecimal, fmtIp } from "../utils/metrics"
import type { LeagueConfig, LineupScoreWeights } from "../config/leagueConfig"
import { getLeagueConfig } from "../config/leagueConfig"
import { getPlayerLabel } from "./gameLiveUtils"

type ManagerMode = "batting" | "pitching"
type LineupStyle = "balanced" | "obp" | "power" | "contact"

type Props = {
  team: Team | null
  players: Player[]
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
}

type BattingSummary = {
  player: Player
  metrics: ReturnType<typeof calcBattingMetrics>
}


function getPositionGroup(position: string) {
  if (position === "P") return "Pitchers"
  if (position === "C") return "Catchers"
  if (position === "LF" || position === "CF" || position === "RF") return "Outfielders"
  if (position === "UTIL" || position === "DH") return "Utility"
  return "Infielders"
}

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

function scoreLineupSlot(
  summary: BattingSummary,
  slotIndex: number,
  style: LineupStyle,
  config: LeagueConfig
) {
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

  const slotScore = scoreWeights(
    values,
    config.manager.lineupSlots[slotIndex] ??
      config.manager.lineupSlots[config.manager.lineupSlots.length - 1] ??
      {}
  )
  const styleBoost = scoreWeights(values, config.manager.lineupStyleBoosts[style])

  return slotScore + styleBoost + metrics.pa / 10000
}

function sortLineup(summaries: BattingSummary[], style: LineupStyle, config: LeagueConfig) {
  const active = summaries.filter((summary) => summary.metrics.pa > 0)
  const remaining = [...(active.length > 0 ? active : summaries)]
  const lineup: BattingSummary[] = []

  for (let slotIndex = 0; slotIndex < 9 && remaining.length > 0; slotIndex += 1) {
    let bestIndex = 0
    let bestScore = Number.NEGATIVE_INFINITY

    remaining.forEach((summary, index) => {
      const score = scoreLineupSlot(summary, slotIndex, style, config)
      if (score > bestScore) {
        bestScore = score
        bestIndex = index
      }
    })

    const [selected] = remaining.splice(bestIndex, 1)
    lineup.push(selected)
  }

  return lineup
}

export default function TeamManagerDashboard({
  team,
  players,
  savedEntriesByPlayer,
  pitchingEntriesByPlayer,
}: Props) {
  const [managerMode, setManagerMode] = useState<ManagerMode>("batting")
  const [lineupStyle, setLineupStyle] = useState<LineupStyle>("balanced")
  const leagueConfig = useMemo(() => getLeagueConfig(team?.league), [team?.league])

  const battingSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: calcBattingMetrics(savedEntriesByPlayer[player.id] ?? []),
      })),
    [players, savedEntriesByPlayer]
  )

  const pitchingSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: calcPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
      })),
    [players, pitchingEntriesByPlayer]
  )

  const teamBatting = useMemo(
    () => calcBattingMetrics(Object.values(savedEntriesByPlayer).flat()),
    [savedEntriesByPlayer]
  )

  const teamPitching = useMemo(
    () => calcPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const battingLeaders = useMemo(() => {
    const eligible = battingSummaries.filter((summary) => summary.metrics.pa >= leagueConfig.manager.minimumRatePa)
    return {
      avg: [...eligible].sort((a, b) => b.metrics.avg - a.metrics.avg)[0],
      hr: [...battingSummaries].sort((a, b) => b.metrics.hr - a.metrics.hr)[0],
      rbi: [...battingSummaries].sort((a, b) => b.metrics.rbi - a.metrics.rbi)[0],
      sb: [...battingSummaries].sort((a, b) => b.metrics.sb - a.metrics.sb)[0],
      hits: [...battingSummaries].sort((a, b) => b.metrics.h - a.metrics.h)[0],
    }
  }, [battingSummaries, leagueConfig])

  const pitchingLeaders = useMemo(() => {
    const eligible = pitchingSummaries.filter((summary) => summary.metrics.outs > 0)
    return {
      era: [...eligible].sort((a, b) => a.metrics.era - b.metrics.era)[0],
      whip: [...eligible].sort((a, b) => a.metrics.whip - b.metrics.whip)[0],
      so: [...pitchingSummaries].sort((a, b) => b.metrics.so - a.metrics.so)[0],
      ip: [...pitchingSummaries].sort((a, b) => b.metrics.outs - a.metrics.outs)[0],
    }
  }, [pitchingSummaries])

  const hotPlayers = useMemo(
    () =>
      [...battingSummaries]
        .filter((summary) => summary.metrics.pa >= leagueConfig.manager.minimumRatePa)
        .sort((a, b) => b.metrics.ops - a.metrics.ops || b.metrics.pa - a.metrics.pa)
        .slice(0, 3),
    [battingSummaries, leagueConfig]
  )

  const suggestedLineup = useMemo(
    () => sortLineup(battingSummaries, lineupStyle, leagueConfig),
    [battingSummaries, leagueConfig, lineupStyle]
  )

  const positionBalance = useMemo(() => {
    const counts: Record<string, number> = {
      Pitchers: 0,
      Catchers: 0,
      Infielders: 0,
      Outfielders: 0,
      Utility: 0,
    }
    players.forEach((player) => {
      counts[getPositionGroup(player.positions[0])] += 1
    })
    return counts
  }, [players])

  const pitchingRoster = useMemo(
    () =>
      pitchingSummaries
        .filter((summary) => summary.player.positions.includes("P"))
        .sort((a, b) => {
        return (
          b.metrics.outs - a.metrics.outs ||
          b.metrics.so - a.metrics.so ||
          (a.player.jerseyNumber ?? 999) - (b.player.jerseyNumber ?? 999)
        )
      }),
    [pitchingSummaries]
  )

  const strikeoutLeaders = useMemo(
    () =>
      [...pitchingSummaries]
        .filter((summary) => summary.metrics.so > 0)
        .sort((a, b) => b.metrics.so - a.metrics.so)
        .slice(0, 5),
    [pitchingSummaries]
  )

  const renderLeaderValue = (
    summary: { player: Player; metrics: ReturnType<typeof calcBattingMetrics> } | undefined,
    value: string
  ) => (summary ? `${summary.player.name} ${value}` : "No data")

  return (
    <main className="w-full space-y-6">
      <section className="rounded-2xl border border-white/70 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {team?.name ?? "No Team"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-green-950 sm:text-3xl">
              Team Manager
            </h1>
            <p className="mt-1 text-sm text-gray-400">
              {team?.currentSeasonYear ?? "-"} Season · {players.length} players
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(["batting", "pitching"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setManagerMode(view)}
                className={`rounded-full px-4 py-1.5 text-sm font-bold transition-colors ${
                  managerMode === view
                    ? "bg-green-900 text-white shadow-sm"
                    : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                }`}
              >
                {view === "batting" ? "Batting" : "Pitching"}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {managerMode === "batting" ? (
          <>
            {[
              { label: "Games", value: String(teamBatting.games), sub: "played", accent: true },
              { label: "AVG", value: fmtRate(teamBatting.avg), sub: "team batting" },
              { label: "OBP", value: fmtRate(teamBatting.obp), sub: "on-base" },
              { label: "OPS", value: fmtRate(teamBatting.ops), sub: "production" },
              { label: "HR", value: String(teamBatting.hr), sub: "home runs" },
              { label: "RBI", value: String(teamBatting.rbi), sub: "runs batted in" },
              { label: "SB", value: String(teamBatting.sb), sub: "stolen bases" },
              { label: "SB%", value: fmtStealPct(teamBatting.sb, teamBatting.cs), sub: "steal rate" },
            ].map(({ label, value, sub, accent }) => (
              <ManagerSummaryCard key={label} label={label} value={value} sub={sub} accent={accent} />
            ))}
          </>
        ) : (
          <>
            {[
              { label: "APP", value: String(teamPitching.games), sub: "appearances", accent: true },
              { label: "ERA", value: fmtDecimal(teamPitching.era), sub: "earned runs" },
              { label: "WHIP", value: fmtDecimal(teamPitching.whip), sub: "traffic" },
              { label: "IP", value: fmtIp(teamPitching.outs), sub: "innings" },
              { label: "SO", value: String(teamPitching.so), sub: "strikeouts" },
              { label: "BB", value: String(teamPitching.bb), sub: "walks" },
            ].map(({ label, value, sub, accent }) => (
              <ManagerSummaryCard key={label} label={label} value={value} sub={sub} accent={accent} />
            ))}
          </>
        )}
      </section>

      <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Current View</p>
            <h2 className="mt-1 text-base font-bold text-gray-900">
              {managerMode === "batting" ? "Batting Dashboard" : "Pitching Dashboard"}
            </h2>
          </div>
          <p className="text-sm text-gray-400">
            Review leaders, roster balance, and suggested decisions for the selected team.
          </p>
        </div>
      </section>

      {managerMode === "batting" ? (
        <>
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-gray-900">Team Leaders</h2>
                <span className="rounded-full bg-[#f7f8f3] px-2.5 py-1 text-[11px] font-bold text-gray-500">
                  Min {leagueConfig.manager.minimumRatePa} PA
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">AVG</span><span className="font-semibold text-gray-900">{renderLeaderValue(battingLeaders.avg, battingLeaders.avg ? fmtRate(battingLeaders.avg.metrics.avg) : "")}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">HR</span><span className="font-semibold text-gray-900">{renderLeaderValue(battingLeaders.hr, battingLeaders.hr ? String(battingLeaders.hr.metrics.hr) : "")}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">RBI</span><span className="font-semibold text-gray-900">{renderLeaderValue(battingLeaders.rbi, battingLeaders.rbi ? String(battingLeaders.rbi.metrics.rbi) : "")}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">SB</span><span className="font-semibold text-gray-900">{renderLeaderValue(battingLeaders.sb, battingLeaders.sb ? String(battingLeaders.sb.metrics.sb) : "")}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">Hits</span><span className="font-semibold text-gray-900">{renderLeaderValue(battingLeaders.hits, battingLeaders.hits ? String(battingLeaders.hits.metrics.h) : "")}</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-base font-bold text-gray-900">Hot Players</h2>
                <span className="rounded-full bg-[#f7f8f3] px-2.5 py-1 text-[11px] font-bold text-gray-500">
                  Min {leagueConfig.manager.minimumRatePa} PA
                </span>
              </div>
              <div className="mt-4 space-y-3 text-sm">
                {hotPlayers.length === 0 ? (
                  <p className="text-gray-400">No qualified hitters yet.</p>
                ) : (
                  hotPlayers.map((summary) => (
                    <p key={summary.player.id} className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                      <span className="font-semibold text-gray-900">{summary.player.name}</span>
                      <span className="text-xs font-bold text-green-900">OPS {fmtRate(summary.metrics.ops)} · {summary.metrics.pa} PA</span>
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-gray-900">Position Balance</h2>
              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(positionBalance).map(([label, count]) => (
                  <p key={label} className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</span>
                    <span className="font-extrabold text-green-950">{count}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-base font-bold text-gray-900">Suggested Lineup</h2>
              <div className="flex flex-wrap gap-2">
                {(["balanced", "obp", "power", "contact"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLineupStyle(style)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase transition-colors ${
                      lineupStyle === style
                        ? "bg-green-900 text-white"
                        : "border border-gray-200 bg-white text-gray-600 hover:border-green-800 hover:text-green-900"
                    }`}
                  >
                    {style}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
              {suggestedLineup.map((summary, index) => (
                <div key={summary.player.id} className="rounded-xl border border-gray-100 px-4 py-3 text-sm">
                  <p className="font-semibold text-gray-900">
                    {index + 1}. {getPlayerLabel(summary.player)} <span className="text-gray-500">{summary.player.positions.join(", ")}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    PA {summary.metrics.pa} · AVG {fmtRate(summary.metrics.avg)} · OBP {fmtRate(summary.metrics.obp)} · OPS {fmtRate(summary.metrics.ops)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-base font-bold text-gray-900">Pitching Leaders</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">ERA</span><span className="font-semibold text-gray-900">{pitchingLeaders.era ? `${pitchingLeaders.era.player.name} ${fmtDecimal(pitchingLeaders.era.metrics.era)}` : "No data"}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">WHIP</span><span className="font-semibold text-gray-900">{pitchingLeaders.whip ? `${pitchingLeaders.whip.player.name} ${fmtDecimal(pitchingLeaders.whip.metrics.whip)}` : "No data"}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">SO</span><span className="font-semibold text-gray-900">{pitchingLeaders.so ? `${pitchingLeaders.so.player.name} ${pitchingLeaders.so.metrics.so}` : "No data"}</span></p>
                <p className="flex justify-between gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5"><span className="text-xs font-bold uppercase tracking-widest text-gray-400">IP</span><span className="font-semibold text-gray-900">{pitchingLeaders.ip ? `${pitchingLeaders.ip.player.name} ${fmtIp(pitchingLeaders.ip.metrics.outs)}` : "No data"}</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
              <h2 className="text-base font-bold text-gray-900">Strikeouts by Pitcher</h2>
              <div className="mt-4 space-y-3">
                {strikeoutLeaders.length === 0 ? (
                  <p className="text-sm text-gray-400">No strikeout data yet.</p>
                ) : (
                  strikeoutLeaders.map((summary) => {
                    const maxStrikeouts = Math.max(...strikeoutLeaders.map((leader) => leader.metrics.so), 1)
                    return (
                      <div key={summary.player.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-semibold text-gray-900">{summary.player.name}</span>
                          <span className="text-xs font-bold text-green-900">{summary.metrics.so} SO</span>
                        </div>
                        <div className="h-2 rounded-full bg-[#f7f8f3]">
                          <div className="h-2 rounded-full bg-green-800" style={{ width: `${Math.max((summary.metrics.so / maxStrikeouts) * 100, 8)}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-gray-900">Pitching Roster Overview</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Player</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Pos</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">APP</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">IP</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-green-700">ERA</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">WHIP</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">H</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">ER</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">BB</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">SO</th>
                    <th className="border-b border-gray-100 pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {pitchingRoster.map(({ player, metrics }) => (
                    <tr key={player.id}>
                      <td className="py-3 pr-4 font-semibold text-gray-900">{getPlayerLabel(player)}</td>
                      <td className="py-3 pr-4 text-gray-600">{player.positions.join(", ")}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.games}</td>
                      <td className="py-3 pr-4 text-gray-600">{fmtIp(metrics.outs)}</td>
                      <td className="py-3 pr-4 font-bold text-green-900">{fmtDecimal(metrics.era)}</td>
                      <td className="py-3 pr-4 text-gray-600">{fmtDecimal(metrics.whip)}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.h}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.er}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.bb}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.so}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.hr}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </main>
  )
}

function ManagerSummaryCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string
  sub?: string
  accent?: boolean
}) {
  return (
    <div
      className={`rounded-2xl p-4 shadow-sm sm:p-5 ${
        accent ? "bg-green-800 text-white" : "border border-gray-100 bg-white"
      }`}
    >
      <p
        className={`text-xs font-bold uppercase tracking-widest ${
          accent ? "text-green-300" : "text-gray-400"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-extrabold tracking-tight ${
          accent ? "text-white" : "text-green-950"
        }`}
      >
        {value}
      </p>
      {sub && (
        <p className={`mt-1 text-xs ${accent ? "text-green-400" : "text-gray-400"}`}>
          {sub}
        </p>
      )}
    </div>
  )
}
