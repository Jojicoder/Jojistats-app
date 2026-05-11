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

function fmtRate(v: number) { return v.toFixed(3).replace("0.", ".") }
function fmtIp(outs: number) { return `${Math.floor(outs / 3)}.${outs % 3}` }

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
      <main className="w-full rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        No team selected.
      </main>
    )
  }

  return (
    <main className="w-full">
      <div className="space-y-5">

        {/* ── Team Header ── */}
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Team</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">{team.name}</h1>
            </div>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-900">
              {team.currentSeasonYear} Season
            </span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-3">
            {/* Record — accent card */}
            <div className="rounded-xl bg-green-800 p-4 text-white">
              <p className="text-xs font-bold uppercase tracking-widest text-green-300">Record</p>
              <p className="mt-2 text-2xl font-extrabold">
                {record.w}–{record.l}{record.t > 0 ? `–${record.t}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-green-400">{uniqueGames.length} games</p>
            </div>
            {/* Games */}
            <div className="rounded-xl bg-[#f7f8f3] p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{uniqueGames.length}</p>
            </div>
            {/* Players */}
            <div className="rounded-xl bg-[#f7f8f3] p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Players</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{players.length}</p>
            </div>
          </div>
        </div>

        {/* ── Two-column layout ── */}
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start">

          {/* ── Left column ── */}
          <div className="min-w-0 flex-1 space-y-5">

            {/* Roster */}
            <Card title="Roster">
              {sortedRoster.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No players on this team.</p>
              ) : (
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {sortedRoster.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-xs font-bold text-green-900">
                        {player.jerseyNumber != null ? player.jerseyNumber : "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.position}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Team Batting */}
            <Card title="Team Batting">
              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {[
                  { label: "AVG", value: teamBatting.ab > 0 ? fmtRate(teamBatting.avg) : "—", accent: true },
                  { label: "OBP", value: teamBatting.pa > 0 ? fmtRate(teamBatting.obp) : "—" },
                  { label: "OPS", value: teamBatting.pa > 0 ? fmtRate(teamBatting.ops) : "—" },
                  { label: "HR",  value: String(teamBatting.hr) },
                  { label: "RBI", value: String(teamBatting.rbi) },
                ].map((s) => <StatTile key={s.label} label={s.label} value={s.value} accent={s.accent} />)}
              </div>
            </Card>

            {/* Team Pitching */}
            {teamPitching.games > 0 && (
              <Card title="Team Pitching">
                <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                  {[
                    { label: "ERA",  value: teamPitching.outs > 0 ? teamPitching.era.toFixed(2) : "—", accent: true },
                    { label: "WHIP", value: teamPitching.outs > 0 ? teamPitching.whip.toFixed(2) : "—" },
                    { label: "IP",   value: fmtIp(teamPitching.outs) },
                    { label: "SO",   value: String(teamPitching.so) },
                    { label: "BB",   value: String(teamPitching.bb) },
                  ].map((s) => <StatTile key={s.label} label={s.label} value={s.value} accent={s.accent} />)}
                </div>
              </Card>
            )}

            {/* Batting Leaderboard */}
            <Card title="Batting Leaderboard">
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                      <th className="pb-3 pr-2 w-5 text-left">#</th>
                      <th className="pb-3 pr-4 text-left">Player</th>
                      <th className="pb-3 px-2 text-center">G</th>
                      <th className="pb-3 px-2 text-center text-green-700">AVG</th>
                      <th className="pb-3 px-2 text-center">OBP</th>
                      <th className="pb-3 px-2 text-center">OPS</th>
                      <th className="pb-3 px-2 text-center">HR</th>
                      <th className="pb-3 px-2 text-center">RBI</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {playerBattingStats.map(({ player, metrics }, i) => (
                      <tr key={player.id}>
                        <td className="py-3 pr-2 text-xs text-gray-300">{i + 1}</td>
                        <td className="py-3 pr-4">
                          <span className="font-semibold text-gray-900">
                            {player.jerseyNumber != null && (
                              <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                            )}
                            {player.name}
                          </span>
                          <span className="ml-1.5 text-xs text-gray-400">{player.position}</span>
                        </td>
                        <td className="px-2 py-3 text-center text-gray-500">{metrics.games}</td>
                        <td className="px-2 py-3 text-center font-bold text-green-900">
                          {metrics.ab > 0 ? fmtRate(metrics.avg) : "—"}
                        </td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.obp) : "—"}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.ops) : "—"}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.hr}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.rbi}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pitching Leaderboard */}
            {playerPitchingStats.length > 0 && (
              <Card title="Pitching Leaderboard">
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 text-xs font-bold uppercase tracking-wide text-gray-400">
                        <th className="pb-3 pr-2 w-5 text-left">#</th>
                        <th className="pb-3 pr-4 text-left">Player</th>
                        <th className="pb-3 px-2 text-center">G</th>
                        <th className="pb-3 px-2 text-center">IP</th>
                        <th className="pb-3 px-2 text-center text-green-700">ERA</th>
                        <th className="pb-3 px-2 text-center">WHIP</th>
                        <th className="pb-3 px-2 text-center">SO</th>
                        <th className="pb-3 px-2 text-center">BB</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {playerPitchingStats.map(({ player, metrics }, i) => (
                        <tr key={player.id}>
                          <td className="py-3 pr-2 text-xs text-gray-300">{i + 1}</td>
                          <td className="py-3 pr-4">
                            <span className="font-semibold text-gray-900">
                              {player.jerseyNumber != null && (
                                <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
                              )}
                              {player.name}
                            </span>
                            <span className="ml-1.5 text-xs text-gray-400">{player.position}</span>
                          </td>
                          <td className="px-2 py-3 text-center text-gray-500">{metrics.games}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{fmtIp(metrics.outs)}</td>
                          <td className="px-2 py-3 text-center font-bold text-green-900">
                            {metrics.outs > 0 ? metrics.era.toFixed(2) : "—"}
                          </td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.outs > 0 ? metrics.whip.toFixed(2) : "—"}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.so}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.bb}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>

          {/* ── Right column: Game Results ── */}
          <div className="shrink-0 lg:w-64 xl:w-72">
            <div className="sticky top-4 rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-gray-900">Game Results</h2>
              <p className="mt-0.5 text-xs text-gray-400">{uniqueGames.length} games this season</p>
              {uniqueGames.length === 0 ? (
                <p className="mt-4 text-sm text-gray-400">No games recorded yet.</p>
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

/* ── Sub-components ── */

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

function StatTile({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  if (accent) {
    return (
      <div className="rounded-xl bg-green-800 p-3 text-center text-white">
        <p className="text-xs font-bold uppercase tracking-widest text-green-300">{label}</p>
        <p className="mt-1.5 text-xl font-extrabold">{value}</p>
      </div>
    )
  }
  return (
    <div className="rounded-xl bg-[#f7f8f3] p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold text-green-950">{value}</p>
    </div>
  )
}

function GameResultRow({ meta }: { meta: DraftGameMeta }) {
  const badge: Record<string, string> = {
    W: "bg-green-100 text-green-800",
    L: "bg-red-50 text-red-600",
    T: "bg-gray-100 text-gray-500",
  }
  const colorClass = meta.result ? (badge[meta.result] ?? "bg-gray-100 text-gray-400") : "bg-gray-100 text-gray-300"
  const hasScore = meta.teamScore != null && meta.opponentScore != null

  return (
    <div className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${colorClass}`}>
        {meta.result || "—"}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-gray-800">vs {meta.opponent || "—"}</p>
        <p className="text-xs text-gray-400">{meta.date}</p>
      </div>
      {hasScore && (
        <p className="shrink-0 font-mono text-sm font-bold text-gray-700">
          {meta.teamScore}–{meta.opponentScore}
        </p>
      )}
    </div>
  )
}
