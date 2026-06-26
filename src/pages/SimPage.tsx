import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import StrikeZoneView, { type PitchDot, type SwingInfo } from "../components/StrikeZoneView"
import FieldView, { type BallTraj } from "../components/FieldView"

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

type SimView = "team" | "players" | "today" | "standings"
type SimPlayerMode = "batting" | "pitching"

// ── Game replay types ──────────────────────────────────────────────────────

type HalfInningEvent = {
  type: "half_inning"
  inning: number
  isTop: boolean
  score: { away: number; home: number }
}
type PitchEvent = {
  type: "pitch"
  inning: number
  isTop: boolean
  pitcher: string
  batter: string
  pitchType: string
  outcome: string
  balls: number
  strikes: number
  outs: number
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  velo?: number
  px?: number
  pz?: number
  mx?: number
  mz?: number
  batHand?: "L" | "R"
  pitchHand?: "L" | "R"
}
type PlayEvent = {
  type: "play"
  inning: number
  isTop: boolean
  batter: string
  pitcher: string
  result: string
  outs: number
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  runsScored: number
  hit?: { ev: number; la: number; sa: number; traj: BallTraj }
}
type StolenBaseEvent = {
  type: "stolen_base"
  inning: number
  isTop: boolean
  runner: string
  base: "second" | "third" | "home"
  success: boolean
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  outs: number
}
type PickoffEvent = {
  type: "pickoff"
  inning: number
  isTop: boolean
  runner: string
  base: "first" | "second" | "third"
  out: boolean
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  outs: number
}
type SubstitutionEvent = {
  type: "substitution"
  inning: number
  isTop: boolean
  subType: "pitching" | "batting" | "defensive"
  playerOut: string
  playerIn: string
  team: "away" | "home"
  score: { away: number; home: number }
  bases: { first: string | null; second: string | null; third: string | null }
  outs: number
}
type GameEvent = HalfInningEvent | PitchEvent | PlayEvent | StolenBaseEvent | PickoffEvent | SubstitutionEvent

type GameData = {
  date: string
  away: string
  home: string
  finalScore: { away: number; home: number }
  lineScore: { away: (number | null)[]; home: (number | null)[] }
  awayLineup: string[]
  homeLineup: string[]
  events: GameEvent[]
}

// ── Team color map ─────────────────────────────────────────────────────────

type TeamColors = { primary: string; secondary: string; accent: string }

const TEAM_COLORS: Record<string, TeamColors> = {
  // North Division — New York
  "Brooklyn Hammers":       { primary: "#3b82f6", secondary: "#1e3a8a", accent: "#fbbf24" },
  "Bronx Wolves":           { primary: "#ef4444", secondary: "#1f2937", accent: "#94a3b8" },
  "Queens Titans":          { primary: "#10b981", secondary: "#065f46", accent: "#ffffff" },
  "Harlem Eagles":          { primary: "#f97316", secondary: "#1c1917", accent: "#fef3c7" },
  "Staten Island Foxes":    { primary: "#eab308", secondary: "#1e3a8a", accent: "#ffffff" },
  "Newark Knights":         { primary: "#8b5cf6", secondary: "#1e1b4b", accent: "#c4b5fd" },
  // Mid Division — Philadelphia
  "Fishtown Ferals":        { primary: "#14b8a6", secondary: "#0f172a", accent: "#a3e635" },
  "Kensington Iron":        { primary: "#f59e0b", secondary: "#374151", accent: "#ffffff" },
  "Germantown Colonials":   { primary: "#a855f7", secondary: "#1e1b4b", accent: "#fbbf24" },
  "Manayunk Runners":       { primary: "#22c55e", secondary: "#14532d", accent: "#ffffff" },
  "Fairmount Rams":         { primary: "#ec4899", secondary: "#1f2937", accent: "#ffffff" },
  "South Philly Stallions": { primary: "#64748b", secondary: "#1f2937", accent: "#fbbf24" },
  // South Division — DC / MD / VA
  "Georgetown Ravens":      { primary: "#06b6d4", secondary: "#0c4a6e", accent: "#ffffff" },
  "Capitol Hill Senators":  { primary: "#be123c", secondary: "#1e3a8a", accent: "#ffffff" },
  "Anacostia Kings":        { primary: "#84cc16", secondary: "#1f2937", accent: "#fbbf24" },
  "Alexandria Cannons":     { primary: "#6366f1", secondary: "#1e1b4b", accent: "#c7d2fe" },
  "Bethesda Blaze":         { primary: "#f43f5e", secondary: "#1f2937", accent: "#fb923c" },
  "Silver Spring Ghosts":   { primary: "#94a3b8", secondary: "#1e293b", accent: "#ffffff" },
}

function teamColors(name: string): TeamColors {
  return TEAM_COLORS[name] ?? { primary: "#6b7280", secondary: "#374151", accent: "#ffffff" }
}

function readableTextColor(hex: string) {
  const value = hex.replace("#", "")
  const red = Number.parseInt(value.slice(0, 2), 16)
  const green = Number.parseInt(value.slice(2, 4), 16)
  const blue = Number.parseInt(value.slice(4, 6), 16)
  const luminance = (red * 299 + green * 587 + blue * 114) / 1000
  return luminance > 155 ? "#111827" : "#ffffff"
}

