import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react"
import { useSearchParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import StrikeZoneView, { type PitchDot, type SwingInfo } from "../components/StrikeZoneView"
import FieldView, { type BallTraj } from "../components/FieldView"
import {
  simulateSeason,
  DIVISIONS,
  DIVISION_NAMES,
  ALL_TEAMS,
  type SeasonResult,
  type TeamRecord,
  type PlayoffSeries,
  type PlayoffSeed,
} from "../sim/jblSeason"
import { getJblData, getJblVisibleGames, type JblStandingLeague, type JblTeam } from "../api/jbl"
import type { JblGameJson } from "../sim/jblJsonTypes"

// ── Types ──────────────────────────────────────────────────────────────────

type SimTeam = JblTeam

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
  standings: JblStandingLeague[]
  visibleThrough: string
  visibleGameCount: number
  allGamesCount: number
  battingLeaders: SimBatter[]
  pitchingLeaders: SimPitcher[]
  leagueAvg: LeagueAvg
}

type SimView = "team" | "players" | "today" | "standings" | "season"
type SimPlayerMode = "batting" | "pitching"
type GameOption = { gameId: string; date: string; label: string }

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
  gameId?: string
  date: string
  away: string
  home: string
  finalScore: { away: number; home: number }
  lineScore: { away: (number | null)[]; home: (number | null)[] }
  awayLineup: string[]
  homeLineup: string[]
  events: GameEvent[]
}

function normalizeGame(game: JblGameJson): GameData {
  return {
    gameId: game.gameId,
    date: game.date,
    away: game.away,
    home: game.home,
    finalScore: game.finalScore,
    lineScore: game.lineScore,
    awayLineup: game.awayLineup,
    homeLineup: game.homeLineup,
    events: game.events.map((event) => {
      const isTop = "isTop" in event
        ? Boolean((event as { isTop?: boolean }).isTop)
        : "half" in event && event.half === "top"
      if (event.type === "half_inning") {
        return {
          type: "half_inning",
          inning: event.inning,
          isTop,
          score: event.score,
        }
      }
      if (event.type === "pitch") {
        return {
          type: "pitch",
          inning: event.inning,
          isTop,
          pitcher: event.pitcher,
          batter: event.batter,
          pitchType: event.pitchType,
          outcome: event.outcome,
          balls: event.ballsBefore,
          strikes: event.strikesBefore,
          outs: event.outsBefore,
          score: event.scoreBefore,
          bases: event.basesBefore,
          velo: event.velo,
          px: event.px,
          pz: event.pz,
          mx: event.mx,
          mz: event.mz,
          batHand: event.batHand,
          pitchHand: event.pitchHand,
        }
      }
      if (event.type === "play") {
        const runsScored = Array.isArray(event.runsScored)
          ? event.runsScored.length
          : Number(event.runsScored ?? 0)
        return {
          type: "play",
          inning: event.inning,
          isTop,
          batter: event.batter,
          pitcher: event.pitcher,
          result: event.result,
          outs: event.outsAfter,
          score: event.scoreAfter,
          bases: event.basesAfter,
          runsScored,
          hit: event.hit
            ? {
                ev: event.hit.ev,
                la: event.hit.la,
                sa: event.hit.sa,
                traj: event.hit.traj,
              }
            : undefined,
        }
      }
      return {
        type: "substitution",
        inning: "inning" in event ? event.inning : 1,
        isTop,
        subType: "subType" in event ? event.subType : "defensive",
        playerOut: "playerOut" in event ? event.playerOut : "",
        playerIn: "playerIn" in event ? event.playerIn : "",
        team: "team" in event && event.team === game.away ? "away" : "home",
        score: { away: 0, home: 0 },
        bases: { first: null, second: null, third: null },
        outs: 0,
      }
    }),
  }
}

