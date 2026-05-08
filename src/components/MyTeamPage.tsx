import { useMemo } from "react"
import type { Player, Team, SavedBattingGameEntry, SavedPitchingGameEntry, DraftGameMeta } from "../types"

type Props = {
  team: Team | null
  players: Player[]
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
}

const positionOrder: Record<string, number> = {
  P: 0, C: 1, "1B": 2, "2B": 3, "3B": 4, SS: 5, LF: 6, CF: 7, RF: 8, DH: 9, UTIL: 10,
}

function getBattingMetrics(entries: SavedBattingGameEntry[]) {
  const t = entries.reduce(
    (acc, e) => {
      acc.games++
      acc.ab += e.statLine.AB
      acc.h += e.statLine.H
      acc.doubles += e.statLine.doubles
      acc.triples += e.statLine.triples
      acc.hr += e.statLine.HR
      acc.rbi += e.statLine.RBI
      acc.bb += e.statLine.BB
      acc.hbp += e.statLine.HBP ?? 0
      acc.sf += e.statLine.SF ?? 0
      acc.so += e.statLine.SO
      return acc
    },
    { games: 0, ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0, hbp: 0, sf: 0, so: 0 }
  )
  const singles = Math.max(t.h - t.doubles - t.triples - t.hr, 0)
  const totalBases = singles + t.doubles * 2 + t.triples * 3 + t.hr * 4
  const pa = t.ab + t.bb + t.hbp + t.sf
  const avg = t.ab > 0 ? t.h / t.ab : 0
  const obp = pa > 0 ? (t.h + t.bb + t.hbp) / pa : 0
  const slg = t.ab > 0 ? totalBases / t.ab : 0
  return { ...t, pa, avg, obp, ops: obp + slg }
}

function getPitchingMetrics(entries: SavedPitchingGameEntry[]) {
  const t = entries.reduce(
    (acc, e) => {
      acc.games++
      acc.outs += e.statLine.inningsPitchedOuts
      acc.h += e.statLine.hitsAllowed
      acc.r += e.statLine.runsAllowed
      acc.er += e.statLine.earnedRuns
      acc.bb += e.statLine.walks
      acc.hbp += e.statLine.hitBatters
      acc.so += e.statLine.strikeouts
      acc.hr += e.statLine.homeRunsAllowed
      return acc
    },
    { games: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, hbp: 0, so: 0, hr: 0 }
  )
  const ip = t.outs / 3
  const era = ip > 0 ? (t.er * 9) / ip : 0
  const whip = ip > 0 ? (t.bb + t.h) / ip : 0
  return { ...t, ip, era, whip }
}

function fmtRate(v: number) {
  return v.toFixed(3).replace("0.", ".")
}