function jblThemeStyle(teamName: string): CSSProperties {
  const colors = teamColors(teamName)
  const seed = teamName.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0)
  const accentX = 18 + (seed * 17) % 64
  const accentY = 4 + (seed * 11) % 38
  const patternAngle = 118 + (seed * 13) % 44

  return {
    "--mlb-primary": colors.primary,
    "--mlb-secondary": colors.secondary,
    "--mlb-background": colors.primary,
    "--mlb-on-primary": readableTextColor(colors.primary),
    "--mlb-accent": colors.accent,
    "--mlb-accent-x": `${accentX}%`,
    "--mlb-accent-y": `${accentY}%`,
    "--mlb-pattern-angle": `${patternAngle}deg`,
  } as CSSProperties
}

function teamBadge(name: string) {
  const c = teamColors(name)
  const abbr = name.split(" ").slice(-1)[0].slice(0, 3).toUpperCase()
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black tracking-wide"
      style={{
        background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
        color: c.accent,
        border: `1px solid ${c.primary}88`,
      }}
    >
      {abbr}
    </span>
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
          JBL — All Teams
        </h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-1 pr-2 text-left w-6"></th>
              <th className="py-2 pl-3 pr-2 text-left w-8">#</th>
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
              const c = teamColors(team.name)
              return (
                <tr
                  key={team.name}
                  className="border-b border-gray-50 last:border-0 transition-colors"
                  style={{ background: i === 0 ? `${c.primary}10` : undefined }}
                >
                  {/* left stripe */}
                  <td className="py-0 pl-0 pr-0 w-1">
                    <div className="h-full w-1 min-h-[40px]" style={{ background: `linear-gradient(to bottom, ${c.primary}, ${c.secondary})` }} />
                  </td>
                  <td className="py-2.5 pl-3 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2.5 px-2">
                    <div className="flex items-center gap-2">
                      {teamBadge(team.name)}
                      <span className="font-semibold" style={{ color: c.primary }}>{team.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-gray-800">{team.wins.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono text-gray-500">{team.losses.toFixed(1)}</td>
                  <td className="py-2.5 px-3 text-right font-mono font-semibold" style={{ color: c.primary }}>{team.pct.toFixed(3)}</td>
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

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-[#f7f8f3] p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold text-gray-900">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-gray-400">{detail}</p>}
    </div>
  )
}

function JblTeamOverview({
  team,
  batters,
  pitchers,
}: {
  team: SimTeam | null
  batters: SimBatter[]
  pitchers: SimPitcher[]
}) {
  if (!team) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm text-gray-500">Select a team from the header to view Team Overview.</p>
      </div>
    )
  }

  const c = teamColors(team.name)
  const teamBatters = batters.filter((p) => p.team === team.name)
  const teamPitchers = pitchers.filter((p) => p.team === team.name)
  const topBatters = teamBatters.slice(0, 5)
  const topPitchers = teamPitchers.slice(0, 5)
  const abbr = team.name.split(" ").slice(-1)[0].slice(0, 3).toUpperCase()

  return (
    <div className="space-y-5">
      <section className="rounded-2xl overflow-hidden shadow-sm">
        {/* color banner */}
        <div
          className="px-5 pt-5 pb-4"
          style={{ background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.primary}cc 60%, ${c.primary}55 100%)` }}
        >
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.28em]" style={{ color: `${c.accent}99` }}>
                Team Overview
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight" style={{ color: c.accent }}>
                {team.name}
              </h1>
            </div>
            <span
              className="text-5xl font-black tracking-tight select-none leading-none"
              style={{ color: `${c.accent}25` }}
            >
              {abbr}
            </span>
          </div>
        </div>
        {/* accent stripe */}
        <div className="h-1" style={{ background: `linear-gradient(90deg, ${c.accent}66, ${c.primary}, ${c.accent}33)` }} />
        {/* stats tiles */}
        <div className="bg-white p-5">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
            <StatTile label="W-L" value={`${team.wins.toFixed(1)}-${team.losses.toFixed(1)}`} />
            <StatTile label="PCT" value={team.pct.toFixed(3)} />
            <StatTile label="RS/G" value={team.rsPerGame.toFixed(2)} />
            <StatTile label="RA/G" value={team.raPerGame.toFixed(2)} />
            <StatTile label="DIFF" value={(team.rsPerGame - team.raPerGame).toFixed(2)} detail="runs/game" />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: c.primary }}>Top Batters</h2>
          <div className="mt-4 space-y-2">
            {topBatters.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: `${c.primary}0d`, borderLeft: `3px solid ${c.primary}66` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">OPS {p.ops.toFixed(3)} · HR/162 {((p.hr / (p.pa / 4.3)) * 162).toFixed(0)}</p>
                </div>
                <span className="font-mono text-sm font-black" style={{ color: c.primary }}>{p.avg.toFixed(3)}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-base font-bold" style={{ color: c.primary }}>Top Pitchers</h2>
          <div className="mt-4 space-y-2">
            {topPitchers.map((p) => (
              <div
                key={p.name}
                className="flex items-center justify-between rounded-xl px-3 py-2.5"
                style={{ background: `${c.primary}0d`, borderLeft: `3px solid ${c.primary}66` }}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                  <p className="text-xs text-gray-400">WHIP {p.whip.toFixed(2)} · K/9 {p.k9.toFixed(1)}</p>
                </div>
                <span className="font-mono text-sm font-black" style={{ color: c.primary }}>{p.era.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function JblPlayersTab({
  batters,
  pitchers,
  mode,
  onModeChange,
}: {
  batters: SimBatter[]
  pitchers: SimPitcher[]
  mode: SimPlayerMode
  onModeChange: (mode: SimPlayerMode) => void
}) {
  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f7f8f3] p-1">
        {(["batting", "pitching"] as const).map((nextMode) => (
          <button
            key={nextMode}
            type="button"
            onClick={() => onModeChange(nextMode)}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
              mode === nextMode ? "bg-white text-green-900 shadow-sm" : "text-gray-500 hover:bg-white hover:text-green-900"
            }`}
          >
            {nextMode === "batting" ? "Batting" : "Pitching"}
          </button>
        ))}
      </div>
      {mode === "batting" ? <BattingView batters={batters} /> : <PitchingView pitchers={pitchers} />}
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

