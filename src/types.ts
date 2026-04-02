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

export type Player = {
  id: string
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

export type SetActiveIndex = React.Dispatch<React.SetStateAction<number>>

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

export type DraftBattingStatEntry = BattingEntryData

export type PlayerGameBattingStat = {
  id: string
  playerId: string
  gameId: string
  ab: number
  h: number
  hr: number
  rbi: number
  bb: number
  so: number
}

export type BattingCalculatedKPI = {
  avg: string
  obp: string
  hr: number
  rbi: number
  gamesPlayed: number
}

export type SavedBattingGameEntry = {
  gameMeta: DraftGameMeta
  statLine: BattingEntryData
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

export type DraftPitchingStatEntry = PitchingEntryData

export type PlayerGamePitchingStat = {
  id: string
  playerId: string
  gameId: string
  outs: number
  hitsAllowed: number
  earnedRuns: number
  walks: number
  strikeouts: number
}

export type PitchingCalculatedKPI = {
  era: string
  whip: string
  strikeouts: number
  inningsPitched: string
  gamesPitched: number
}

export type SavedPitchingGameEntry = {
  gameMeta: DraftGameMeta
  statLine: PitchingEntryData
}