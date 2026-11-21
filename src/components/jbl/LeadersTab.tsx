import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getJblStats, jblTeamSlug, type JblSeasonStats } from "../../api/jbl"
import { teamBadge, teamColors } from "./teamTheme"

export type Entry = { name: string; team: string; value: string; sort: number }
export type Board = { key: string; label: string; entries: Entry[] }

const fmtAvg = (n: number) => n.toFixed(3).replace(/^0/, "")
const fmtIp = (outs: number) => `${Math.floor(outs / 3)}.${outs % 3}`

export function leaderBoards(stats: JblSeasonStats): { batting: Board[]; pitching: Board[] } {
  const qb = stats.batters.filter((b) => b.ab + b.bb >= stats.qualifying.pa)
  const qp = stats.pitchers.filter((p) => p.outs >= stats.qualifying.outs)
  const top = (list: Entry[], dir: 1 | -1 = 1) =>
    [...list].sort((a, b) => dir * (b.sort - a.sort) || a.name.localeCompare(b.name)).slice(0, 5)

  const bat = (key: string, label: string, pool: typeof stats.batters, f: (b: (typeof stats.batters)[number]) => number, show: (n: number) => string): Board => ({
    key, label,
    entries: top(pool.map((b) => ({ name: b.name, team: b.team, sort: f(b), value: show(f(b)) }))),
  })
  const pit = (key: string, label: string, pool: typeof stats.pitchers, f: (p: (typeof stats.pitchers)[number]) => number, show: (n: number) => string, dir: 1 | -1 = 1): Board => ({
    key, label,
    entries: top(pool.map((p) => ({ name: p.name, team: p.team, sort: f(p), value: show(f(p)) })), dir),
  })
  const int = (n: number) => String(n)
  const obp = (b: (typeof stats.batters)[number]) => (b.ab + b.bb > 0 ? (b.h + b.bb) / (b.ab + b.bb) : 0)

  return {
    batting: [
      bat("hr", "Home runs", stats.batters, (b) => b.hr, int),
      bat("avg", "Batting average", qb, (b) => (b.ab ? b.h / b.ab : 0), fmtAvg),
      bat("rbi", "RBI", stats.batters, (b) => b.rbi, int),
      bat("h", "Hits", stats.batters, (b) => b.h, int),
      bat("r", "Runs", stats.batters, (b) => b.r, int),
      bat("obp", "On-base %", qb, obp, fmtAvg),
    ],
    pitching: [
      pit("era", "ERA", qp, (p) => (p.outs ? (p.er * 27) / p.outs : 99), (n) => n.toFixed(2), -1),
      pit("so", "Strikeouts", stats.pitchers, (p) => p.so, int),
      pit("w", "Wins", stats.pitchers, (p) => p.w, int),
      pit("sv", "Saves", stats.pitchers, (p) => p.sv, int),
      pit("whip", "WHIP", qp, (p) => (p.outs ? ((p.h + p.bb) * 3) / p.outs : 99), (n) => n.toFixed(2), -1),
      pit("ip", "Innings pitched", stats.pitchers, (p) => p.outs, (n) => fmtIp(n)),
    ],
  }
}

function LeaderCard({ board }: { board: Board }) {
  const [first, ...rest] = board.entries
  if (!first) return null
  const color = teamColors(first.team).primary
  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 pt-3 text-[10px] font-black uppercase tracking-widest text-green-900">{board.label}</div>
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderLeft: `4px solid ${color}` }}>
        {teamBadge(first.team, "xl")}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-black text-gray-900">{first.name}</div>
          <Link to={`/jbl/teams/${jblTeamSlug(first.team)}`} className="truncate text-xs text-gray-500 hover:underline">
            {first.team}
          </Link>
        </div>
        <div className="text-3xl font-black tabular-nums text-gray-900">{first.value}</div>
      </div>
      <ul className="border-t border-gray-100">
        {rest.map((entry, index) => (
          <li key={`${entry.team}:${entry.name}`} className="flex items-center gap-2 px-4 py-1.5 text-xs">
            <span className="w-4 text-gray-400">{index + 2}</span>
            <span className="min-w-0 flex-1 truncate font-semibold text-gray-700">
              {entry.name} <span className="font-normal text-gray-400">· {entry.team}</span>
            </span>
            <span className="font-mono tabular-nums text-gray-600">{entry.value}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function LeadersTab() {
  const [stats, setStats] = useState<JblSeasonStats | null | undefined>(undefined)

  useEffect(() => {
    getJblStats().then(setStats).catch(() => setStats(null))
  }, [])

  const data = useMemo(() => (stats ? leaderBoards(stats) : null), [stats])

  if (stats === undefined) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (!stats || !data) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">League leaders are not available yet.</div>
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">{stats.season} JBL League Leaders</h2>
        <p className="mt-1 text-xs text-gray-500">
          Through {stats.throughDate} · {stats.gamesPlayed} games. Rate stats need {stats.qualifying.pa} plate appearances
          (batting) or {Math.floor(stats.qualifying.outs / 3)} innings (pitching).
        </p>
      </div>
      {([["Batting", data.batting], ["Pitching", data.pitching]] as const).map(([title, list]) => (
        <section key={title} className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{title}</h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((board) => (
              <LeaderCard key={board.key} board={board} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
