export type JblBase = "home" | "first" | "second" | "third"
export type JblRunnerResult = "safe" | "out" | "scored" | "held"
export type JblHalf = "top" | "bottom"

export type JblBases = {
  first: string | null
  second: string | null
  third: string | null
}

export type JblPitchEvent = {
  type: "pitch"
  inning: number
  half: JblHalf
  pitcher: string
  catcher?: string
  batter: string
  pitchType: string
  outcome: string
  ballsBefore: number
  strikesBefore: number
  outsBefore: number
  ballsAfter: number
  strikesAfter: number
  outsAfter: number
  basesBefore: JblBases
  basesAfter: JblBases
  scoreBefore: { away: number; home: number }
  scoreAfter: { away: number; home: number }
  velo?: number
  px?: number
  pz?: number
  mx?: number
  mz?: number
  batHand?: "L" | "R"
  pitchHand?: "L" | "R"
}

export type JblRunnerAdvance = {
  runner: string
  from: JblBase
  to: JblBase
  result: JblRunnerResult
  rbi?: boolean
}

export type JblPlayEvent = {
  type: "play"
  inning: number
  half: JblHalf
  batter: string
  pitcher: string
  result: string
  outsBefore: number
  outsAfter: number
  basesBefore: JblBases
  basesAfter: JblBases
  scoreBefore: { away: number; home: number }
  scoreAfter: { away: number; home: number }
  runsScored: string[]
  rbi: number
  fielder?: string
  fieldersInvolved?: string[]
  throwTo?: JblBase | "pitcher" | "catcher"
  outRunners?: string[]
  runnerAdvances: JblRunnerAdvance[]
  hit?: {
    ev: number
    la: number
    sa: number
    landing?: { x: number; y: number }
    traj: [number, number, number][]
  }
}

export type JblGameEvent =
  | { type: "half_inning"; inning: number; half: JblHalf; score: { away: number; home: number } }
  | JblPitchEvent
  | JblPlayEvent
  | {
      type: "substitution"
      inning: number
      half: JblHalf
      team: string
      subType: "pitching" | "batting" | "defensive"
      playerOut: string
      playerIn: string
      position?: string
    }

export type JblPlayerBoxScore = {
  name: string
  team: string
  age: number
  ab: number
  r: number
  h: number
  rbi: number
  bb: number
  so: number
  hr: number
  runs: number
}

export type JblPitcherBoxScore = {
  name: string
  team: string
  age?: number
  ip: number
  h: number
  r: number
  er: number
  bb: number
  so: number
  hr: number
  pitches: number
  wins: number
  losses: number
  saves: number
}

export type JblGameJson = {
  schemaVersion: 1
  gameId: string
  season: number
  date: string
  venue: string
  away: string
  home: string
  finalScore: { away: number; home: number }
  lineScore: { away: number[]; home: number[] }
  awayLineup: string[]
  homeLineup: string[]
  awayDefense?: Record<string, string>
  homeDefense?: Record<string, string>
  winPitcher?: string | null
  lossPitcher?: string | null
  savePitcher?: string | null
  boxScore: {
    batters: JblPlayerBoxScore[]
    pitchers: JblPitcherBoxScore[]
  }
  events: JblGameEvent[]
}

export type JblSeasonJson = {
  schemaVersion: 1
  season: number
  league: "JBL"
  generatedAt: string
  teams: Array<{
    name: string
    division: string
    color?: { primary: string; secondary: string; accent: string }
    wins: number
    losses: number
    pct: number
    rs: number
    ra: number
    rsPerGame: number
    raPerGame: number
  }>
  players: Array<{
    name: string
    team: string
    age: number
    position?: string
  }>
  battingLeaders: unknown[]
  pitchingLeaders: unknown[]
  schedule: Array<{
    gameId: string
    date: string
    away: string
    home: string
    venue: string
    status: "scheduled" | "final"
    finalScore?: { away: number; home: number }
    gameFile: string
  }>
}
