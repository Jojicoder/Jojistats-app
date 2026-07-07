import type { JblStandingLeague, JblTeam } from "../../api/jbl"
import type { BallTraj } from "../FieldView"

export type SimTeam = JblTeam

export type SimBatter = {
  name: string
  team: string
  position: string
  jerseyNumber: number | null
  games: number
  ab: number
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

export type PitcherRoleAbbr = "SP" | "LR" | "MR" | "SU" | "CL"

export type SimPitcher = {
  name: string
  team: string
  jerseyNumber: number | null
  role: PitcherRoleAbbr
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

export type LeagueAvg = {
  kPct: number
  bbPct: number
  avg: number
  babip: number
  era: number
}

export type SimStats = {
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

export type SimPlayerMode = "batting" | "pitching"

// ── Game replay types ────────────────────────────────────────────────────

export type HalfInningEvent = {
  type: "half_inning"
  inning: number
  isTop: boolean
  score: { away: number; home: number }
}
export type PitchEvent = {
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
export type BaseName = "home" | "first" | "second" | "third"
export type RunnerAdvance = {
  runner: string
  from: BaseName
  to: BaseName
  result: "safe" | "out" | "scored" | "held"
}
export type PlayEvent = {
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
  runnerAdvances: RunnerAdvance[]
  throwTo?: BaseName
}
export type StolenBaseEvent = {
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
export type PickoffEvent = {
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
export type SubstitutionEvent = {
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
export type GameEvent =
  | HalfInningEvent
  | PitchEvent
  | PlayEvent
  | StolenBaseEvent
  | PickoffEvent
  | SubstitutionEvent

export type GameData = {
  gameId?: string
  date: string
  away: string
  home: string
  finalScore: { away: number; home: number }
  lineScore: { away: (number | null)[]; home: (number | null)[] }
  awayLineup: string[]
  homeLineup: string[]
  events: GameEvent[]
  winPitcher?: string | null
  lossPitcher?: string | null
  savePitcher?: string | null
}

export type LogEntry =
  | { kind: "inning"; label: string }
  | { kind: "pitch"; text: string; isInPlay: boolean }
  | { kind: "play"; text: string; emoji: string; runs: number }
  | { kind: "announce"; text: string; emoji: string }
