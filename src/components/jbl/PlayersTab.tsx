import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getJblData, getJblVisibleGames } from "../../api/jbl"
import {
  battingFromGames, battingHandFor, battingRawGameLog,
  fmtAvg, pitchingFromGames, pitchingHandFor, pitchingRawGameLog,
} from "./stats"
import { teamBadge } from "./teamTheme"
import JBLTrendChart from "./JBLTrendChart"
import JBLGameLog from "./JBLGameLog"
import { getStatColor } from "../mlb/playerStats"
import type { ChartMetric } from "./JBLTrendChartUtils"
import type { PitchingRoleKey } from "../../config/leagueConfig"
import type { JblGameJson } from "../../sim/jblJsonTypes"
import type { PitcherRoleAbbr, SimBatter, SimPitcher, SimPlayerMode } from "./types"

// ── Batting ────────────────────────────────────────────────────────────────

export function BattingView({ batters }: { batters: SimBatter[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Batting Leaders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Player</th>
              <th className="py-2 px-2 text-left">Tm</th>
              <th className="py-2 px-3 text-right">AVG</th>
              <th className="py-2 px-3 text-right">OBP</th>
              <th className="py-2 px-3 text-right">SLG</th>
              <th className="py-2 px-3 text-right">OPS</th>
              <th className="py-2 px-3 text-right">wOBA</th>
              <th className="py-2 px-3 text-right">BABIP</th>
              <th className="py-2 px-3 text-right">K%</th>
              <th className="py-2 px-3 text-right">BB%</th>
              <th className="py-2 px-3 text-right">HR</th>
              <th className="py-2 px-3 text-right">RBI</th>
              <th className="py-2 px-4 text-right">SB</th>
            </tr>
          </thead>
          <tbody>
            {batters.map((p, i) => {
              return (
                <tr key={`${p.team}-${p.name}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-2">{teamBadge(p.team)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{fmtAvg(p.avg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{fmtAvg(p.obp)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{fmtAvg(p.slg)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-green-700">{fmtAvg(p.ops)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-700">{fmtAvg(p.woba)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{fmtAvg(p.babip)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-500">{p.kPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-600">{p.bbPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-600">{p.hr}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-600">{p.rbi}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{p.sb}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Pitching ───────────────────────────────────────────────────────────────

export function PitchingView({ pitchers }: { pitchers: SimPitcher[] }) {
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">Pitching Leaders</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Player</th>
              <th className="py-2 px-2 text-left">Tm</th>
              <th className="py-2 px-3 text-right">Role</th>
              <th className="py-2 px-3 text-right">W</th>
              <th className="py-2 px-3 text-right">IP</th>
              <th className="py-2 px-3 text-right">ERA</th>
              <th className="py-2 px-3 text-right">FIP</th>
              <th className="py-2 px-3 text-right">WHIP</th>
              <th className="py-2 px-3 text-right">K/9</th>
              <th className="py-2 px-3 text-right">BB/9</th>
              <th className="py-2 px-3 text-right">K%</th>
              <th className="py-2 px-3 text-right">BB%</th>
              <th className="py-2 px-4 text-right">SV</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p, i) => {
              const role = p.role
              const roleColor = role === "CL" ? "text-red-600" : role === "SP" ? "text-blue-700" : role === "SU" ? "text-amber-600" : "text-gray-500"
              return (
                <tr key={`${p.team}-${p.name}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-2">{teamBadge(p.team)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold text-xs ${roleColor}`}>{role}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.w}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.ip.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{p.era.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600">{p.fip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.whip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-700">{p.k9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-500">{p.bb9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-600">{p.kPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-400">{p.bbPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{p.sv}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Roster sidebar + player detail (shown once a team is selected) ─────────

type RosterEntry =
  | { kind: "batter"; name: string; role: string; data: SimBatter }
  | { kind: "pitcher"; name: string; role: PitcherRoleAbbr; data: SimPitcher }

function pitcherRole(p: SimPitcher): PitcherRoleAbbr {
  return p.role
}

function StatTile({
  label,
  value,
  desc,
  pitchingRole,
}: {
  label: string
  value: string
  desc?: string
  pitchingRole?: PitchingRoleKey | null
}) {
  const color = getStatColor(label, value, "jbl", pitchingRole)
  return (
    <div className={`min-w-0 rounded-xl p-3 sm:p-4 ${color.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{label}</p>
      {desc && <p className="mt-0.5 text-xs text-gray-400">{desc}</p>}
      <p className={`mt-2 break-words text-xl font-extrabold sm:text-2xl ${color.val}`}>{value}</p>
    </div>
  )
}

type RosterSort = "az" | "pos" | "num"

function RosterSidebar({
  entries,
  selectedName,
  rosterSort,
  onSortChange,
  onSelect,
}: {
  entries: RosterEntry[]
  selectedName: string | null
  rosterSort: RosterSort
  onSortChange: (sort: RosterSort) => void
  onSelect: (name: string) => void
}) {
  const sortedEntries = useMemo(() => {
    const copy = [...entries]
    if (rosterSort === "pos") {
      return copy.sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name))
    }
    if (rosterSort === "num") {
      return copy.sort((a, b) => (a.data.jerseyNumber ?? 999) - (b.data.jerseyNumber ?? 999))
    }
    return copy.sort((a, b) => a.name.localeCompare(b.name))
  }, [entries, rosterSort])

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">Team Roster</h2>
      <p className="mt-0.5 text-xs text-gray-400">{entries.length} players</p>
      <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">Sort by</p>
      <select
        value={rosterSort}
        onChange={(e) => onSortChange(e.target.value as RosterSort)}
        className="mt-1 mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm"
      >
        <option value="az">Name (A–Z)</option>
        <option value="pos">Position</option>
        <option value="num">Jersey Number</option>
      </select>
      <div className="max-h-[65vh] space-y-2 overflow-y-auto">
        {sortedEntries.map((entry) => {
          const isSelected = selectedName === entry.name
          return (
            <button
              key={`${entry.kind}-${entry.name}`}
              type="button"
              onClick={() => onSelect(entry.name)}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                isSelected ? "bg-green-900" : "bg-[#f7f8f3] hover:bg-[#eef0e9]"
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                isSelected ? "bg-green-700 text-white" : "border-2 border-green-700 bg-white text-green-800"
              }`}>
                {entry.data.jerseyNumber ?? "—"}
              </span>
              <span className="min-w-0">
                <span className={`block truncate text-sm font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                  {entry.name}
                </span>
                <span className={`text-xs ${isSelected ? "text-green-300" : "text-gray-400"}`}>
                  {entry.role}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function DefaultAvatar({ className }: { className: string }) {
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-gray-400 ${className}`}>
      <svg viewBox="0 0 24 24" fill="currentColor" className="h-3/5 w-3/5">
        <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5Zm0 2c-3.33 0-10 1.67-10 5v3h20v-3c0-3.33-6.67-5-10-5Z" />
      </svg>
    </span>
  )
}

function PlayerDetail({
  teamName,
  entry,
  battingData,
  pitchingData,
  games,
  teamAvgHitting,
  teamAvgEra,
}: {
  teamName: string
  entry: RosterEntry
  battingData?: SimBatter
  pitchingData?: SimPitcher
  games: JblGameJson[]
  teamAvgHitting: Record<ChartMetric, number>
  teamAvgEra: number
}) {
  const canToggle = Boolean(battingData && pitchingData)
  const [statsMode, setStatsMode] = useState<"hitting" | "pitching">(entry.kind === "batter" ? "hitting" : "pitching")

  useEffect(() => {
    setStatsMode(entry.kind === "batter" ? "hitting" : "pitching")
  }, [entry.name, entry.kind])

  const jerseyNumber = battingData?.jerseyNumber ?? pitchingData?.jerseyNumber ?? null
  const positionLabel = statsMode === "hitting"
    ? (battingData?.position || "Batter")
    : pitchingData ? pitcherRole(pitchingData) : ""

  const handLabel = useMemo(() => {
    if (statsMode === "hitting") {
      const hand = battingHandFor(games, teamName, entry.name)
      return hand ? `Bats ${hand === "L" ? "Left" : "Right"}` : null
    }
    const hand = pitchingHandFor(games, teamName, entry.name)
    return hand ? `Throws ${hand === "L" ? "Left" : "Right"}` : null
  }, [games, teamName, entry.name, statsMode])

  const header = (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-1.5">
          {teamBadge(teamName, "xl")}
          <DefaultAvatar className="h-14 w-14 sm:h-16 sm:w-16" />
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">{teamName}</p>
            <h1 className="mt-1 truncate text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
              {jerseyNumber && <span className="mr-1 text-gray-400">#{jerseyNumber}</span>}
              {entry.name}
            </h1>
            <p className="mt-0.5 text-sm text-gray-400">
              {positionLabel}
              {handLabel && <span className="ml-2">· {handLabel}</span>}
            </p>
          </div>
        </div>
        {canToggle && (
          <div className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 sm:inline-flex sm:w-auto sm:shrink-0">
            {(["hitting", "pitching"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setStatsMode(m)}
                className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                  statsMode === m ? "bg-green-900 text-white shadow-sm" : "text-gray-600 hover:text-green-900"
                }`}
              >
                {m === "hitting" ? "Batting" : "Pitching"}
              </button>
            ))}
          </div>
        )}
      </div>

      {statsMode === "hitting" && battingData && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Games Played" value={String(battingData.games)} />
          <StatTile label="At Bats" value={String(battingData.ab)} />
        </div>
      )}
      {statsMode === "pitching" && pitchingData && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Games Played" value={String(pitchingData.gr)} />
          <StatTile label="Innings Pitched" value={pitchingData.ip.toFixed(1)} />
        </div>
      )}
    </div>
  )

  if (statsMode === "hitting" && battingData) {
    const p = battingData
    const log = battingRawGameLog(games, teamName, p.name)
    return (
      <div className="space-y-4">
        {header}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">Batting Stats</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="AVG" value={fmtAvg(p.avg)} />
            <StatTile label="OBP" value={fmtAvg(p.obp)} />
            <StatTile label="SLG" value={fmtAvg(p.slg)} />
            <StatTile label="OPS" value={fmtAvg(p.ops)} />
            <StatTile label="wOBA" value={fmtAvg(p.woba)} />
            <StatTile label="BABIP" value={fmtAvg(p.babip)} />
            <StatTile label="K%" value={`${p.kPct.toFixed(1)}%`} />
            <StatTile label="BB%" value={`${p.bbPct.toFixed(1)}%`} />
            <StatTile label="RBI" value={String(p.rbi)} />
            <StatTile label="SB" value={String(p.sb)} />
          </div>
        </section>
        <JBLTrendChart mode="hitting" log={log} teamAverage={teamAvgHitting} />
        <JBLGameLog mode="hitting" log={log} />
      </div>
    )
  }

  if (pitchingData) {
    const p = pitchingData
    const role = pitcherRole(p)
    const pitchingRole: PitchingRoleKey = role === "SP" ? "starter" : role === "CL" ? "closer" : "reliever"
    const log = pitchingRawGameLog(games, teamName, p.name)
    return (
      <div className="space-y-4">
        {header}
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">Pitching Stats</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="ERA" value={p.era.toFixed(2)} pitchingRole={pitchingRole} />
            <StatTile label="FIP" value={p.fip.toFixed(2)} pitchingRole={pitchingRole} />
            <StatTile label="WHIP" value={p.whip.toFixed(2)} pitchingRole={pitchingRole} />
            <StatTile label="K/9" value={p.k9.toFixed(1)} pitchingRole={pitchingRole} />
            <StatTile label="BB/9" value={p.bb9.toFixed(1)} pitchingRole={pitchingRole} />
            <StatTile label="K%" value={`${p.kPct.toFixed(1)}%`} />
            <StatTile label="BB%" value={`${p.bbPct.toFixed(1)}%`} />
            <StatTile label="SV" value={String(p.sv)} />
          </div>
        </section>
        <JBLTrendChart mode="pitching" log={log} teamAverage={teamAvgEra} role={role} />
        <JBLGameLog mode="pitching" log={log} />
      </div>
    )
  }

  return header
}

function TeamRosterExplorer({
  teamName,
  batters,
  pitchers,
  games,
}: {
  teamName: string
  batters: SimBatter[]
  pitchers: SimPitcher[]
  games: JblGameJson[]
}) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [rosterSort, setRosterSort] = useState<RosterSort>("az")

  const entries = useMemo<RosterEntry[]>(() => {
    const batterEntries: RosterEntry[] = batters.map((data) => ({ kind: "batter", name: data.name, role: data.position || "B", data }))
    const pitcherEntries: RosterEntry[] = pitchers.map((data) => ({ kind: "pitcher", name: data.name, role: pitcherRole(data), data }))
    return [...batterEntries, ...pitcherEntries].sort((a, b) => a.name.localeCompare(b.name))
  }, [batters, pitchers])

  const requestedPlayer = searchParams.get("player")
  const selected = entries.find((entry) => entry.name === requestedPlayer) ?? entries[0] ?? null

  const teamAvgHitting = useMemo<Record<ChartMetric, number>>(() => {
    const totalPa = batters.reduce((sum, b) => sum + b.pa, 0)
    if (totalPa <= 0) return { avg: 0, obp: 0, ops: 0 }
    return {
      avg: batters.reduce((sum, b) => sum + b.avg * b.pa, 0) / totalPa,
      obp: batters.reduce((sum, b) => sum + b.obp * b.pa, 0) / totalPa,
      ops: batters.reduce((sum, b) => sum + b.ops * b.pa, 0) / totalPa,
    }
  }, [batters])

  const teamAvgEra = useMemo(() => {
    const totalIp = pitchers.reduce((sum, p) => sum + p.ip, 0)
    if (totalIp <= 0) return 0
    return pitchers.reduce((sum, p) => sum + p.era * p.ip, 0) / totalIp
  }, [pitchers])

  const handleSelect = (name: string) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      next.set("player", name)
      return next
    })
  }

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="w-full lg:w-72 lg:shrink-0">
        <RosterSidebar
          entries={entries}
          selectedName={selected?.name ?? null}
          rosterSort={rosterSort}
          onSortChange={setRosterSort}
          onSelect={handleSelect}
        />
      </div>
      <div className="min-w-0 flex-1">
        {selected ? (
          <PlayerDetail
            teamName={teamName}
            entry={selected}
            battingData={batters.find((b) => b.name === selected.name)}
            pitchingData={pitchers.find((p) => p.name === selected.name)}
            games={games}
            teamAvgHitting={teamAvgHitting}
            teamAvgEra={teamAvgEra}
          />
        ) : (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">No players found for this team.</div>
        )}
      </div>
    </div>
  )
}

// ── Page entry point ─────────────────────────────────────────────────────

export default function PlayersTab({
  selectedTeamName,
}: {
  selectedTeamName?: string
}) {
  const [mode, setMode] = useState<SimPlayerMode>("batting")
  const [batters, setBatters] = useState<SimBatter[]>([])
  const [pitchers, setPitchers] = useState<SimPitcher[]>([])
  const [games, setGames] = useState<JblGameJson[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { visibleThrough } = await getJblData()
        const games = await getJblVisibleGames(visibleThrough)
        if (cancelled) return
        setBatters(battingFromGames(games))
        setPitchers(pitchingFromGames(games))
        setGames(games)
      } catch {
        if (!cancelled) setError("Failed to load JBL player stats.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredBatters = selectedTeamName ? batters.filter((p) => p.team === selectedTeamName) : batters
  const filteredPitchers = selectedTeamName ? pitchers.filter((p) => p.team === selectedTeamName) : pitchers

  if (loading) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>

  if (selectedTeamName) {
    return (
      <TeamRosterExplorer
        teamName={selectedTeamName}
        batters={filteredBatters}
        pitchers={filteredPitchers}
        games={games}
      />
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f7f8f3] p-1">
        {(["batting", "pitching"] as const).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            onClick={() => setMode(nextMode)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === nextMode ? "bg-white text-green-900 shadow-sm" : "text-gray-500 hover:bg-white hover:text-green-900"
            }`}
          >
            {nextMode === "batting" ? "Batting" : "Pitching"}
          </button>
        ))}
      </div>
      {mode === "batting" ? <BattingView batters={filteredBatters} /> : <PitchingView pitchers={filteredPitchers} />}
    </div>
  )
}
