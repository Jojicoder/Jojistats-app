import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { getJblData, getJblVisibleGames } from "../../api/jbl"
import { battingFromGames, pitchingFromGames } from "./stats"
import { teamBadge } from "./teamTheme"
import type { SimBatter, SimPitcher, SimPlayerMode } from "./types"

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
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{p.avg.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.obp.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.slg.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-green-700">{p.ops.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-purple-700">{p.woba.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{p.babip.toFixed(3)}</td>
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
              const role = p.sv > 0 ? "CL" : p.gs > p.gr ? "SP" : "RP"
              const roleColor = role === "CL" ? "text-red-600" : role === "SP" ? "text-blue-700" : "text-gray-500"
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
  | { kind: "batter"; name: string; role: "Batter"; data: SimBatter }
  | { kind: "pitcher"; name: string; role: "SP" | "RP" | "CL"; data: SimPitcher }

function pitcherRole(p: SimPitcher): "SP" | "RP" | "CL" {
  return p.sv > 0 ? "CL" : p.gs > p.gr ? "SP" : "RP"
}

function StatTile({ label, value, desc }: { label: string; value: string; desc?: string }) {
  return (
    <div className="min-w-0 rounded-xl bg-[#f7f8f3] p-3 sm:p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      {desc && <p className="mt-0.5 text-xs text-gray-400">{desc}</p>}
      <p className="mt-2 break-words text-xl font-extrabold text-gray-900 sm:text-2xl">{value}</p>
    </div>
  )
}

function RosterSidebar({
  entries,
  selectedName,
  onSelect,
}: {
  entries: RosterEntry[]
  selectedName: string | null
  onSelect: (name: string) => void
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      <h2 className="text-sm font-bold text-gray-900">Team Roster</h2>
      <p className="mt-0.5 text-xs text-gray-400">{entries.length} players</p>
      <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto">
        {entries.map((entry) => (
          <button
            key={`${entry.kind}-${entry.name}`}
            type="button"
            onClick={() => onSelect(entry.name)}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition ${
              selectedName === entry.name ? "bg-green-900 text-white shadow-sm" : "hover:bg-[#f7f8f3]"
            }`}
          >
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
              selectedName === entry.name
                ? "bg-white/20 text-white"
                : entry.kind === "batter" ? "border border-green-200 bg-green-50 text-green-900" : "border border-blue-200 bg-blue-50 text-blue-900"
            }`}>
              {entry.role === "Batter" ? "B" : entry.role}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{entry.name}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function PlayerDetail({ teamName, entry }: { teamName: string; entry: RosterEntry }) {
  if (entry.kind === "batter") {
    const p = entry.data
    return (
      <div className="space-y-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex items-center gap-3">
            {teamBadge(teamName, "lg")}
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">{teamName}</p>
              <h1 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">{p.name}</h1>
              <p className="mt-0.5 text-sm text-gray-400">Batter</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatTile label="Plate Appearances" value={String(p.pa)} />
            <StatTile label="Home Runs" value={String(p.hr)} />
          </div>
        </div>
        <section className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">Batting Stats</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="AVG" value={p.avg.toFixed(3)} />
            <StatTile label="OBP" value={p.obp.toFixed(3)} />
            <StatTile label="SLG" value={p.slg.toFixed(3)} />
            <StatTile label="OPS" value={p.ops.toFixed(3)} />
            <StatTile label="wOBA" value={p.woba.toFixed(3)} />
            <StatTile label="BABIP" value={p.babip.toFixed(3)} />
            <StatTile label="K%" value={`${p.kPct.toFixed(1)}%`} />
            <StatTile label="BB%" value={`${p.bbPct.toFixed(1)}%`} />
            <StatTile label="RBI" value={String(p.rbi)} />
            <StatTile label="SB" value={String(p.sb)} />
          </div>
        </section>
      </div>
    )
  }

  const p = entry.data
  const role = pitcherRole(p)
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-3">
          {teamBadge(teamName, "lg")}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">{teamName}</p>
            <h1 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">{p.name}</h1>
            <p className="mt-0.5 text-sm text-gray-400">{role}</p>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <StatTile label="Innings Pitched" value={p.ip.toFixed(1)} />
          <StatTile label="Wins" value={String(p.w)} />
        </div>
      </div>
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">Pitching Stats</p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="ERA" value={p.era.toFixed(2)} />
          <StatTile label="FIP" value={p.fip.toFixed(2)} />
          <StatTile label="WHIP" value={p.whip.toFixed(2)} />
          <StatTile label="K/9" value={p.k9.toFixed(1)} />
          <StatTile label="BB/9" value={p.bb9.toFixed(1)} />
          <StatTile label="K%" value={`${p.kPct.toFixed(1)}%`} />
          <StatTile label="BB%" value={`${p.bbPct.toFixed(1)}%`} />
          <StatTile label="SV" value={String(p.sv)} />
        </div>
      </section>
    </div>
  )
}

function TeamRosterExplorer({ teamName, batters, pitchers }: { teamName: string; batters: SimBatter[]; pitchers: SimPitcher[] }) {
  const [searchParams, setSearchParams] = useSearchParams()

  const entries = useMemo<RosterEntry[]>(() => {
    const batterEntries: RosterEntry[] = batters.map((data) => ({ kind: "batter", name: data.name, role: "Batter", data }))
    const pitcherEntries: RosterEntry[] = pitchers.map((data) => ({ kind: "pitcher", name: data.name, role: pitcherRole(data), data }))
    return [...batterEntries, ...pitcherEntries].sort((a, b) => a.name.localeCompare(b.name))
  }, [batters, pitchers])

  const requestedPlayer = searchParams.get("player")
  const selected = entries.find((entry) => entry.name === requestedPlayer) ?? entries[0] ?? null

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
        <RosterSidebar entries={entries} selectedName={selected?.name ?? null} onSelect={handleSelect} />
      </div>
      <div className="min-w-0 flex-1">
        {selected ? (
          <PlayerDetail teamName={teamName} entry={selected} />
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
    return <TeamRosterExplorer teamName={selectedTeamName} batters={filteredBatters} pitchers={filteredPitchers} />
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
