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
  person: {
    id: number
    fullName: string
    batSide?: { code: "R" | "L" | "S" }
    pitchHand?: { code: "R" | "L" }
  }
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
    battersFaced?: number
    saves?: number
    holds?: number
  }
  opponent?: { name: string }
}

export type MLBTeamStats = {
  hitting: Record<string, number | string>
  pitching: Record<string, number | string>
}

export type MLBPlayEvent = {
  index?: number
  isPitch?: boolean
  type?: string
  details?: {
    call?: {
      code?: string
      description?: string
    }
    description?: string
    event?: string
    eventType?: string
    code?: string
    isBall?: boolean
    isStrike?: boolean
    isInPlay?: boolean
    type?: {
      code?: string
      description?: string
    }
  }
  count?: {
    balls?: number
    strikes?: number
    outs?: number
  }
  pitchData?: {
    startSpeed?: number
    endSpeed?: number
    strikeZoneTop?: number
    strikeZoneBottom?: number
    coordinates?: {
      pX?: number
      pZ?: number
    }
    breaks?: {
      spinRate?: number
    }
  }
  hitData?: {
    launchSpeed?: number
    launchAngle?: number
    totalDistance?: number
  }
}

export type MLBPlay = {
  atBatIndex?: number
  result?: {
    type?: string
    event?: string
    eventType?: string
    description?: string
    rbi?: number
    awayScore?: number
    homeScore?: number
  }
  about?: {
    inning?: number
    halfInning?: string
    isTopInning?: boolean
    isComplete?: boolean
  }
  count?: {
    balls?: number
    strikes?: number
    outs?: number
  }
  matchup?: {
    batter?: { id?: number; fullName?: string }
    pitcher?: { id?: number; fullName?: string }
    batSide?: { code?: string; description?: string }
    pitchHand?: { code?: string; description?: string }
  }
  playEvents?: MLBPlayEvent[]
  runners?: Array<{
    movement?: {
      start?: string | null
      end?: string | null
      isOut?: boolean
    }
    details?: {
      runner?: { id?: number; fullName?: string }
      isScoringEvent?: boolean
      rbi?: boolean
    }
  }>
}

export type MLBOffense = {
  batter?: { id?: number; fullName?: string }
  onDeck?: { id?: number; fullName?: string }
  inHole?: { id?: number; fullName?: string }
  first?: { id?: number; fullName?: string }
  second?: { id?: number; fullName?: string }
  third?: { id?: number; fullName?: string }
}

export type MLBBoxscorePlayer = {
  person?: { id?: number; fullName?: string }
  jerseyNumber?: string
  position?: { abbreviation?: string }
  battingOrder?: string
  stats?: {
    batting?: {
      atBats?: number
      hits?: number
      rbi?: number
      baseOnBalls?: number
      strikeOuts?: number
      homeRuns?: number
    }
    pitching?: {
      inningsPitched?: string
      earnedRuns?: number
      strikeOuts?: number
      baseOnBalls?: number
    }
  }
  seasonStats?: {
    batting?: {
      avg?: string
      obp?: string
      ops?: string
      homeRuns?: number
      rbi?: number
    }
    pitching?: {
      era?: string
      whip?: string
      wins?: number
      losses?: number
      strikeOuts?: number
    }
  }
}

export type MLBGameLiveFeed = {
  gamePk: number
  gameData?: {
    status?: {
      abstractGameState?: string
      detailedState?: string
    }
    teams?: {
      away?: {
        id?: number
        name?: string
        teamName?: string
        abbreviation?: string
      }
      home?: {
        id?: number
        name?: string
        teamName?: string
        abbreviation?: string
      }
    }
    datetime?: {
      dateTime?: string
      originalDate?: string
      dayNight?: string
    }
    venue?: {
      name?: string
    }
    probablePitchers?: {
      away?: { id?: number; fullName?: string }
      home?: { id?: number; fullName?: string }
    }
  }
  liveData?: {
    linescore?: {
      currentInning?: number
      currentInningOrdinal?: string
      inningHalf?: string
      isTopInning?: boolean
      outs?: number
      balls?: number
      strikes?: number
      teams?: {
        away?: { runs?: number; hits?: number; errors?: number }
        home?: { runs?: number; hits?: number; errors?: number }
      }
      innings?: Array<{
        num?: number
        ordinalNum?: string
        away?: { runs?: number; hits?: number; errors?: number }
        home?: { runs?: number; hits?: number; errors?: number }
      }>
      offense?: MLBOffense
      defense?: {
        pitcher?: { id?: number; fullName?: string }
      }
    }
    plays?: {
      currentPlay?: MLBPlay
      allPlays?: MLBPlay[]
    }
    decisions?: {
      winner?: { id?: number; fullName?: string }
      loser?: { id?: number; fullName?: string }
      save?: { id?: number; fullName?: string }
    }
    boxscore?: {
      teams?: {
        away?: { players?: Record<string, MLBBoxscorePlayer>; battingOrder?: number[] }
        home?: { players?: Record<string, MLBBoxscorePlayer>; battingOrder?: number[] }
      }
    }
  }
}
