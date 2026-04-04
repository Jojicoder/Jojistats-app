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
}

export type Player = {
  id: string
  teamId: string
  name: string
  position: Position
  jerseyNumber?: number | null
  isActive?: boolean
}

export type TrendPoint = {
  game: string
  value: string
}

export type DraftGameMeta = {
  date: string
  opponent: string
  seasonYear: number
  matchNumber: number
}

export type DisplayStat = {
  label: string
  value: string
}

/* ========================================
   Batting Types
======================================== */

export type BattingEntryData = {
  AB: number
  H: number
  HR: number
  RBI: number
  BB: number
  SO: number
}

export type SavedBattingGameEntry = {
  teamId: string
  gameMeta: DraftGameMeta
  statLine: BattingEntryData
}

export type BattingCalculatedKPI = {
  avg: string
  obp: string
  hr: number
  rbi: number
  gamesPlayed: number
}

/* ========================================
   Pitching Types
======================================== */

export type PitchingEntryData = {
  outs: number
  hitsAllowed: number
  earnedRuns: number
  walks: number
  strikeouts: number
}

export type SavedPitchingGameEntry = {
  gameMeta: DraftGameMeta
  statLine: PitchingEntryData
}

export type PitchingCalculatedKPI = {
  era: string
  whip: string
  strikeouts: number
  inningsPitched: string
  gamesPitched: number
}