import { useMemo, useState } from "react"
import type { Player, SavedBattingGameEntry, SavedPitchingGameEntry, Team } from "../types"

type ManagerMode = "batting" | "pitching"
type LineupStyle = "balanced" | "obp" | "power" | "contact"

type Props = {
  team: Team | null
  players: Player[]
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
}

function getBattingMetrics(entries: SavedBattingGameEntry[]) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.games += 1
      acc.ab += entry.statLine.AB
      acc.h += entry.statLine.H
      acc.doubles += entry.statLine.doubles
      acc.triples += entry.statLine.triples
      acc.hr += entry.statLine.HR
      acc.rbi += entry.statLine.RBI
      acc.bb += entry.statLine.BB
      acc.hbp += entry.statLine.HBP ?? 0
      acc.sf += entry.statLine.SF ?? 0
      acc.so += entry.statLine.SO
      return acc
    },
    { games: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, hbp: 0, sf: 0, so: 0 }
  )

  const singles = Math.max(totals.h - totals.doubles - totals.triples - totals.hr, 0)
  const totalBases = singles + totals.doubles * 2 + totals.triples * 3 + totals.hr * 4
  const pa = totals.ab + totals.bb + totals.hbp + totals.sf
  const avg = totals.ab > 0 ? totals.h / totals.ab : 0
  const obp = pa > 0 ? (totals.h + totals.bb + totals.hbp) / pa : 0
  const slg = totals.ab > 0 ? totalBases / totals.ab : 0

  return { ...totals, avg, obp, ops: obp + slg }
}

function formatRate(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

function formatDecimal(value: number) {
  return value.toFixed(2)
}

function formatInnings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

function getPitchingMetrics(entries: SavedPitchingGameEntry[]) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.games += 1
      acc.outs += entry.statLine.inningsPitchedOuts
      acc.h += entry.statLine.hitsAllowed
      acc.r += entry.statLine.runsAllowed
      acc.er += entry.statLine.earnedRuns
      acc.bb += entry.statLine.walks
      acc.so += entry.statLine.strikeouts
      acc.hr += entry.statLine.homeRunsAllowed
      return acc
    },
    { games: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0 }
  )
  const innings = totals.outs / 3
  const era = innings > 0 ? (totals.er * 9) / innings : 0
  const whip = innings > 0 ? (totals.bb + totals.h) / innings : 0

  return { ...totals, era, whip, ip: formatInnings(totals.outs) }
}

function getPlayerLabel(player: Player) {
  return player.jerseyNumber != null ? `#${player.jerseyNumber} ${player.name}` : player.name
}

function getPositionGroup(position: Player["position"]) {
  if (position === "P") return "Pitchers"
  if (position === "C") return "Catchers"
  if (position === "LF" || position === "CF" || position === "RF") return "Outfielders"
  if (position === "UTIL" || position === "DH") return "Utility"
  return "Infielders"
}

function sortLineup(
  summaries: Array<{ player: Player; metrics: ReturnType<typeof getBattingMetrics> }>,
  style: LineupStyle
) {
  const active = summaries.filter((summary) => summary.metrics.ab > 0)
  const source = active.length > 0 ? active : summaries

  return [...source]
    .sort((a, b) => {
      if (style === "obp") {
        return (
          b.metrics.obp - a.metrics.obp ||
          b.metrics.avg - a.metrics.avg ||
          b.metrics.ops - a.metrics.ops
        )
      }

      if (style === "power") {
        return (
          b.metrics.ops - a.metrics.ops ||
          b.metrics.hr - a.metrics.hr ||
          b.metrics.rbi - a.metrics.rbi
        )
      }

      if (style === "contact") {
        const aContact = a.metrics.ab > 0 ? a.metrics.so / a.metrics.ab : 1
        const bContact = b.metrics.ab > 0 ? b.metrics.so / b.metrics.ab : 1
        return (
          b.metrics.avg - a.metrics.avg ||
          aContact - bContact ||
          b.metrics.h - a.metrics.h
        )
      }

      return (
        b.metrics.obp + b.metrics.ops + b.metrics.avg -
        (a.metrics.obp + a.metrics.ops + a.metrics.avg)
      )
    })
    .slice(0, 9)
}