function battingFromGames(games: JblGameJson[]): SimBatter[] {
  const byName = new Map<string, {
    name: string
    team: string
    ab: number
    r: number
    h: number
    rbi: number
    bb: number
    so: number
    hr: number
  }>()

  for (const game of games) {
    for (const player of game.boxScore.batters) {
      const key = `${player.team}:${player.name}`
      const row = byName.get(key) ?? {
        name: player.name,
        team: player.team,
        ab: 0,
        r: 0,
        h: 0,
        rbi: 0,
        bb: 0,
        so: 0,
        hr: 0,
      }
      row.ab += player.ab
      row.r += player.runs ?? player.r ?? 0
      row.h += player.h
      row.rbi += player.rbi
      row.bb += player.bb
      row.so += player.so
      row.hr += player.hr
      byName.set(key, row)
    }
  }

  return [...byName.values()]
    .map((row) => {
      const pa = row.ab + row.bb
      const singles = Math.max(0, row.h - row.hr)
      const totalBases = singles + row.hr * 4
      const avg = row.ab > 0 ? row.h / row.ab : 0
      const obp = pa > 0 ? (row.h + row.bb) / pa : 0
      const slg = row.ab > 0 ? totalBases / row.ab : 0
      const bip = row.ab - row.so - row.hr
      return {
        name: row.name,
        team: row.team,
        pa,
        avg,
        obp,
        slg,
        ops: obp + slg,
        woba: pa > 0 ? (0.69 * row.bb + 0.88 * singles + 2.03 * row.hr) / pa : 0,
        kPct: pa > 0 ? (row.so / pa) * 100 : 0,
        bbPct: pa > 0 ? (row.bb / pa) * 100 : 0,
        babip: bip > 0 ? (row.h - row.hr) / bip : 0,
        rbi: row.rbi,
        hr: row.hr,
        sb: 0,
      }
    })
    .sort((a, b) => b.ops - a.ops)
}

function pitchingFromGames(games: JblGameJson[]): SimPitcher[] {
  const byName = new Map<string, {
    name: string
    team: string
    ip: number
    h: number
    r: number
    er: number
    bb: number
    so: number
    hr: number
    wins: number
    saves: number
    games: number
  }>()

  for (const game of games) {
    for (const player of game.boxScore.pitchers) {
      const key = `${player.team}:${player.name}`
      const row = byName.get(key) ?? {
        name: player.name,
        team: player.team,
        ip: 0,
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 0,
        hr: 0,
        wins: 0,
        saves: 0,
        games: 0,
      }
      row.ip += player.ip
      row.h += player.h
      row.r += player.r
      row.er += player.er
      row.bb += player.bb
      row.so += player.so
      row.hr += player.hr
      row.wins += player.wins
      row.saves += player.saves
      row.games += 1
      byName.set(key, row)
    }
  }

  return [...byName.values()]
    .map((row) => ({
      name: row.name,
      team: row.team,
      gs: 0,
      gr: row.games,
      ip: row.ip,
      w: row.wins,
      era: row.ip > 0 ? (row.er * 9) / row.ip : 0,
      whip: row.ip > 0 ? (row.bb + row.h) / row.ip : 0,
      k9: row.ip > 0 ? (row.so * 9) / row.ip : 0,
      bb9: row.ip > 0 ? (row.bb * 9) / row.ip : 0,
      kPct: row.so + row.bb + row.h > 0 ? (row.so / (row.so + row.bb + row.h)) * 100 : 0,
      bbPct: row.so + row.bb + row.h > 0 ? (row.bb / (row.so + row.bb + row.h)) * 100 : 0,
      fip: row.ip > 0 ? ((13 * row.hr + 3 * row.bb - 2 * row.so) / row.ip) + 3.1 : 0,
      sv: row.saves,
    }))
    .sort((a, b) => a.era - b.era)
}

