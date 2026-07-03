import { useEffect, useState } from "react"
import { getJblData, getJblVisibleGames } from "../../api/jbl"
import { battingFromGames, pitchingFromGames } from "./stats"
import { teamBadge } from "./teamTheme"
import type { SimBatter, SimPitcher, SimPlayerMode } from "./types"

// ── Batting ────────────────────────────────────────────────────────────────

function BattingView({ batters }: { batters: SimBatter[] }) {
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
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
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

function PitchingView({ pitchers }: { pitchers: SimPitcher[] }) {
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
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
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