function fmtIp(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

export default function MyTeamPage({ team, players, savedEntriesByPlayer, pitchingEntriesByPlayer }: Props) {

  const uniqueGames = useMemo(() => {
    const map = new Map<number, DraftGameMeta>()
    Object.values(savedEntriesByPlayer).flat().forEach((entry) => {
      if (!map.has(entry.gameId)) map.set(entry.gameId, entry.gameMeta)
    })
    return Array.from(map.entries())
      .map(([gameId, meta]) => ({ gameId, meta }))
      .sort((a, b) => b.meta.date.localeCompare(a.meta.date))
  }, [savedEntriesByPlayer])

  const record = useMemo(
    () => uniqueGames.reduce(
      (acc, { meta }) => {
        if (meta.result === "W") acc.w++
        else if (meta.result === "L") acc.l++
        else if (meta.result === "T") acc.t++
        return acc
      },
      { w: 0, l: 0, t: 0 }
    ),
    [uniqueGames]
  )

  const teamBatting = useMemo(
    () => getBattingMetrics(Object.values(savedEntriesByPlayer).flat()),
    [savedEntriesByPlayer]
  )

  const teamPitching = useMemo(
    () => getPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const playerBattingStats = useMemo(
    () => [...players]
      .map((player) => ({ player, metrics: getBattingMetrics(savedEntriesByPlayer[player.id] ?? []) }))
      .sort((a, b) => b.metrics.avg - a.metrics.avg),
    [players, savedEntriesByPlayer]
  )

  const playerPitchingStats = useMemo(
    () => players
      .filter((p) => (pitchingEntriesByPlayer[p.id] ?? []).length > 0)
      .map((player) => ({ player, metrics: getPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []) }))
      .sort((a, b) => {
        if (a.metrics.outs === 0 && b.metrics.outs === 0) return 0
        if (a.metrics.outs === 0) return 1
        if (b.metrics.outs === 0) return -1
        return a.metrics.era - b.metrics.era
      }),
    [players, pitchingEntriesByPlayer]
  )

  const sortedRoster = useMemo(
    () => [...players].sort((a, b) => {
      const posDiff = (positionOrder[a.position] ?? 99) - (positionOrder[b.position] ?? 99)
      if (posDiff !== 0) return posDiff
      return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
    }),
    [players]
  )

  if (!team) {
    return (
      <main className="w-full rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
        No team selected.
      </main>
    )
  }

  return (
    <main className="w-full">
      <div className="space-y-4 sm:space-y-6">

        {/* Team header — full width */}
        <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
          <p className="text-sm font-medium text-green-900">My Team</p>
          <h1 className="mt-2 text-xl font-bold text-gray-900 sm:text-2xl">{team.name}</h1>
          <p className="mt-1 text-sm text-gray-500">{team.currentSeasonYear} Season</p>
          <div className="mt-4 flex flex-wrap gap-3">
            <StatPill label="Record" value={`${record.w}W – ${record.l}L${record.t > 0 ? ` – ${record.t}T` : ""}`} />
            <StatPill label="Games" value={String(uniqueGames.length)} />
            <StatPill label="Players" value={String(players.length)} />
          </div>
        </div>

        {/* 2-column layout: main stats left, game results right */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6 sm:gap-6">

          {/* ── Left column ── */}
          <div className="flex-1 min-w-0 space-y-4 sm:space-y-6">

            {/* Roster */}
            <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Roster</h2>
              {sortedRoster.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No players on this team.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sortedRoster.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-900 text-xs font-bold text-white">
                        {player.jerseyNumber != null ? `#${player.jerseyNumber}` : "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{player.name}</p>
                        <p className="text-xs text-gray-500">{player.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Team batting */}
            <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Team Batting</h2>
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
                {[
                  { label: "AVG", value: teamBatting.ab > 0 ? fmtRate(teamBatting.avg) : "—" },
                  { label: "OBP", value: teamBatting.pa > 0 ? fmtRate(teamBatting.obp) : "—" },
                  { label: "OPS", value: teamBatting.pa > 0 ? fmtRate(teamBatting.ops) : "—" },
                  { label: "HR", value: String(teamBatting.hr) },
                  { label: "RBI", value: String(teamBatting.rbi) },
                ].map((s) => (
                  <div key={s.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
                    <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Team pitching */}
            {teamPitching.games > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Team Pitching</h2>
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5 sm:gap-4">
                  {[
                    { label: "ERA", value: teamPitching.outs > 0 ? teamPitching.era.toFixed(2) : "—" },
                    { label: "WHIP", value: teamPitching.outs > 0 ? teamPitching.whip.toFixed(2) : "—" },
                    { label: "IP", value: fmtIp(teamPitching.outs) },
                    { label: "SO", value: String(teamPitching.so) },
                    { label: "BB", value: String(teamPitching.bb) },
                  ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-center">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{s.label}</p>
                      <p className="mt-1 text-xl font-bold text-gray-900">{s.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Batting leaderboard */}
            <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Batting Leaderboard</h2>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-105 text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <th className="pb-3 pr-3 text-left">Player</th>
                      <th className="pb-3 px-2 text-center">G</th>
                      <th className="pb-3 px-2 text-center">AVG</th>
                      <th className="pb-3 px-2 text-center">OBP</th>
                      <th className="pb-3 px-2 text-center">OPS</th>
                      <th className="pb-3 px-2 text-center">HR</th>
                      <th className="pb-3 px-2 text-center">RBI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {playerBattingStats.map(({ player, metrics }) => (
                      <tr key={player.id} className="border-b border-gray-100 last:border-0">
                        <td className="py-3 pr-3">
                          <span className="font-medium text-gray-900">
                            {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                            {player.name}
                          </span>
                          <span className="ml-2 text-xs text-gray-400">{player.position}</span>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.games}</td>
                        <td className="px-2 py-3 text-center font-semibold text-gray-900">
                          {metrics.ab > 0 ? fmtRate(metrics.avg) : "—"}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">
                          {metrics.pa > 0 ? fmtRate(metrics.obp) : "—"}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">
                          {metrics.pa > 0 ? fmtRate(metrics.ops) : "—"}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.hr}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.rbi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pitching leaderboard */}
            {playerPitchingStats.length > 0 && (
              <div className="rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
                <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Pitching Leaderboard</h2>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full min-w-105 text-sm">
                    <thead>
                      <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                        <th className="pb-3 pr-3 text-left">Player</th>
                        <th className="pb-3 px-2 text-center">G</th>
                        <th className="pb-3 px-2 text-center">IP</th>
                        <th className="pb-3 px-2 text-center">ERA</th>
                        <th className="pb-3 px-2 text-center">WHIP</th>
                        <th className="pb-3 px-2 text-center">SO</th>
                        <th className="pb-3 px-2 text-center">BB</th>
                      </tr>
                    </thead>
                    <tbody>
                      {playerPitchingStats.map(({ player, metrics }) => (
                        <tr key={player.id} className="border-b border-gray-100 last:border-0">
                          <td className="py-3 pr-3">
                            <span className="font-medium text-gray-900">
                              {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                              {player.name}
                            </span>
                            <span className="ml-2 text-xs text-gray-400">{player.position}</span>
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.games}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{fmtIp(metrics.outs)}</td>
                          <td className="px-2 py-3 text-center font-semibold text-gray-900">
                            {metrics.outs > 0 ? metrics.era.toFixed(2) : "—"}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">
                            {metrics.outs > 0 ? metrics.whip.toFixed(2) : "—"}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.so}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.bb}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* ── Right column: Game Results ── */}
          <div className="shrink-0 lg:w-72 xl:w-80">
            <div className="sticky top-4 rounded-xl bg-white p-4 shadow-sm sm:rounded-2xl sm:p-6">
              <h2 className="text-base font-semibold text-gray-900 sm:text-lg">Game Results</h2>

              {uniqueGames.length === 0 ? (
                <p className="mt-4 text-sm text-gray-500">No games recorded yet.</p>
              ) : (
                <div className="mt-4 space-y-2">
                  {uniqueGames.map(({ gameId, meta }) => (
                    <GameResultRow key={gameId} meta={meta} />
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  )
}

/* ── サブコンポーネント ── */

function StatPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function GameResultRow({ meta }: { meta: DraftGameMeta }) {
  const resultColors: Record<string, string> = {
    W: "bg-emerald-100 text-emerald-800",
    L: "bg-red-100 text-red-700",
    T: "bg-gray-100 text-gray-600",
  }

  const hasScore = meta.teamScore != null && meta.opponentScore != null
  const colorClass = meta.result ? resultColors[meta.result] ?? "bg-gray-100 text-gray-500" : "bg-gray-100 text-gray-400"

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 px-3 py-3">
      {/* Result badge */}
      <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${colorClass}`}>
        {meta.result || "—"}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">
          vs {meta.opponent || "—"}
        </p>
        <p className="text-xs text-gray-400">{meta.date}</p>
      </div>

      {/* Score */}
      {hasScore && (
        <div className="shrink-0 text-right">
          <p className="text-sm font-bold text-gray-900">
            {meta.teamScore} – {meta.opponentScore}
          </p>
        </div>
      )}
    </div>
  )
}
