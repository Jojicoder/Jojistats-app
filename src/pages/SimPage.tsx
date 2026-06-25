import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"

// ── Types ──────────────────────────────────────────────────────────────────

type SimTeam = {
  name: string
  wins: number
  losses: number
  pct: number
  rsPerGame: number
  raPerGame: number
}

type SimBatter = {
  name: string
  team: string
  pa: number
  avg: number
  obp: number
  slg: number
  ops: number
  woba: number
  kPct: number
  bbPct: number
  babip: number
  rbi: number
  hr: number
  sb: number
}

type SimPitcher = {
  name: string
  team: string
  gs: number
  gr: number
  ip: number
  w: number
  era: number
  whip: number
  k9: number
  bb9: number
  kPct: number
  bbPct: number
  fip: number
  sv: number
}

type LeagueAvg = {
  kPct: number
  bbPct: number
  avg: number
  babip: number
  era: number
}

type SimStats = {
  seasons: number
  teams: SimTeam[]
  battingLeaders: SimBatter[]
  pitchingLeaders: SimPitcher[]
  leagueAvg: LeagueAvg
}

type SimView = "standings" | "batting" | "pitching"

// ── Team color map ─────────────────────────────────────────────────────────

const TEAM_COLORS: Record<string, { badge: string }> = {
  "Brooklyn Hammers":       { badge: "#3b82f6" },
  "Fishtown Ferals":        { badge: "#22c55e" },
  "Bronx Wolves":           { badge: "#ef4444" },
  "Newark Knights":         { badge: "#6366f1" },
  "Kensington Iron":        { badge: "#f59e0b" },
  "Manayunk Runners":       { badge: "#4ade80" },
  "Germantown Colonials":   { badge: "#a855f7" },
  "Queens Titans":          { badge: "#86efac" },
  "Harlem Eagles":          { badge: "#fb923c" },
  "Fairmount Rams":         { badge: "#818cf8" },
  "South Philly Stallions": { badge: "#94a3b8" },
  "Staten Island Foxes":    { badge: "#f97316" },
}

function teamBadge(name: string) {
  const color = TEAM_COLORS[name]
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold"
      style={{ backgroundColor: color?.badge ?? "#6b7280", color: "#fff" }}
    >
      {name.split(" ")[0].slice(0, 3).toUpperCase()}
    </span>
  )
}

// ── League Avg Bar ─────────────────────────────────────────────────────────

function LeagueAvgBar({ lg }: { lg: LeagueAvg }) {
  return (
    <div className="mb-4 flex flex-wrap gap-3 rounded-xl bg-white px-4 py-3 shadow-sm text-xs">
      <span className="font-bold uppercase tracking-widest text-gray-400 mr-1">JBL Avg</span>
      <span className="text-gray-600">AVG <span className="font-mono font-semibold text-gray-800">{lg.avg.toFixed(3)}</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">BABIP <span className="font-mono font-semibold text-gray-800">{lg.babip.toFixed(3)}</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">K% <span className="font-mono font-semibold text-gray-800">{lg.kPct.toFixed(1)}%</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">BB% <span className="font-mono font-semibold text-gray-800">{lg.bbPct.toFixed(1)}%</span></span>
      <span className="text-gray-300">|</span>
      <span className="text-gray-600">ERA <span className="font-mono font-semibold text-gray-800">{lg.era.toFixed(2)}</span></span>
    </div>
  )
}

// ── Standings ──────────────────────────────────────────────────────────────

