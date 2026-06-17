import { useMemo, useState } from "react"
import type { Player, Team, SavedBattingGameEntry, SavedPitchingGameEntry, DraftGameMeta } from "../types"
import { calcBattingMetrics, calcPitchingMetrics, fmtRate, fmtIp } from "../utils/metrics"
import { getStatColor } from "./mlb/playerStats"

type Props = {
  team: Team | null
  players: Player[]
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer: Record<string, SavedPitchingGameEntry[]>
}

type BattingCol = "g" | "avg" | "obp" | "ops" | "hr" | "rbi" | "sb" | "cs" | "sbPct"
type PitchingCol = "g" | "outs" | "era" | "whip" | "so" | "bb"

const MIN_PA = 5
const MIN_OUTS = 9 // 3.0 IP

const positionOrder: Record<string, number> = {
  P: 0, C: 1, "1B": 2, "2B": 3, "3B": 4, SS: 5, LF: 6, CF: 7, RF: 8, DH: 9, UTIL: 10,
}

const battingDefaultDir: Record<BattingCol, "asc" | "desc"> = {
  g: "desc", avg: "desc", obp: "desc", ops: "desc",
  hr: "desc", rbi: "desc", sb: "desc", cs: "asc", sbPct: "desc",
}
const pitchingDefaultDir: Record<PitchingCol, "asc" | "desc"> = {
  g: "desc", outs: "desc", era: "asc", whip: "asc", so: "desc", bb: "asc",
}

type BattingMetrics = ReturnType<typeof calcBattingMetrics>
type PitchingMetrics = ReturnType<typeof calcPitchingMetrics>

function getBattingVal(m: BattingMetrics, col: BattingCol): number {
  switch (col) {
    case "g":     return m.games
    case "avg":   return m.avg
    case "obp":   return m.obp
    case "ops":   return m.ops
    case "hr":    return m.hr
    case "rbi":   return m.rbi
    case "sb":    return m.sb
    case "cs":    return m.cs
    case "sbPct": return m.sbPct ?? -1
  }
}

function getPitchingVal(m: PitchingMetrics, col: PitchingCol): number {
  switch (col) {
    case "g":    return m.games
    case "outs": return m.outs
    case "era":  return m.outs > 0 ? m.era : 999
    case "whip": return m.outs > 0 ? m.whip : 999
    case "so":   return m.so
    case "bb":   return m.bb
  }
}

function fmtStealPct(sb: number, cs: number) {
  const attempts = sb + cs
  return attempts > 0 ? fmtRate(sb / attempts) : "--"
}