export default function TeamManagerDashboard({
  team,
  players,
  savedEntriesByPlayer,
  pitchingEntriesByPlayer,
}: Props) {
  const [managerMode, setManagerMode] = useState<ManagerMode>("batting")
  const [lineupStyle, setLineupStyle] = useState<LineupStyle>("balanced")

  const battingSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: getBattingMetrics(savedEntriesByPlayer[player.id] ?? []),
      })),
    [players, savedEntriesByPlayer]
  )

  const pitchingSummaries = useMemo(
    () =>
      players.map((player) => ({
        player,
        metrics: getPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
      })),
    [players, pitchingEntriesByPlayer]
  )

  const teamBatting = useMemo(
    () => getBattingMetrics(Object.values(savedEntriesByPlayer).flat()),
    [savedEntriesByPlayer]
  )

  const teamPitching = useMemo(
    () => getPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const battingLeaders = useMemo(() => {
    const eligible = battingSummaries.filter((summary) => summary.metrics.ab > 0)
    return {
      avg: [...eligible].sort((a, b) => b.metrics.avg - a.metrics.avg)[0],
      hr: [...battingSummaries].sort((a, b) => b.metrics.hr - a.metrics.hr)[0],
      rbi: [...battingSummaries].sort((a, b) => b.metrics.rbi - a.metrics.rbi)[0],
      hits: [...battingSummaries].sort((a, b) => b.metrics.h - a.metrics.h)[0],
    }
  }, [battingSummaries])

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
        .filter((summary) => summary.metrics.ab > 0)
        .sort((a, b) => b.metrics.ops - a.metrics.ops)
        .slice(0, 3),
    [battingSummaries]
  )

  const suggestedLineup = useMemo(
    () => sortLineup(battingSummaries, lineupStyle),
    [battingSummaries, lineupStyle]
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
      counts[getPositionGroup(player.position)] += 1
    })
    return counts
  }, [players])

  const pitchingRoster = useMemo(
    () =>
      [...pitchingSummaries].sort((a, b) => {
        if (a.player.position === "P" && b.player.position !== "P") return -1
        if (a.player.position !== "P" && b.player.position === "P") return 1
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
    summary: { player: Player; metrics: ReturnType<typeof getBattingMetrics> } | undefined,
    value: string
  ) => (summary ? `${summary.player.name} ${value}` : "No data")

  return (
    <main className="w-full space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-green-900">Team Manager</p>
            <h1 className="mt-2 text-2xl font-bold">{team?.name ?? "No Team"}</h1>
            <p className="mt-2 text-sm text-gray-600">
              Season {team?.currentSeasonYear ?? "-"} · {players.length} players
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
            {(["batting", "pitching"] as const).map((view) => (
              <button
                key={view}
                type="button"
                onClick={() => setManagerMode(view)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold ${
                  managerMode === view
                    ? "bg-green-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-green-900"
                }`}
              >
                {view === "batting" ? "Batting" : "Pitching"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm text-gray-700">
          {managerMode === "batting" ? (
            <>
              <span className="rounded-full bg-gray-100 px-3 py-1">G {teamBatting.games}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">AVG {formatRate(teamBatting.avg)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">OBP {formatRate(teamBatting.obp)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">OPS {formatRate(teamBatting.ops)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">HR {teamBatting.hr}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">RBI {teamBatting.rbi}</span>
            </>
          ) : (
            <>
              <span className="rounded-full bg-gray-100 px-3 py-1">APP {teamPitching.games}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">ERA {formatDecimal(teamPitching.era)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">WHIP {formatDecimal(teamPitching.whip)}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">IP {teamPitching.ip}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">SO {teamPitching.so}</span>
              <span className="rounded-full bg-gray-100 px-3 py-1">BB {teamPitching.bb}</span>
            </>
          )}
        </div>
      </section>

      {managerMode === "batting" ? (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Team Leaders</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between gap-3"><span className="text-gray-500">AVG</span><span className="font-semibold">{renderLeaderValue(battingLeaders.avg, battingLeaders.avg ? formatRate(battingLeaders.avg.metrics.avg) : "")}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">HR</span><span className="font-semibold">{renderLeaderValue(battingLeaders.hr, battingLeaders.hr ? String(battingLeaders.hr.metrics.hr) : "")}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">RBI</span><span className="font-semibold">{renderLeaderValue(battingLeaders.rbi, battingLeaders.rbi ? String(battingLeaders.rbi.metrics.rbi) : "")}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">Hits</span><span className="font-semibold">{renderLeaderValue(battingLeaders.hits, battingLeaders.hits ? String(battingLeaders.hits.metrics.h) : "")}</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Hot Players</h2>
              <div className="mt-4 space-y-3 text-sm">
                {hotPlayers.length === 0 ? (
                  <p className="text-gray-500">No batting data yet.</p>
                ) : (
                  hotPlayers.map((summary) => (
                    <p key={summary.player.id} className="flex justify-between gap-3">
                      <span className="font-medium">{summary.player.name}</span>
                      <span className="text-gray-500">OPS {formatRate(summary.metrics.ops)}</span>
                    </p>
                  ))
                )}
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Position Balance</h2>
              <div className="mt-4 space-y-3 text-sm">
                {Object.entries(positionBalance).map(([label, count]) => (
                  <p key={label} className="flex justify-between gap-3">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-semibold">{count}</span>
                  </p>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Suggested Lineup</h2>
              <div className="flex flex-wrap gap-2">
                {(["balanced", "obp", "power", "contact"] as const).map((style) => (
                  <button
                    key={style}
                    type="button"
                    onClick={() => setLineupStyle(style)}
                    className={`rounded-lg px-3 py-2 text-xs font-semibold uppercase ${
                      lineupStyle === style
                        ? "bg-green-900 text-white"
                        : "bg-gray-100 text-gray-600 hover:bg-green-50 hover:text-green-900"
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
                    {index + 1}. {getPlayerLabel(summary.player)} <span className="text-gray-500">{summary.player.position}</span>
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    AVG {formatRate(summary.metrics.avg)} · OBP {formatRate(summary.metrics.obp)} · OPS {formatRate(summary.metrics.ops)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
            <div className="rounded-2xl bg-white p-4 shadow-sm">
              <h2 className="text-lg font-semibold">Pitching Leaders</h2>
              <div className="mt-4 space-y-3 text-sm">
                <p className="flex justify-between gap-3"><span className="text-gray-500">ERA</span><span className="font-semibold">{pitchingLeaders.era ? `${pitchingLeaders.era.player.name} ${formatDecimal(pitchingLeaders.era.metrics.era)}` : "No data"}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">WHIP</span><span className="font-semibold">{pitchingLeaders.whip ? `${pitchingLeaders.whip.player.name} ${formatDecimal(pitchingLeaders.whip.metrics.whip)}` : "No data"}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">SO</span><span className="font-semibold">{pitchingLeaders.so ? `${pitchingLeaders.so.player.name} ${pitchingLeaders.so.metrics.so}` : "No data"}</span></p>
                <p className="flex justify-between gap-3"><span className="text-gray-500">IP</span><span className="font-semibold">{pitchingLeaders.ip ? `${pitchingLeaders.ip.player.name} ${pitchingLeaders.ip.metrics.ip}` : "No data"}</span></p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm xl:col-span-2">
              <h2 className="text-lg font-semibold">Strikeouts by Pitcher</h2>
              <div className="mt-4 space-y-3">
                {strikeoutLeaders.length === 0 ? (
                  <p className="text-sm text-gray-500">No strikeout data yet.</p>
                ) : (
                  strikeoutLeaders.map((summary) => {
                    const maxStrikeouts = Math.max(...strikeoutLeaders.map((leader) => leader.metrics.so), 1)
                    return (
                      <div key={summary.player.id}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="font-medium text-gray-900">{summary.player.name}</span>
                          <span className="text-gray-500">{summary.metrics.so} SO</span>
                        </div>
                        <div className="h-3 rounded-full bg-gray-100">
                          <div className="h-3 rounded-full bg-green-900" style={{ width: `${Math.max((summary.metrics.so / maxStrikeouts) * 100, 8)}%` }} />
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-lg font-semibold">Pitching Roster Overview</h2>
            <div className="mt-4 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="py-2 pr-4">Player</th>
                    <th className="py-2 pr-4">Pos</th>
                    <th className="py-2 pr-4">APP</th>
                    <th className="py-2 pr-4">IP</th>
                    <th className="py-2 pr-4">ERA</th>
                    <th className="py-2 pr-4">WHIP</th>
                    <th className="py-2 pr-4">H</th>
                    <th className="py-2 pr-4">ER</th>
                    <th className="py-2 pr-4">BB</th>
                    <th className="py-2 pr-4">SO</th>
                    <th className="py-2 pr-4">HR</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pitchingRoster.map(({ player, metrics }) => (
                    <tr key={player.id}>
                      <td className="py-3 pr-4 font-medium text-gray-900">{getPlayerLabel(player)}</td>
                      <td className="py-3 pr-4 text-gray-600">{player.position}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.games}</td>
                      <td className="py-3 pr-4 text-gray-600">{metrics.ip}</td>
                      <td className="py-3 pr-4 text-gray-600">{formatDecimal(metrics.era)}</td>
                      <td className="py-3 pr-4 text-gray-600">{formatDecimal(metrics.whip)}</td>
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
