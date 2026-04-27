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
}

export type Player = {
  id: string
  teamId: string
  name: string
  position: Position
  jerseyNumber?: number | null
  seasonYear: number
  isArchived?: boolean
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

export type BattingEntryData = {
  AB: number
  H: number
  doubles: number
  triples: number
  HR: number
  RBI: number
  BB: number
  SO: number
  note: string
}

export type PendingBattingEntry = BattingEntryData & {
  playerId: string
  playerName: string
  gamePositions: Position[]
}

export type SavedBattingGameEntry = {
  id: string
  gameId: number
  teamId: string
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
  gamesPlayed: number
}

export type PitchingEntryData = {
  inningsPitchedOuts: number
  hitsAllowed: number
  runsAllowed: number
  earnedRuns: number
  walks: number
  strikeouts: number
  homeRunsAllowed: number
}

export type SavedPitchingGameEntry = {
  id: string
  teamId: string
  playerId: string
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