export default function MyTeamPage({ team, players, savedEntriesByPlayer, pitchingEntriesByPlayer }: Props) {
  const [battingSort, setBattingSort] = useState<{ col: BattingCol; dir: "asc" | "desc" }>({ col: "avg", dir: "desc" })
  const [pitchingSort, setPitchingSort] = useState<{ col: PitchingCol; dir: "asc" | "desc" }>({ col: "era", dir: "asc" })

  const handleBattingSort = (col: BattingCol) =>
    setBattingSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: battingDefaultDir[col] }
    )

  const handlePitchingSort = (col: PitchingCol) =>
    setPitchingSort(prev =>
      prev.col === col
        ? { col, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { col, dir: pitchingDefaultDir[col] }
    )

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
    () => calcBattingMetrics(Object.values(savedEntriesByPlayer).flat()),
    [savedEntriesByPlayer]
  )

  const teamPitching = useMemo(
    () => calcPitchingMetrics(Object.values(pitchingEntriesByPlayer).flat()),
    [pitchingEntriesByPlayer]
  )

  const playerBattingStats = useMemo(() => {
    const all = [...players].map((player) => ({
      player,
      metrics: calcBattingMetrics(savedEntriesByPlayer[player.id] ?? []),
    }))
    const sortFn = (arr: typeof all) =>
      [...arr].sort((a, b) => {
        const av = getBattingVal(a.metrics, battingSort.col)
        const bv = getBattingVal(b.metrics, battingSort.col)
        return battingSort.dir === "desc" ? bv - av : av - bv
      })
    return {
      qualifying: sortFn(all.filter((s) => s.metrics.pa >= MIN_PA)),
      others: sortFn(all.filter((s) => s.metrics.pa < MIN_PA)),
    }
  }, [players, savedEntriesByPlayer, battingSort])

  const playerPitchingStats = useMemo(() => {
    const all = players
      .filter((p) => (pitchingEntriesByPlayer[p.id] ?? []).length > 0)
      .map((player) => ({
        player,
        metrics: calcPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
      }))
    const sortFn = (arr: typeof all) =>
      [...arr].sort((a, b) => {
        const av = getPitchingVal(a.metrics, pitchingSort.col)
        const bv = getPitchingVal(b.metrics, pitchingSort.col)
        return pitchingSort.dir === "desc" ? bv - av : av - bv
      })
    return {
      qualifying: sortFn(all.filter((s) => s.metrics.outs >= MIN_OUTS)),
      others: sortFn(all.filter((s) => s.metrics.outs < MIN_OUTS)),
    }
  }, [players, pitchingEntriesByPlayer, pitchingSort])

  const sortedRoster = useMemo(
    () => [...players].sort((a, b) => {
      const posDiff = (positionOrder[a.positions[0]] ?? 99) - (positionOrder[b.positions[0]] ?? 99)
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
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Team</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">{team.name}</h1>
            </div>
            <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-900">
              {team.currentSeasonYear} Season
            </span>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
            <div className="col-span-2 rounded-xl bg-green-800 p-4 text-white sm:col-span-1">
              <p className="text-xs font-bold uppercase tracking-widest text-green-300">Record</p>
              <p className="mt-2 whitespace-nowrap text-2xl font-extrabold">
                {record.w}–{record.l}{record.t > 0 ? `–${record.t}` : ""}
              </p>
              <p className="mt-0.5 text-xs text-green-400">{uniqueGames.length} games</p>
            </div>
            <div className="rounded-xl bg-[#f7f8f3] p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{uniqueGames.length}</p>
            </div>
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
                <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                  {sortedRoster.map((player) => (
                    <div key={player.id} className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-xs font-bold text-green-900">
                        {player.jerseyNumber != null ? player.jerseyNumber : "—"}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-800">{player.name}</p>
                        <p className="text-xs text-gray-400">{player.positions.join(", ")}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Team Batting */}
            <Card title="Team Batting">
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                {[
                  { label: "AVG", value: teamBatting.ab > 0 ? fmtRate(teamBatting.avg) : "—" },
                  { label: "OBP", value: teamBatting.pa > 0 ? fmtRate(teamBatting.obp) : "—" },
                  { label: "OPS", value: teamBatting.pa > 0 ? fmtRate(teamBatting.ops) : "—" },
                  { label: "HR",  value: String(teamBatting.hr) },
                  { label: "RBI", value: String(teamBatting.rbi) },
                  { label: "SB",  value: String(teamBatting.sb) },
                  { label: "SB%", value: fmtStealPct(teamBatting.sb, teamBatting.cs) },
                ].map((s) => <StatTile key={s.label} label={s.label} value={s.value} />)}
              </div>
            </Card>

            {/* Team Pitching */}
            {teamPitching.games > 0 && (
              <Card title="Team Pitching">
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                  {[
                    { label: "ERA",  value: teamPitching.outs > 0 ? teamPitching.era.toFixed(2) : "—" },
                    { label: "WHIP", value: teamPitching.outs > 0 ? teamPitching.whip.toFixed(2) : "—" },
                    { label: "IP",   value: fmtIp(teamPitching.outs) },
                    { label: "SO",   value: String(teamPitching.so) },
                    { label: "BB",   value: String(teamPitching.bb) },
                  ].map((s) => <StatTile key={s.label} label={s.label} value={s.value} />)}
                </div>
              </Card>
            )}

            {/* Batting Leaderboard */}
            <Card title="Batting Leaderboard">
              <p className="mt-1 text-xs text-gray-400">Qualifying: {MIN_PA}+ PA · Click column to sort</p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="pb-3 pr-2 w-5 text-left text-xs font-bold uppercase tracking-wide text-gray-400">#</th>
                      <th className="pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Player</th>
                      <SortTh col="g"     label="G"    sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="avg"   label="AVG"  sort={battingSort}  onSort={handleBattingSort} highlight />
                      <SortTh col="obp"   label="OBP"  sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="ops"   label="OPS"  sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="hr"    label="HR"   sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="rbi"   label="RBI"  sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="sb"    label="SB"   sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="cs"    label="CS"   sort={battingSort}  onSort={handleBattingSort} />
                      <SortTh col="sbPct" label="SB%"  sort={battingSort}  onSort={handleBattingSort} />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {playerBattingStats.qualifying.map(({ player, metrics }, i) => (
                      <tr key={player.id}>
                        <td className="py-3 pr-2 text-xs text-gray-300">{i + 1}</td>
                        <BattingPlayerCell player={player} />
                        <td className="px-2 py-3 text-center text-gray-500">{metrics.games}</td>
                        <td className="px-2 py-3 text-center font-bold text-green-900">{metrics.ab > 0 ? fmtRate(metrics.avg) : "—"}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.obp) : "—"}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.ops) : "—"}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.hr}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.rbi}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.sb}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{metrics.cs}</td>
                        <td className="px-2 py-3 text-center text-gray-600">{fmtStealPct(metrics.sb, metrics.cs)}</td>
                      </tr>
                    ))}
                    {playerBattingStats.others.length > 0 && (
                      <>
                        <tr>
                          <td colSpan={11} className="py-1.5 text-center text-[11px] text-gray-300">
                            — Below {MIN_PA} PA (non-qualifying) —
                          </td>
                        </tr>
                        {playerBattingStats.others.map(({ player, metrics }) => (
                          <tr key={player.id} className="opacity-40">
                            <td className="py-2.5 pr-2 text-xs text-gray-300">—</td>
                            <BattingPlayerCell player={player} />
                            <td className="px-2 py-2.5 text-center text-gray-500">{metrics.games}</td>
                            <td className="px-2 py-2.5 text-center font-bold text-green-900">{metrics.ab > 0 ? fmtRate(metrics.avg) : "—"}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.obp) : "—"}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.pa > 0 ? fmtRate(metrics.ops) : "—"}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.hr}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.rbi}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.sb}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{metrics.cs}</td>
                            <td className="px-2 py-2.5 text-center text-gray-600">{fmtStealPct(metrics.sb, metrics.cs)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Pitching Leaderboard */}
            {(playerPitchingStats.qualifying.length > 0 || playerPitchingStats.others.length > 0) && (
              <Card title="Pitching Leaderboard">
                <p className="mt-1 text-xs text-gray-400">Qualifying: 3.0+ IP · Click column to sort</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="pb-3 pr-2 w-5 text-left text-xs font-bold uppercase tracking-wide text-gray-400">#</th>
                        <th className="pb-3 pr-4 text-left text-xs font-bold uppercase tracking-wide text-gray-400">Player</th>
                        <SortTh col="g"    label="G"    sort={pitchingSort} onSort={handlePitchingSort} />
                        <SortTh col="outs" label="IP"   sort={pitchingSort} onSort={handlePitchingSort} />
                        <SortTh col="era"  label="ERA"  sort={pitchingSort} onSort={handlePitchingSort} highlight />
                        <SortTh col="whip" label="WHIP" sort={pitchingSort} onSort={handlePitchingSort} />
                        <SortTh col="so"   label="SO"   sort={pitchingSort} onSort={handlePitchingSort} />
                        <SortTh col="bb"   label="BB"   sort={pitchingSort} onSort={handlePitchingSort} />
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {playerPitchingStats.qualifying.map(({ player, metrics }, i) => (
                        <tr key={player.id}>
                          <td className="py-3 pr-2 text-xs text-gray-300">{i + 1}</td>
                          <BattingPlayerCell player={player} />
                          <td className="px-2 py-3 text-center text-gray-500">{metrics.games}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{fmtIp(metrics.outs)}</td>
                          <td className="px-2 py-3 text-center font-bold text-green-900">{metrics.outs > 0 ? metrics.era.toFixed(2) : "—"}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.outs > 0 ? metrics.whip.toFixed(2) : "—"}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.so}</td>
                          <td className="px-2 py-3 text-center text-gray-600">{metrics.bb}</td>
                        </tr>
                      ))}
                      {playerPitchingStats.others.length > 0 && (
                        <>
                          <tr>
                            <td colSpan={8} className="py-1.5 text-center text-[11px] text-gray-300">
                              — Below 3.0 IP (non-qualifying) —
                            </td>
                          </tr>
                          {playerPitchingStats.others.map(({ player, metrics }) => (
                            <tr key={player.id} className="opacity-40">
                              <td className="py-2.5 pr-2 text-xs text-gray-300">—</td>
                              <BattingPlayerCell player={player} />
                              <td className="px-2 py-2.5 text-center text-gray-500">{metrics.games}</td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{fmtIp(metrics.outs)}</td>
                              <td className="px-2 py-2.5 text-center font-bold text-green-900">{metrics.outs > 0 ? metrics.era.toFixed(2) : "—"}</td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{metrics.outs > 0 ? metrics.whip.toFixed(2) : "—"}</td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{metrics.so}</td>
                              <td className="px-2 py-2.5 text-center text-gray-600">{metrics.bb}</td>
                            </tr>
                          ))}
                        </>
                      )}
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
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </div>
  )
}