// ── Game Replay ────────────────────────────────────────────────────────────

function halfLabel(inning: number, isTop: boolean) {
  return `${isTop ? "TOP" : "BOT"} ${inning}`
}

function pitchOutcomeLabel(outcome: string) {
  if (outcome === "called strike") return "Called Strike"
  if (outcome === "swinging strike") return "Swinging Strike"
  if (outcome === "in play") return "In Play"
  if (outcome === "foul") return "Foul"
  if (outcome === "ball") return "Ball"
  return outcome
}

function resultEmoji(result: string) {
  const r = result.toLowerCase()
  if (r.includes("home run")) return "💥"
  if (r.includes("triple")) return "🔺"
  if (r.includes("double")) return "🔷"
  if (r.includes("single")) return "⚾"
  if (r.includes("walk")) return "🚶"
  if (r.includes("strikes out") || r.includes("strikeout") || r.includes("strike out")) return "🌀"
  if (r.includes("error")) return "❌"
  return "·"
}

function BatterResultChip({ result }: { result: string }) {
  const r = result.toLowerCase()
  const isHR  = r.includes("home run")
  const is3B  = r.includes("triple")
  const is2B  = r.includes("double")
  const is1B  = r.includes("single")
  const isBB  = r.includes("walk")
  const isK   = r.includes("strikes out") || r.includes("strikeout") || r.includes("strike out")
  const isErr = r.includes("error")
  const label = isHR ? "HR" : is3B ? "3B" : is2B ? "2B" : is1B ? "1B" : isBB ? "BB" : isK ? "K" : isErr ? "E" : "O"
  const color =
    isHR  ? "text-yellow-400 border-yellow-400/60" :
    is3B  ? "text-blue-400 border-blue-400/60" :
    is2B  ? "text-blue-300 border-blue-300/60" :
    is1B  ? "text-green-400 border-green-400/60" :
    isBB  ? "text-sky-400 border-sky-400/60" :
    isK   ? "text-red-400 border-red-400/60" :
    isErr ? "text-orange-400 border-orange-400/60" :
            "text-gray-500 border-gray-600"
  return (
    <span className={`inline-flex items-center justify-center text-[10px] font-black border rounded px-1 py-0.5 leading-none ${color}`}>
      {label}
    </span>
  )
}

function BaseDiamond({ bases }: { bases: PitchEvent["bases"] }) {
  const dot = (on: boolean) => (
    <span
      className={`inline-block h-3 w-3 rotate-45 rounded-[2px] border border-amber-400 ${on ? "bg-amber-400" : "bg-white"}`}
    />
  )
  return (
    <div className="grid grid-cols-3 grid-rows-2 gap-1 w-12 select-none">
      <div />
      <div className="flex justify-center">{dot(!!bases.second)}</div>
      <div />
      <div className="flex justify-end">{dot(!!bases.third)}</div>
      <div />
      <div className="flex justify-start">{dot(!!bases.first)}</div>
    </div>
  )
}

function CountDots({ n, max, activeColor, dotSize = "h-2 w-2", inactiveColor = "bg-gray-200" }: {
  n: number; max: number; activeColor: string; dotSize?: string; inactiveColor?: string
}) {
  return (
    <span className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`inline-block ${dotSize} rounded-full ${i < n ? activeColor : inactiveColor}`} />
      ))}
    </span>
  )
}

type LogEntry =
  | { kind: "inning"; label: string }
  | { kind: "pitch"; text: string; isInPlay: boolean }
  | { kind: "play"; text: string; emoji: string; runs: number }
  | { kind: "announce"; text: string; emoji: string }

function trajLengthFt(traj: BallTraj): number {
  let len = 0
  for (let i = 1; i < traj.length; i += 1) {
    const [ax, ay, az] = traj[i - 1]
    const [bx, by, bz] = traj[i]
    const dx = bx - ax
    const dy = by - ay
    const dz = bz - az
    len += Math.hypot(dx, dy, dz)
  }
  return len
}

function baseRunDistanceFt(result: string): number {
  const text = result.toLowerCase()
  if (text.includes("home run")) return 360
  if (text.includes("triple")) return 270
  if (text.includes("double")) return 180
  if (
    text.includes("single") ||
    text.includes("ground") ||
    text.includes("error") ||
    text.includes("fielder")
  ) {
    return 90
  }
  return 0
}