function seasonToStats(
  games: JblGameJson[],
  teams: JblTeam[],
  standings: JblStandingLeague[],
  visibleThrough: string,
  allGamesCount: number,
  visibleGameCount = games.length,
): SimStats {
  return {
    seasons: 1,
    teams,
    standings,
    visibleThrough,
    visibleGameCount,
    allGamesCount,
    battingLeaders: battingFromGames(games),
    pitchingLeaders: pitchingFromGames(games),
    leagueAvg: { kPct: 0, bbPct: 0, avg: 0, babip: 0, era: 0 },
  }
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

function sortStandingsTeams(teams: SimTeam[]) {
  const leagueOrder = new Map(ALL_TEAMS.map((team, index) => [team, index]))
  return [...teams].sort((a, b) => {
    if (a.hasStats !== b.hasStats) return a.hasStats ? -1 : 1
    if (b.pct !== a.pct) return b.pct - a.pct
    if (b.wins !== a.wins) return b.wins - a.wins
    return (leagueOrder.get(a.name) ?? 0) - (leagueOrder.get(b.name) ?? 0)
  })
}

function StandingsCard({ title, teams }: { title: string; teams: SimTeam[] }) {
  const sorted = sortStandingsTeams(teams)
  const leader = sorted.find((team) => team.hasStats)

  return (
    <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
      <div className="px-4 py-3">
        <h3 className="text-xs font-black uppercase tracking-widest text-green-900">{title}</h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100 text-xs font-bold text-gray-400">
            <th className="px-4 pb-2 text-left">Team</th>
            <th className="px-2 pb-2 text-right">W</th>
            <th className="px-2 pb-2 text-right">L</th>
            <th className="px-2 pb-2 text-right">PCT</th>
            <th className="px-4 pb-2 text-right">GB</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, index) => {
            const c = teamColors(team.name)
            const gamesBehind = leader && team.hasStats
              ? ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2
              : 0
            const gb = !team.hasStats || index === 0 ? "—" : gamesBehind.toFixed(1)

            return (
              <tr key={team.name} className="border-b border-gray-50 last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2">
                    {teamBadge(team.name)}
                    <span className="truncate font-bold text-gray-700" style={{ color: c.primary }}>
                      {team.name}
                    </span>
                  </div>
                </td>
                <td className="px-2 py-2.5 text-right font-mono font-semibold text-gray-700">{team.wins}</td>
                <td className="px-2 py-2.5 text-right font-mono text-gray-500">{team.losses}</td>
                <td className="px-2 py-2.5 text-right font-mono text-gray-500">
                  {team.hasStats ? team.pct.toFixed(3) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right font-mono text-gray-400">{gb}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function StandingsView({ standings = [] }: { standings?: JblStandingLeague[] }) {
  if (standings.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        No JBL standings are available.
      </div>
    )
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {standings.map((league) => (
        <section key={league.name} className="space-y-3">
          <h2 className="px-1 text-sm font-black uppercase tracking-[0.18em] text-green-900">
            {league.name.toUpperCase()}
          </h2>
          <StandingsCard
            title={league.name.replace(" Division", "")}
            teams={league.teams}
          />
        </section>
      ))}
    </div>
  )
}

// ── Season Sim tab ─────────────────────────────────────────────────────────

function SeasonDivTable({ divKey, teams, seeds }: { divKey: string; teams: TeamRecord[]; seeds: PlayoffSeed[] }) {
  const getSeed = (name: string) => seeds.find((s) => s.team === name)?.seed
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">{DIVISION_NAMES[divKey]}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-1 w-1" />
              <th className="py-2 pl-3 pr-2 text-left">Team</th>
              <th className="py-2 px-2 text-right">W</th>
              <th className="py-2 px-2 text-right">L</th>
              <th className="py-2 px-2 text-right">PCT</th>
              <th className="py-2 px-2 text-right">GB</th>
              <th className="py-2 px-2 text-right">L10</th>
              <th className="py-2 px-2 text-right">Str</th>
              <th className="py-2 px-3 text-right hidden sm:table-cell">H</th>
              <th className="py-2 px-3 text-right hidden sm:table-cell">A</th>
              <th className="py-2 px-3 text-right hidden md:table-cell">Div</th>
            </tr>
          </thead>
          <tbody>
            {teams.map((t, i) => {
              const c = teamColors(t.name)
              const gb = i === 0 ? "—" : t.gb.toFixed(1)
              const seedNum = getSeed(t.name)
              const streakStr = t.streak > 0 ? `W${t.streak}` : `L${Math.abs(t.streak)}`
              return (
                <tr key={t.name} className="border-b border-gray-50 last:border-0" style={{ background: i === 0 ? `${c.primary}0d` : undefined }}>
                  <td className="py-0 w-1">
                    <div className="h-full w-1 min-h-[36px]" style={{ background: `linear-gradient(to bottom, ${c.primary}, ${c.secondary})` }} />
                  </td>
                  <td className="py-2 pl-3 pr-2">
                    <div className="flex items-center gap-1.5">
                      {teamBadge(t.name)}
                      <span className="font-semibold text-[13px]" style={{ color: c.primary }}>{t.name}</span>
                      {seedNum && (
                        <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                          #{seedNum}{seedNum <= 3 ? " 🏆" : " 🃏"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-gray-800 text-[13px]">{t.wins}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-500 text-[13px]">{t.losses}</td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-[13px]" style={{ color: c.primary }}>{t.pct.toFixed(3)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400 text-[13px]">{gb}</td>
                  <td className="py-2 px-2 text-right font-mono text-[12px] text-gray-600">{t.last10W}-{t.last10L}</td>
                  <td className="py-2 px-2 text-right font-mono text-[12px] font-semibold" style={{ color: t.streak > 0 ? "#16a34a" : "#dc2626" }}>{streakStr}</td>
                  <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden sm:table-cell">{t.homeWins}-{t.homeLosses}</td>
                  <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden sm:table-cell">{t.awayWins}-{t.awayLosses}</td>
                  <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden md:table-cell">{t.divWins}-{t.divLosses}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function SeasonSeriesCard({ series, label }: { series: PlayoffSeries; label: string }) {
  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-100">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="text-[10px] text-gray-400">Best-of-{series.format}</span>
      </div>
      {[
        { team: series.higher, wins: series.higherWins },
        { team: series.lower,  wins: series.lowerWins  },
      ].map(({ team, wins }) => {
        const c = teamColors(team)
        return (
          <div key={team} className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0"
            style={{ background: series.winner === team ? `${c.primary}10` : undefined }}>
            {teamBadge(team)}
            <span className="flex-1 text-sm font-semibold truncate" style={{ color: c.primary }}>{team}</span>
            <span className="font-mono text-lg font-extrabold" style={{ color: series.winner === team ? c.primary : "#9ca3af" }}>{wins}</span>
            {series.winner === team && <span className="text-xs">✓</span>}
          </div>
        )
      })}
    </div>
  )
}

function SeasonTab() {
  const [season, setSeason] = useState<SeasonResult | null>(null)
  const [running, setRunning] = useState(false)
  const [seasonView, setSeasonView] = useState<"divisions" | "playoffs">("divisions")

  function run() {
    setRunning(true)
    setTimeout(() => {
      setSeason(simulateSeason(undefined, 2026))
      setRunning(false)
    }, 10)
  }

  if (!season && !running) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-12 text-center">
        <p className="text-4xl mb-4">⚾</p>
        <p className="font-semibold text-gray-600 mb-1">JBL 2026 レギュラーシーズン（162試合×18チーム）</p>
        <p className="text-sm text-gray-400 mb-6">ブラウザ内でシミュレート・即時実行</p>
        <button
          onClick={run}
          className="rounded-xl px-8 py-3 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
        >
          シーズンをシミュレート
        </button>
      </div>
    )
  }

  if (running) {
    return (
      <div className="rounded-2xl bg-white shadow-sm p-12 text-center">
        <p className="text-sm text-gray-400 animate-pulse">2926 試合をシミュレート中…</p>
      </div>
    )
  }

  const { divisionStandings, playoffs, records } = season!
  const champion = playoffs.champion

  return (
    <div className="space-y-5">
      {/* summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "総試合数", value: season!.results.length.toLocaleString() },
          { label: "全体1位", value: records[0].name.split(" ").slice(-1)[0], sub: `${records[0].wins}勝${records[0].losses}敗` },
          { label: "チャンピオン", value: champion?.split(" ").slice(-1)[0] ?? "—" },
          { label: "最多勝利", value: `${records[0].wins}勝`, sub: records[0].name },
        ].map((item) => (
          <div key={item.label} className="rounded-xl bg-white shadow-sm p-4 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
            <p className="mt-1 text-xl font-extrabold text-gray-900 leading-tight">{item.value}</p>
            {item.sub && <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>}
          </div>
        ))}
      </div>

      {/* sub-tab */}
      <div className="flex gap-2">
        {(["divisions", "playoffs"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setSeasonView(v)}
            className="rounded-lg px-4 py-1.5 text-sm font-semibold transition-all"
            style={seasonView === v
              ? { background: "#8b5cf6", color: "#fff" }
              : { background: "#f3f4f6", color: "#6b7280" }}
          >
            {v === "divisions" ? "地区別順位" : "プレーオフ"}
          </button>
        ))}
        <button
          onClick={run}
          className="ml-auto rounded-lg px-4 py-1.5 text-sm font-semibold text-gray-500 bg-gray-100 hover:bg-gray-200"
        >
          再シミュレート
        </button>
      </div>

      {seasonView === "divisions" && (
        <div className="space-y-5">
          {Object.keys(DIVISIONS).map((divKey) => (
            <SeasonDivTable
              key={divKey}
              divKey={divKey}
              teams={divisionStandings[divKey]}
              seeds={playoffs.seeds}
            />
          ))}
        </div>
      )}

      {seasonView === "playoffs" && (
        <div className="space-y-5">
          <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">プレーオフ出場チーム</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3">
              {playoffs.seeds.map((s) => {
                const c = teamColors(s.team)
                return (
                  <div key={s.team} className="flex items-center gap-3 px-4 py-3 border-b border-r border-gray-50">
                    <span className="text-2xl font-extrabold font-mono" style={{ color: c.primary }}>#{s.seed}</span>
                    <div>
                      <div className="flex items-center gap-1.5">{teamBadge(s.team)}<span className="text-xs font-bold" style={{ color: c.primary }}>{s.team}</span></div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-[10px] text-gray-400 font-mono">{s.record}</span>
                        <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 font-bold">{s.qualifier === "div" ? "地区優勝" : "WC"}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">ワイルドカード (Bo3)</p>
              {playoffs.wildCardRound.map((s, i) => <SeasonSeriesCard key={i} series={s} label={`WC${i + 1}`} />)}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">準決勝 (Bo5)</p>
              {playoffs.semifinal.map((s, i) => <SeasonSeriesCard key={i} series={s} label={`SF${i + 1}`} />)}
            </div>
            <div className="space-y-3">
              <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400">JBL 日本シリーズ (Bo7)</p>
              {playoffs.final && <SeasonSeriesCard series={playoffs.final} label="FINAL" />}
              {champion && (
                <div className="rounded-xl overflow-hidden shadow-md">
                  <div className="px-4 py-4 text-center"
                    style={{ background: `linear-gradient(135deg, ${teamColors(champion).primary}, ${teamColors(champion).secondary})`, color: teamColors(champion).accent }}>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">🏆 JBL チャンピオン</p>
                    <p className="text-lg font-extrabold mt-1">{champion}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Stat tile ───────────────────────────────────────────────────────────────

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
            <StatTile label="W-L" value={`${team.wins}-${team.losses}`} />
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
                  <p className="text-xs text-gray-400">OPS {p.ops.toFixed(3)} · HR {p.hr}</p>
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
  const validViews: SimView[] = ["team", "players", "today", "standings", "season"]
  const [activeView, setActiveView] = useState<SimView>(
    validViews.includes(requestedView as SimView) ? (requestedView as SimView) : "team"
  )
  const [playerMode, setPlayerMode] = useState<SimPlayerMode>("batting")
  const [selectedTeamName, setSelectedTeamName] = useState("")
  const [stats, setStats] = useState<SimStats | null>(null)
  const [gameOptions, setGameOptions] = useState<GameOption[]>([])
  const [selectedGameId, setSelectedGameId] = useState<string>("")
  const [gamesById, setGamesById] = useState<Record<string, GameData>>({})
  const [game, setGame] = useState<GameData | null>(null)
  const [error, setError] = useState("")
  const [detailedStatsLoaded, setDetailedStatsLoaded] = useState(false)
  const [detailedStatsLoading, setDetailedStatsLoading] = useState(false)

  useEffect(() => {
    if (!requestedView || !validViews.includes(requestedView)) return
    if (requestedView !== activeView) setActiveView(requestedView)
  }, [requestedView, activeView])

  useEffect(() => {
    let cancelled = false

    async function loadJblJson() {
      try {
        const { season, games, teams, standings, allGamesCount, visibleGameCount, visibleThrough } = await getJblData()
        if (cancelled) return

        const normalizedGames = Object.fromEntries(
          games.map((loadedGame) => [loadedGame.gameId, normalizeGame(loadedGame)])
        )
        const options = season.schedule
          .filter((scheduledGame) => scheduledGame.date === visibleThrough)
          .filter((scheduledGame) => normalizedGames[scheduledGame.gameId])
          .map((scheduledGame) => ({
            gameId: scheduledGame.gameId,
            date: scheduledGame.date,
            label: `${scheduledGame.date} · ${scheduledGame.away} at ${scheduledGame.home}`,
          }))
        const nextStats = seasonToStats([], teams, standings, visibleThrough, allGamesCount, visibleGameCount)

        setStats(nextStats)
        setGamesById(normalizedGames)
        setGameOptions(options)
        setSelectedTeamName((current) => current || nextStats.teams[0]?.name || "")
        setSelectedGameId((current) => current || options[0]?.gameId || "")
      } catch {
        if (!cancelled) setError("Failed to load JBL season JSON.")
      }
    }

    loadJblJson()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!stats || detailedStatsLoaded || detailedStatsLoading) return
    if (activeView !== "team" && activeView !== "players") return

    let cancelled = false
    setDetailedStatsLoading(true)

    getJblVisibleGames(stats.visibleThrough)
      .then((visibleGames) => {
        if (cancelled) return
        setStats((current) => {
          if (!current) return current
          return seasonToStats(
            visibleGames,
            current.teams,
            current.standings,
            current.visibleThrough,
            current.allGamesCount,
            current.visibleGameCount,
          )
        })
        setDetailedStatsLoaded(true)
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load JBL player stats.")
      })
      .finally(() => {
        if (!cancelled) setDetailedStatsLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [activeView, detailedStatsLoaded, detailedStatsLoading, stats])

  useEffect(() => {
    setGame(selectedGameId ? gamesById[selectedGameId] ?? null : null)
  }, [gamesById, selectedGameId])

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
          {gameOptions.length > 1 && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Game</span>
              <select
                value={selectedGameId}
                onChange={(e) => setSelectedGameId(e.target.value)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-700 font-mono"
              >
                {gameOptions.map((option) => (
                  <option key={option.gameId} value={option.gameId}>{option.label}</option>
                ))}
              </select>
            </div>
          )}
          <GameView key={selectedGameId} game={game} isVisible={activeView === "today"} />
        </div>
      )}
      {activeView === "today" && !game && (
        <div className="p-4 text-sm text-gray-500">Loading game data...</div>
      )}

      {activeView === "season" && <SeasonTab />}

      {activeView !== "today" && activeView !== "season" && (
        <>
          {!stats && !error && (
            <div className="p-4 text-sm text-gray-500">Loading...</div>
          )}
          {stats && (
            <>
              {(activeView === "team" || activeView === "players") && detailedStatsLoading && (
                <div className="mb-4 rounded-2xl bg-white p-4 text-sm text-gray-500 shadow-sm">
                  Loading player stats through {stats.visibleThrough}...
                </div>
              )}
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
              {activeView === "standings" && <StandingsView standings={stats.standings} />}
            </>
          )}
        </>
      )}
    </PageShell>
  )
}
