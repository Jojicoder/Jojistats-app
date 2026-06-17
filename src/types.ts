import type { LeagueKey } from "./config/leagueConfig"
export type { LeagueKey } from "./config/leagueConfig"

export type Position =
  | "P"
  | "C"
  | "1B"
  | "2B"
  | "3B"
  | "SS"
  | "LF"
  | "CF"
  | "RF"
  | "DH"
  | "UTIL"

export type Team = {
  id: string
  name: string
  isArchived?: boolean
  currentSeasonYear: number
  league: LeagueKey | null
}

export type PitchingRole = "starter" | "reliever" | "closer"

export type Player = {
  id: string
  teamId: string
  name: string
  positions: Position[]
  jerseyNumber?: number | null
  seasonYear: number
  isArchived?: boolean
  pitchingRole?: PitchingRole | null
}

export type TrendPoint = {
  game: string
  value: string
}

export type DraftGameMeta = {
  date: string
  opponent: string
  location?: string
  seasonYear: number
  matchNumber: number
  memo?: string
  teamScore?: number | null
  opponentScore?: number | null
  result?: "W" | "L" | "T" | ""
  errorRuns?: number | null
}

export type DisplayStat = {
  label: string
  value: string
}

export type BattingEntryData = {
  AB: number
  H: number
  doubles: number
  triples: number
  HR: number
  RBI: number
  BB: number
  HBP: number
  SF: number
  SO: number
  SB: number
  CS: number
  note: string
}

export type PendingBattingEntry = BattingEntryData & {
  playerId: string
  playerName: string
  gamePositions: Position[]
}

export type PendingPitchingEntry = PitchingEntryData & {
  playerId: string
  playerName: string
}

export type SavedBattingGameEntry = {
  id: string
  statId: number
  gameId: number
  teamId: string
  playerId: string
  gameMeta: DraftGameMeta
  gamePositions: Position[]
  statLine: BattingEntryData
}

export type BattingCalculatedKPI = {
  avg: string
  obp: string
  slg: string
  ops: string
  iso: string
  bbPerK: string
  hr: number
  rbi: number
  hbp: number
  sb: number
  cs: number
  sbPct: string
  gamesPlayed: number
}

export type PitchingEntryData = {
  inningsPitchedOuts: number
  hitsAllowed: number
  runsAllowed: number
  earnedRuns: number
  walks: number
  hitBatters: number
  strikeouts: number
  homeRunsAllowed: number
  note: string
}

export type SavedPitchingGameEntry = {
  id: string
  statId: number
  gameId: number
  teamId: string
  playerId: string
  gameMeta: DraftGameMeta
  statLine: PitchingEntryData
}

export type UserAccess = {
  id: string
  email: string
  teamId: string
  playerId: string
  role: "player" | "recorder" | "manager" | "admin"
  isActive: boolean
}

export type PitchingCalculatedKPI = {
  era: string
  whip: string
  strikeouts: number
  inningsPitched: string
  gamesPitched: number
}