function playAnimationDelay(ev: PlayEvent): number {
  if (!ev.hit) return 2400

  const result = ev.result.toLowerCase()
  const grounder = result.includes("ground") || ev.hit.la <= 8
  const flightMs = Math.min(
    grounder ? 900 : 1800,
    Math.max(520, trajLengthFt(ev.hit.traj) * (grounder ? 4.2 : 3.5)),
  )
  const throwMs = grounder ? 760 : 0
  const defenseMs = grounder ? flightMs + throwMs + 650 : flightMs + 1700
  const runFeet = baseRunDistanceFt(ev.result)
  const runnerMs = runFeet > 0 ? (runFeet / (result.includes("home run") ? 44 : 32)) * 1000 : 0

  return Math.min(9200, Math.max(defenseMs, flightMs + runnerMs) + 900)
}

function eventDelay(ev: GameEvent, speed: number): number {
  const base =
    ev.type === "half_inning"  ? 700 :
    ev.type === "pitch"        ? 1450 :
    ev.type === "stolen_base"  ? 1800 :
    ev.type === "pickoff"      ? 1400 :
    ev.type === "substitution" ? 2200 :
    ev.type === "play"         ? playAnimationDelay(ev) :
    1200
  return Math.max(50, base / speed)
}

function contactGrade(ev?: number): { detail: string; tone: string; color: string; metric?: string } {
  if (ev === undefined) return { detail: "MEET",   tone: "bg-emerald-500 text-white", color: "#10b981" }
  if (ev >= 100)        return { detail: "BARREL", tone: "bg-emerald-500 text-white", color: "#10b981", metric: `${ev.toFixed(0)} mph` }
  if (ev >= 88)         return { detail: "HARD",   tone: "bg-lime-500 text-white",    color: "#84cc16", metric: `${ev.toFixed(0)} mph` }
  if (ev >= 72)         return { detail: "SOLID",  tone: "bg-amber-500 text-white",   color: "#f59e0b", metric: `${ev.toFixed(0)} mph` }
  return                       { detail: "SOFT",   tone: "bg-sky-500 text-white",     color: "#38bdf8", metric: `${ev.toFixed(0)} mph` }
}

function swingStatus(pitch?: PitchEvent, nextPlay?: PlayEvent): SwingInfo | null {
  if (!pitch) return null
  if (pitch.outcome === "in play") {
    const contact = contactGrade(nextPlay?.hit?.ev)
    return { label: "MEET", ...contact }
  }
  if (pitch.outcome === "foul") {
    return { label: "SWING", detail: "FOUL", tone: "bg-amber-500 text-white", color: "#f59e0b" }
  }
  if (pitch.outcome === "swinging strike") {
    return { label: "SWING", detail: "MISS", tone: "bg-red-500 text-white", color: "#ef4444" }
  }
  return null
}

function defenseNames(game: GameData, ev: PitchEvent | PlayEvent | null): Partial<Record<string, string>> {
  if (!ev) return {}
  const lineup = ev.isTop ? game.homeLineup : game.awayLineup
  return {
    P: ev.pitcher,
    C: lineup[0],
    "1B": lineup[1],
    "2B": lineup[2],
    SS: lineup[3],
    "3B": lineup[4],
    LF: lineup[5],
    CF: lineup[6],
    RF: lineup[7],
  }
}

// SPEED: pitch=900ms, play=1800ms, inning=700ms
const GAME_SPEED = 1

function announceLogEntry(ev: StolenBaseEvent | PickoffEvent | SubstitutionEvent): Extract<LogEntry, { kind: "announce" }> {
  if (ev.type === "stolen_base") {
    return ev.success
      ? { kind: "announce", text: `${ev.runner} steals ${ev.base}`, emoji: "💨" }
      : { kind: "announce", text: `${ev.runner} caught stealing`, emoji: "🚫" }
  }
  if (ev.type === "pickoff") {
    return ev.out
      ? { kind: "announce", text: `Pickoff — ${ev.runner} out at ${ev.base}`, emoji: "🎯" }
      : { kind: "announce", text: `Pickoff attempt — ${ev.runner} safe`, emoji: "↩️" }
  }
  const label = ev.subType === "pitching" ? "Pitching change"
    : ev.subType === "batting" ? "Pinch hitter"
    : "Substitution"
  return { kind: "announce", text: `${label}: ${ev.playerIn} for ${ev.playerOut}`, emoji: "🔄" }
}

function buildLog(events: GameEvent[], upTo: number): LogEntry[] {
  const log: LogEntry[] = []
  for (let i = 0; i < upTo; i++) {
    const ev = events[i]
    if (ev.type === "half_inning") {
      log.push({ kind: "inning", label: halfLabel(ev.inning, ev.isTop) })
    } else if (ev.type === "pitch" && ev.outcome !== "in play") {
      log.push({ kind: "pitch", text: `${ev.pitchType[0].toUpperCase() + ev.pitchType.slice(1)} — ${pitchOutcomeLabel(ev.outcome)}`, isInPlay: false })
    } else if (ev.type === "play") {
      log.push({ kind: "play", text: `${ev.batter} — ${ev.result}${ev.runsScored > 0 ? ` (${ev.runsScored}R)` : ""}`, emoji: resultEmoji(ev.result), runs: ev.runsScored })
    } else if (ev.type === "stolen_base" || ev.type === "pickoff" || ev.type === "substitution") {
      const { text, emoji } = announceLogEntry(ev)
      log.push({ kind: "announce", text, emoji })
    }
  }
  return log
}