const NO_COLOR_LABELS = new Set(["SB", "CS"])

function StatTile({ label, value }: { label: string; value: string }) {
  const color = NO_COLOR_LABELS.has(label)
    ? { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-gray-900" }
    : getStatColor(label, value, "jaa")
  return (
    <div className={`rounded-xl p-3 text-center ${color.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{label}</p>
      <p className={`mt-1.5 text-xl font-extrabold ${color.val}`}>{value}</p>
    </div>
  )
}

function SortTh<T extends string>({
  col, label, sort, onSort, highlight = false,
}: {
  col: T
  label: string
  sort: { col: T; dir: "asc" | "desc" }
  onSort: (col: T) => void
  highlight?: boolean
}) {
  const isActive = sort.col === col
  return (
    <th
      onClick={() => onSort(col)}
      className={`cursor-pointer select-none pb-3 px-2 text-center text-xs font-bold uppercase tracking-wide transition hover:text-green-900 ${
        isActive ? "text-green-700" : highlight ? "text-green-600" : "text-gray-400"
      }`}
    >
      {label}
      <span className="ml-0.5 inline-block w-2.5 text-[10px]">
        {isActive ? (sort.dir === "desc" ? "▼" : "▲") : ""}
      </span>
    </th>
  )
}

function BattingPlayerCell({ player }: { player: Player }) {
  return (
    <td className="py-3 pr-4">
      <span className="font-semibold text-gray-900">
        {player.jerseyNumber != null && (
          <span className="mr-1.5 text-xs text-gray-400">#{player.jerseyNumber}</span>
        )}
        {player.name}
      </span>
      <span className="ml-1.5 text-xs text-gray-400">{player.positions.join(", ")}</span>
    </td>
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