function StandingsView({ teams }: { teams: SimTeam[] }) {
  const sorted = [...teams].sort((a, b) => b.pct - a.pct)
  const leader = sorted[0]

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
          Joji Baseball League — All 12 Teams
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-4 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Team</th>
              <th className="py-2 px-3 text-right">W</th>
              <th className="py-2 px-3 text-right">L</th>
              <th className="py-2 px-3 text-right">PCT</th>
              <th className="py-2 px-3 text-right">GB</th>
              <th className="py-2 px-3 text-right">RS/G</th>
              <th className="py-2 px-4 text-right">RA/G</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((team, i) => {
              const gb = i === 0 ? "—" : ((leader.wins - team.wins) / 2).toFixed(1)
              const color = TEAM_COLORS[team.name]
              return (
                <tr key={team.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color?.badge ?? "#6b7280" }} />
                      <span className="font-semibold text-gray-800">{team.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">{team.wins.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{team.losses.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold text-blue-700">{team.pct.toFixed(3)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-400">{gb}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-700">{team.rsPerGame.toFixed(2)}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-red-600">{team.raPerGame.toFixed(2)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
              <th className="py-2 px-3 text-right">HR/162</th>
              <th className="py-2 px-3 text-right">RBI/162</th>
              <th className="py-2 px-4 text-right">SB/162</th>
            </tr>
          </thead>
          <tbody>
            {batters.map((p, i) => {
              const gamesEquiv = p.pa / 4.3
              const hrPer162  = (p.hr  / gamesEquiv * 162).toFixed(0)
              const rbiPer162 = (p.rbi / gamesEquiv * 162).toFixed(0)
              const sbPer162  = (p.sb  / gamesEquiv * 162).toFixed(0)
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
                  <td className="py-2.5 px-3 text-right font-mono text-red-600">{hrPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-600">{rbiPer162}</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{sbPer162}</td>
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
              <th className="py-2 px-3 text-right">W/162</th>
              <th className="py-2 px-3 text-right">IP/162</th>
              <th className="py-2 px-3 text-right">ERA</th>
              <th className="py-2 px-3 text-right">FIP</th>
              <th className="py-2 px-3 text-right">WHIP</th>
              <th className="py-2 px-3 text-right">K/9</th>
              <th className="py-2 px-3 text-right">BB/9</th>
              <th className="py-2 px-3 text-right">K%</th>
              <th className="py-2 px-3 text-right">BB%</th>
              <th className="py-2 px-4 text-right">SV/162</th>
            </tr>
          </thead>
          <tbody>
            {pitchers.map((p, i) => {
              const totalGames = p.gs + p.gr
              const gamesEquiv = totalGames > 0 ? totalGames : 1
              const wPer162   = (p.w  / gamesEquiv * 162).toFixed(0)
              const ipPer162  = (p.ip / gamesEquiv * 162).toFixed(1)
              const svPer162  = (p.sv / gamesEquiv * 162).toFixed(0)
              const role = p.sv > 0 ? "CL" : p.gs > p.gr ? "SP" : "RP"
              const roleColor = role === "CL" ? "text-red-600" : role === "SP" ? "text-blue-700" : "text-gray-500"
              return (
                <tr key={p.name} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="py-2.5 pl-4 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2 font-semibold text-gray-800 whitespace-nowrap">{p.name}</td>
                  <td className="py-2.5 px-2">{teamBadge(p.team)}</td>
                  <td className={`py-2.5 px-3 text-right font-bold text-xs ${roleColor}`}>{role}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{wPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{ipPer162}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-blue-700">{p.era.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-600">{p.fip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-700">{p.whip.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-700">{p.k9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-500">{p.bb9.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-green-600">{p.kPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-400">{p.bbPct.toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right font-mono text-amber-600">{svPer162}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SimPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view") as SimView | null
  const [activeView, setActiveView] = useState<SimView>(
    requestedView === "batting" || requestedView === "pitching" ? requestedView : "standings"
  )
  const [stats, setStats] = useState<SimStats | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/sim-stats.json")
      .then((r) => r.json())
      .then(setStats)
      .catch(() => setError("Failed to load sim stats."))
  }, [])

  const handleChangeView = (view: string) => {
    const next = view as SimView
    setActiveView(next)
    setSearchParams({ view: next })
  }

  return (
    <PageShell
      activeView={activeView}
      onChangeView={handleChangeView}
      headerProps={{
        teamName: "Joji Baseball Engine",
        teams: [],
        onChangeTeam: () => {},
        placeholder: "",
      }}
      tabs={[
        { label: "Standings", view: "standings" },
        { label: "Batting", view: "batting" },
        { label: "Pitching", view: "pitching" },
        { label: "Back to Stats", href: "/stats" },
      ]}
    >
      {error && (
        <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>
      )}

      {!stats && !error && (
        <div className="p-4 text-sm text-gray-500">Loading...</div>
      )}

      {stats && (
        <>
          <div className="mb-3 text-xs text-gray-400">
            {stats.seasons}-season simulation average · {stats.teams.length} teams · 96-game schedule
          </div>

          {stats.leagueAvg && <LeagueAvgBar lg={stats.leagueAvg} />}

          {activeView === "standings" && <StandingsView teams={stats.teams} />}
          {activeView === "batting"   && <BattingView   batters={stats.battingLeaders} />}
          {activeView === "pitching"  && <PitchingView  pitchers={stats.pitchingLeaders} />}
        </>
      )}
    </PageShell>
  )
}
