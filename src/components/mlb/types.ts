export type MLBGame = {
  gamePk: number
  gameDate: string
  status: { detailedState: string; abstractGameState: string }
  venue?: { name: string }
  teams: {
    away: MLBGameTeam
    home: MLBGameTeam
  }
  linescore?: {
    currentInningOrdinal?: string
    inningHalf?: string
    outs?: number
    offense?: {
      first?: { fullName: string }
      second?: { fullName: string }
      third?: { fullName: string }
    }
  }
  decisions?: {
    winner?: { fullName: string }
    loser?: { fullName: string }
    save?: { fullName: string }
  }
}

type MLBGameTeam = {
  team: { id: number; name: string }
  score?: number
  isWinner?: boolean
  probablePitcher?: { fullName: string }
}

export type DivisionRecord = {
  name: string
  teamRecords: Array<{
    team: { id: number; name: string }
    wins: number
    losses: number
    gamesBack: string
    winningPercentage: string
  }>
}

export type MLBTeam = {
  id: number
  name: string
  abbreviation: string
  teamName?: string
  locationName?: string
  sport?: { id: number }
  league?: { id: number; name: string }
  division?: { id: number; name: string }
  venue?: { id: number; name: string }
}

export type RosterPlayer = {
  person: { id: number; fullName: string }
  position: { abbreviation: string }
  jerseyNumber?: string
}

export type GameLogSplit = {
  date: string
  isHome?: boolean
  stat: {
    atBats?: number
    hits?: number
    baseOnBalls?: number
    hitByPitch?: number
    sacFlies?: number
    doubles?: number
    triples?: number
    homeRuns?: number
    rbi?: number
    strikeOuts?: number
    inningsPitched?: string
    earnedRuns?: number
    runs?: number
  }
  opponent?: { name: string }
}

export type MLBTeamStats = {
  hitting: Record<string, number | string>
  pitching: Record<string, number | string>
}