function GameView({ game, isVisible }: { game: GameData; isVisible: boolean }) {
  const events = game.events
  const storageKey = `jbl-game-idx-${game.date}`

  const [idx, setIdx] = useState(() => {
    const saved = localStorage.getItem(storageKey)
    return saved ? Math.min(parseInt(saved, 10), events.length) : 0
  })
  const [log, setLog] = useState<LogEntry[]>(() => buildLog(events, idx))
  const [speed, setSpeed] = useState(GAME_SPEED)
  const [announcement, setAnnouncement] = useState<{ label: string; sub: string; color: string } | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  const { lastPitch, lastPlay, lastHalf } = useMemo(() => {
    let lastPitch: PitchEvent | undefined
    let lastPlay: PlayEvent | undefined
    let lastHalf: HalfInningEvent | undefined
    for (let i = idx - 1; i >= 0; i--) {
      const e = events[i]
      if (!lastPitch && e.type === "pitch") lastPitch = e as PitchEvent
      if (!lastPlay  && e.type === "play")  lastPlay  = e as PlayEvent
      if (!lastHalf  && e.type === "half_inning") lastHalf = e as HalfInningEvent
      if (lastPitch && lastPlay && lastHalf) break
    }
    return { lastPitch, lastPlay, lastHalf }
  }, [events, idx])

  const currentScore  = lastPlay?.score ?? lastPitch?.score ?? lastHalf?.score ?? { away: 0, home: 0 }
  const currentBases  = lastPitch?.bases ?? lastPlay?.bases ?? { first: null, second: null, third: null }
  const currentOuts   = lastPitch?.outs  ?? lastPlay?.outs  ?? 0
  const currentInning = lastHalf?.inning ?? 1
  const currentTop    = lastHalf?.isTop  ?? true
  const pitcher       = lastPitch?.pitcher ?? lastPlay?.pitcher ?? ""
  const batter        = lastPitch?.batter  ?? lastPlay?.batter  ?? ""
  const balls         = lastPitch?.balls   ?? 0
  const strikes       = lastPitch?.strikes ?? 0
  const isDone        = idx >= events.length
  const currentEvent = idx > 0 ? events[idx - 1] : null
  const previousEvent = idx > 1 ? events[idx - 2] : null

  // ── Strike zone: 現在の打席の全投球ドット ─────────────────────────────
  const { pitchHistory, lastP } = useMemo(() => {
    const searchEnd = currentEvent?.type === "play" ? idx - 1 : idx
    let lastPlayIdx = -1
    for (let i = searchEnd - 1; i >= 0; i--) {
      if (events[i].type === "play") { lastPlayIdx = i; break }
    }
    const atBatPitches = events.slice(lastPlayIdx + 1, idx).filter(
      (e): e is PitchEvent => e.type === "pitch" && (e as PitchEvent).px !== undefined
    )
    const pitchHistory: PitchDot[] = atBatPitches.slice(0, -1).map(p => ({
      px: p.px!, pz: p.pz!, pitchType: p.pitchType, outcome: p.outcome, mx: p.mx, mz: p.mz,
    }))
    return { pitchHistory, lastP: atBatPitches.at(-1) }
  }, [events, idx, currentEvent])
  // useMemo on lastP object identity: same pitch event → same incoming reference → no re-animation
  const pitchIncoming = useMemo<PitchDot | undefined>(() => {
    if (!lastP) return undefined
    return { px: lastP.px!, pz: lastP.pz!, pitchType: lastP.pitchType, outcome: lastP.outcome, mx: lastP.mx, mz: lastP.mz, velo: lastP.velo }
  }, [lastP])
  const batHand: "L" | "R" = lastP?.batHand ?? "R"
  const pitchHand: "L" | "R" = lastP?.pitchHand ?? "R"

  // ── in-play pitchを表示した後、次のplayイベントだけ打球画面へ遷移 ─────
  const nextEvent = idx < events.length ? events[idx] : null
  const upcomingPlay = nextEvent?.type === "play" ? nextEvent : undefined
  const displayedPlay = currentEvent?.type === "play" ? currentEvent : upcomingPlay
  // memoize swing: swingStatus returns a new object every call, so without memo
  // any re-render (speed change, tab switch, etc.) would make `swing` a new reference
  // and trigger StrikeZoneView's incoming animation effect, restarting the pitch animation
  const swing = useMemo(() => swingStatus(lastP, displayedPlay), [lastP, displayedPlay])
  const showField =
    currentEvent?.type === "play" &&
    previousEvent?.type === "pitch" &&
    previousEvent.outcome === "in play" &&
    currentEvent.hit !== undefined
  const fieldHit = showField && currentEvent.type === "play" ? currentEvent.hit! : null
  const defenders = defenseNames(game, currentEvent?.type === "play" ? currentEvent : lastP ?? null)

  // ── 投手の球数・三振数、バッターの打席履歴 ───────────────────────────────
  const { pitcherPitches, pitcherKs, batterResults } = useMemo(() => {
    let pitcherPitches = 0
    let pitcherKs = 0
    const batterResults: string[] = []
    for (let i = 0; i < idx; i++) {
      const e = events[i]
      if (e.type === "pitch" && pitcher && (e as PitchEvent).pitcher === pitcher) pitcherPitches++
      if (e.type === "play") {
        const p = e as PlayEvent
        if (pitcher && p.pitcher === pitcher && p.result.toLowerCase().includes("strikes out")) pitcherKs++
        if (batter && p.batter === batter) batterResults.push(p.result)
      }
    }
    return { pitcherPitches, pitcherKs, batterResults }
  }, [events, idx, pitcher, batter])

  // 進行位置を localStorage に保存
  useEffect(() => {
    localStorage.setItem(storageKey, String(idx))
  }, [idx, storageKey])

  // auto-advance — paused when game tab is not visible
  useEffect(() => {
    if (isDone || !isVisible) return
    const ev = events[idx]
    const delay = currentEvent?.type === "play"
      ? eventDelay(currentEvent, speed)
      : eventDelay(ev, speed)
    const timer = setTimeout(() => {
      if (ev.type === "half_inning") {
        setAnnouncement(null)
        setLog(l => [...l, { kind: "inning", label: halfLabel(ev.inning, ev.isTop) }])
      } else if (ev.type === "pitch" && ev.outcome !== "in play") {
        setAnnouncement(null)
        setLog(l => [...l, {
          kind: "pitch",
          text: `${ev.pitchType[0].toUpperCase() + ev.pitchType.slice(1)} — ${pitchOutcomeLabel(ev.outcome)}`,
          isInPlay: false,
        }])
      } else if (ev.type === "play") {
        setAnnouncement(null)
        setLog(l => [...l, {
          kind: "play",
          text: `${ev.batter} — ${ev.result}${ev.runsScored > 0 ? ` (${ev.runsScored}R)` : ""}`,
          emoji: resultEmoji(ev.result),
          runs: ev.runsScored,
        }])
      } else if (ev.type === "stolen_base") {
        const a = ev.success
          ? { label: "STOLEN BASE", sub: `${ev.runner} → ${ev.base}`, color: "#22c55e" }
          : { label: "CAUGHT STEALING", sub: ev.runner, color: "#ef4444" }
        setAnnouncement(a)
        setLog(l => [...l, announceLogEntry(ev)])
      } else if (ev.type === "pickoff") {
        const a = ev.out
          ? { label: "PICKOFF OUT", sub: `${ev.runner} at ${ev.base}`, color: "#f97316" }
          : { label: "PICKOFF", sub: `${ev.runner} safe`, color: "#94a3b8" }
        setAnnouncement(a)
        setLog(l => [...l, announceLogEntry(ev)])
      } else if (ev.type === "substitution") {
        const label = ev.subType === "pitching" ? "PITCHING CHANGE"
          : ev.subType === "batting" ? "PINCH HITTER"
          : "SUBSTITUTION"
        setAnnouncement({ label, sub: `${ev.playerIn} for ${ev.playerOut}`, color: "#818cf8" })
        setLog(l => [...l, announceLogEntry(ev)])
      }
      setIdx(i => i + 1)
    }, delay)
    return () => clearTimeout(timer)
  }, [idx, events, isDone, speed, currentEvent, isVisible])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  const awayShort = game.away.split(" ").slice(-1)[0].toUpperCase()
  const homeShort = game.home.split(" ").slice(-1)[0].toUpperCase()
  const awayColor = teamColors(game.away).primary
  const homeColor = teamColors(game.home).primary

  return (
    <div className="space-y-4">
      {/* Scoreboard */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
            Today's JBL Game · {game.date}
          </span>
          <div className="flex items-center gap-2">
            {isDone
              ? <span className="text-xs font-bold text-gray-500 uppercase tracking-widest">Final</span>
              : <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 uppercase tracking-widest">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
                  Live
                </span>
            }
            <button
              onClick={() => {
                localStorage.removeItem(storageKey)
                setIdx(0)
                setLog([])
              }}
              className="text-[10px] text-gray-400 hover:text-gray-600 border border-gray-200 rounded px-1.5 py-0.5"
            >
              ↺
            </button>
            {[0.5, 1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`text-[10px] rounded px-1.5 py-0.5 border ${speed === s ? "bg-green-700 text-white border-green-700" : "text-gray-400 border-gray-200 hover:text-gray-600"}`}
              >
                ×{s}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-6 px-6 py-5">
          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: awayColor }}>{awayShort}</span>
            <span className="text-4xl font-black text-gray-800 font-mono">{currentScore.away}</span>
            <span className="text-[10px] text-gray-400 text-center">{game.away}</span>
          </div>

          <div className="flex flex-col items-center gap-1 text-center">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
              {isDone ? "—" : halfLabel(currentInning, currentTop)}
            </span>
            <span className="text-2xl text-gray-200 font-black">VS</span>
            {!isDone && (
              <span className="text-xs text-gray-400">{currentOuts} OUT{currentOuts !== 1 ? "S" : ""}</span>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 min-w-[80px]">
            <span className="text-xs font-bold uppercase tracking-wider" style={{ color: homeColor }}>{homeShort}</span>
            <span className="text-4xl font-black text-gray-800 font-mono">{currentScore.home}</span>
            <span className="text-[10px] text-gray-400 text-center">{game.home}</span>
          </div>
        </div>

        {isDone && (
          <div className="border-t border-gray-100 overflow-x-auto px-4 pb-4">
            <table className="text-xs font-mono text-center mx-auto">
              <thead>
                <tr className="text-gray-400">
                  <th className="pr-3 text-left font-semibold py-1">Team</th>
                  {game.lineScore.away.map((_, i) => (
                    <th key={i} className="w-6 py-1">{i + 1}</th>
                  ))}
                  <th className="pl-2 py-1 font-bold">R</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { label: awayShort, runs: game.lineScore.away, total: game.finalScore.away, color: awayColor },
                  { label: homeShort, runs: game.lineScore.home, total: game.finalScore.home, color: homeColor },
                ].map(({ label, runs, total, color }) => (
                  <tr key={label}>
                    <td className="pr-3 text-left font-bold py-1" style={{ color }}>{label}</td>
                    {runs.map((r, i) => (
                      <td key={i} className="w-6 py-1 text-gray-600">{r ?? "X"}</td>
                    ))}
                    <td className="pl-2 py-1 font-black text-gray-800">{total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Live at-bat status + visualization */}
      {!isDone && (
        <div className="bg-white shadow-sm overflow-hidden -mx-3 lg:-mx-4">
          {/* 3D view — ページ端まで全幅 */}
          <div className="relative w-full aspect-video">
            {fieldHit ? (
              <FieldView
                key={`field-${idx}`}
                traj={fieldHit.traj}
                exitVelo={fieldHit.ev}
                launchAngle={fieldHit.la}
                sprayAngle={fieldHit.sa}
                result={currentEvent?.type === "play" ? currentEvent.result : undefined}
                swing={swing}
                defenders={defenders}
                bases={previousEvent?.type === "pitch" ? previousEvent.bases : undefined}
              />
            ) : (
              <StrikeZoneView
                history={pitchHistory}
                incoming={pitchIncoming}
                batHand={batHand}
                pitchHand={pitchHand}
                playResult={displayedPlay?.result}
                swing={swing}
                announcement={announcement}
              />
            )}

            {/* Broadcast scoreboard HUD */}
            <div className="absolute top-4 right-4 pointer-events-none select-none rounded-2xl overflow-hidden bg-black/75 text-white" style={{ minWidth: 300 }}>
              {/* Inning */}
              <div className="bg-white/10 px-5 py-2 text-center text-sm font-black tracking-[0.22em] text-gray-300 uppercase">
                {halfLabel(currentInning, currentTop)}
              </div>
              {/* Score */}
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-white/10">
                <span className="text-base font-black tracking-wide w-20 truncate" style={{ color: awayColor, textDecoration: currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{awayShort}</span>
                <span className="text-5xl font-black font-mono text-white tabular-nums leading-none">
                  {currentScore.away}
                  <span className="text-gray-500 mx-2 text-3xl">–</span>
                  {currentScore.home}
                </span>
                <span className="text-base font-black tracking-wide w-20 text-right truncate" style={{ color: homeColor, textDecoration: !currentTop ? "underline" : "none", textUnderlineOffset: "4px" }}>{homeShort}</span>
              </div>
              {/* Diamond + Count */}
              <div className="flex items-center gap-6 px-5 py-4">
                {/* Dark-mode diamond */}
                <div className="grid grid-cols-3 grid-rows-2 gap-1.5 w-20 shrink-0">
                  <div /><div className="flex justify-center">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.second ? "bg-amber-400" : "bg-transparent"}`} />
                  </div><div />
                  <div className="flex justify-end">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.third ? "bg-amber-400" : "bg-transparent"}`} />
                  </div><div /><div className="flex justify-start">
                    <span className={`inline-block h-6 w-6 rotate-45 rounded-[3px] border-2 border-amber-400 ${currentBases.first ? "bg-amber-400" : "bg-transparent"}`} />
                  </div>
                </div>
                {/* BSO */}
                <div className="flex flex-col gap-2">
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">B <CountDots n={balls}       max={3} activeColor="bg-green-400"  dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">S <CountDots n={strikes}     max={2} activeColor="bg-yellow-400" dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                  <span className="flex items-center gap-2 text-base font-bold text-gray-400">O <CountDots n={currentOuts} max={2} activeColor="bg-red-500"    dotSize="h-3.5 w-3.5" inactiveColor="bg-gray-600" /></span>
                </div>
              </div>
              {/* Pitcher / Batter info */}
              {(pitcher || batter) && (
                <div className="border-t border-white/10 px-5 py-3 flex flex-col gap-2.5">
                  {pitcher && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">P</span>
                        <span className="text-sm font-bold text-white truncate">{pitcher}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs text-gray-400">
                          <span className="font-bold text-white">{pitcherPitches}</span>
                          <span className="text-gray-600 ml-0.5">P</span>
                        </span>
                        <span className="text-xs text-gray-400">
                          <span className="font-bold text-red-400">{pitcherKs}</span>
                          <span className="text-gray-600 ml-0.5">K</span>
                        </span>
                      </div>
                    </div>
                  )}
                  {batter && (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 shrink-0">B</span>
                        <span className="text-sm font-bold text-white truncate">{batter}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {batterResults.length === 0
                          ? <span className="text-xs text-gray-600">—</span>
                          : batterResults.map((r, i) => <BatterResultChip key={i} result={r} />)
                        }
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Bottom bar: diamond + count + matchup */}
          <div className="px-5 py-3 flex flex-wrap gap-6 items-center border-t border-gray-100">
            <BaseDiamond bases={currentBases} />
            <div className="flex flex-col gap-1">
              <div className="text-xs text-gray-500">
                {pitcher && (
                  <><span className="font-semibold text-gray-700">{pitcher}</span>
                  {" → "}
                  <span className="font-semibold text-gray-700">{batter}</span></>
                )}
              </div>
              <div className="flex gap-4 items-center">
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  B <CountDots n={balls}       max={4} activeColor="bg-green-500" />
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  S <CountDots n={strikes}     max={3} activeColor="bg-red-400" />
                </span>
                <span className="flex items-center gap-1 text-xs text-gray-500">
                  O <CountDots n={currentOuts} max={3} activeColor="bg-gray-500" />
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Play-by-play log */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-gray-100 text-xs font-bold uppercase tracking-widest text-gray-400">
          Play by Play
        </div>
        <div ref={logRef} className="h-72 overflow-y-auto px-4 py-2 space-y-0.5 text-xs font-mono">
          {log.length === 0 && (
            <div className="text-gray-300 py-4 text-center animate-pulse">Starting game...</div>
          )}
          {log.map((entry, i) => {
            if (entry.kind === "inning") {
              return (
                <div key={i} className="pt-2 pb-0.5 font-bold text-gray-400 uppercase tracking-widest text-[10px]">
                  ── {entry.label} ──
                </div>
              )
            }
            if (entry.kind === "pitch") {
              return (
                <div key={i} className="text-gray-400 pl-3">
                  · {entry.text}
                </div>
              )
            }
            if (entry.kind === "play") {
              return (
                <div key={i} className={`pl-2 font-semibold ${entry.runs > 0 ? "text-green-700" : "text-gray-700"}`}>
                  {entry.emoji} {entry.text}
                </div>
              )
            }
            if (entry.kind === "announce") {
              return (
                <div key={i} className="pl-2 font-semibold text-indigo-600">
                  {entry.emoji} {entry.text}
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    </div>
  )
}

// ── Page ───────────────────────────────────────────────────────────────────

export default function SimPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get("view") as SimView | null
  const validViews: SimView[] = ["team", "players", "today", "standings"]
  const [activeView, setActiveView] = useState<SimView>(
    validViews.includes(requestedView as SimView) ? (requestedView as SimView) : "team"
  )
  const [playerMode, setPlayerMode] = useState<SimPlayerMode>("batting")
  const [selectedTeamName, setSelectedTeamName] = useState("")
  const [stats, setStats] = useState<SimStats | null>(null)
  const [gameDates, setGameDates] = useState<string[]>([])
  const [selectedDate, setSelectedDate] = useState<string>("")
  const [game, setGame] = useState<GameData | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    fetch("/sim-stats.json")
      .then((r) => r.json())
      .then((data: SimStats) => {
        setStats(data)
        setSelectedTeamName((current) => current || data.teams[0]?.name || "")
      })
      .catch(() => setError("Failed to load sim stats."))
    fetch("/games/index.json")
      .then((r) => r.json())
      .then((dates: string[]) => {
        setGameDates(dates)
        if (dates.length > 0) setSelectedDate(dates[0])
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    if (!selectedDate) return
    setGame(null)
    fetch(`/games/game-${selectedDate}.json`)
      .then((r) => r.json())
      .then(setGame)
      .catch(() => {})
  }, [selectedDate])

  const handleChangeView = (view: string) => {
    const next = view as SimView
    setActiveView(next)
    setSearchParams({ view: next })
  }

  const selectedTeam = stats?.teams.find((team) => team.name === selectedTeamName) ?? null
  const filteredBatters = stats
    ? selectedTeamName
      ? stats.battingLeaders.filter((p) => p.team === selectedTeamName)
      : stats.battingLeaders
    : []
  const filteredPitchers = stats
    ? selectedTeamName
      ? stats.pitchingLeaders.filter((p) => p.team === selectedTeamName)
      : stats.pitchingLeaders
    : []

  return (
    <PageShell
      variant="mlb"
      style={jblThemeStyle(selectedTeamName)}
      activeView={activeView}
      onChangeView={handleChangeView}
      headerProps={{
        teamName: selectedTeamName,
        teams: stats?.teams.map((team) => team.name).sort((a, b) => a.localeCompare(b)) ?? [],
        onChangeTeam: (teamName) => {
          setSelectedTeamName(teamName)
          if (activeView === "standings" || activeView === "today") return
          setActiveView("team")
          setSearchParams({ view: "team" })
        },
        placeholder: "Select a JBL team...",
      }}
      tabs={[
        { label: "Team Overview", view: "team" },
        { label: "Players", view: "players" },
        { label: "Today's Games", view: "today" },
        { label: "Standings", view: "standings" },
        { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
      {error && (
        <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>
      )}

      {/* GameView は常にマウントしてタイマーを維持、非表示時は hidden */}
      {game && (
        <div className={activeView === "today" ? undefined : "hidden"}>
          {gameDates.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Game</span>
              <select
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 font-mono"
              >
                {gameDates.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          )}
          <GameView key={selectedDate} game={game} isVisible={activeView === "today"} />
        </div>
      )}
      {activeView === "today" && !game && (
        <div className="p-4 text-sm text-gray-500">Loading game data...</div>
      )}

      {activeView !== "today" && (
        <>
          {!stats && !error && (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          )}
          {stats && (
            <>
              {activeView === "team" && (
                <JblTeamOverview
                  team={selectedTeam}
                  batters={stats.battingLeaders}
                  pitchers={stats.pitchingLeaders}
                />
              )}
              {activeView === "players" && (
                <JblPlayersTab
                  batters={filteredBatters}
                  pitchers={filteredPitchers}
                  mode={playerMode}
                  onModeChange={setPlayerMode}
                />
              )}
              {activeView === "standings" && <StandingsView teams={stats.teams} />}
            </>
          )}
        </>
      )}
    </PageShell>
  )
}
