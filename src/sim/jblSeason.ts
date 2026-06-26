// jblSeason.ts — In-browser JBL season simulator

// ── Constants ──────────────────────────────────────────────────────────────

export const DIVISIONS: Record<string, string[]> = {
  north: [
    "Newark Knights",
    "Queens Titans",
    "Brooklyn Hammers",
    "Bronx Wolves",
    "Harlem Eagles",
    "Staten Island Foxes",
  ],
  mid: [
    "Fishtown Ferals",
    "Kensington Iron",
    "Germantown Colonials",
    "Manayunk Runners",
    "Fairmount Rams",
    "South Philly Stallions",
  ],
  south: [
    "Georgetown Ravens",
    "Capitol Hill Senators",
    "Anacostia Kings",
    "Alexandria Cannons",
    "Bethesda Blaze",
    "Silver Spring Ghosts",
  ],
}

export const DIVISION_NAMES: Record<string, string> = {
  north: "North Division",
  mid: "Mid Division",
  south: "South Division",
}

export const ALL_TEAMS = [...DIVISIONS.north, ...DIVISIONS.mid, ...DIVISIONS.south]

// Per-team quality ratings (reflect C++ engine player ratings)
// offRating = expected runs scored per game
// defRating = expected runs allowed per game
// These create realistic competitive balance
type TeamRating = { off: number; def: number }

const TEAM_RATINGS: Record<string, TeamRating> = {
  // North — NY Metro
  "Newark Knights":         { off: 4.85, def: 3.90 }, // balanced contender
  "Queens Titans":          { off: 4.60, def: 4.10 }, // solid
  "Brooklyn Hammers":       { off: 4.70, def: 4.00 }, // good
  "Bronx Wolves":           { off: 5.10, def: 3.75 }, // powerhouse
  "Harlem Eagles":          { off: 4.40, def: 4.35 }, // fringe
  "Staten Island Foxes":    { off: 4.15, def: 4.75 }, // young, rebuilding
  // Mid — Philadelphia
  "Fishtown Ferals":        { off: 4.65, def: 4.05 }, // good
  "Kensington Iron":        { off: 4.75, def: 4.15 }, // above avg
  "Germantown Colonials":   { off: 4.40, def: 4.45 }, // average
  "Manayunk Runners":       { off: 4.30, def: 4.30 }, // contact/speed, low power
  "Fairmount Rams":         { off: 4.20, def: 4.60 }, // below avg
  "South Philly Stallions": { off: 4.05, def: 4.90 }, // rebuilding
  // South — DC/MD/VA
  "Georgetown Ravens":      { off: 4.90, def: 3.95 }, // contender
  "Capitol Hill Senators":  { off: 4.55, def: 4.20 }, // solid
  "Anacostia Kings":        { off: 4.75, def: 4.05 }, // good
  "Alexandria Cannons":     { off: 4.50, def: 4.50 }, // average
  "Bethesda Blaze":         { off: 4.35, def: 4.55 }, // below avg
  "Silver Spring Ghosts":   { off: 3.95, def: 3.90 }, // pitching-first
}

// ── RNG ─────────────────────────────────────────────────────────────────────

// Simple xorshift32 seeded RNG
function makeRng(seed: number) {
  let s = seed >>> 0 || 1
  return () => {
    s ^= s << 13
    s ^= s >>> 17
    s ^= s << 5
    return (s >>> 0) / 4294967296
  }
}

// Approximately normal(mu, sigma) via Box-Muller
function normalSample(rng: () => number, mu: number, sigma: number): number {
  const u1 = Math.max(rng(), 1e-10)
  const u2 = rng()
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2)
  return mu + sigma * z
}

// Sample from a Poisson-like run distribution
// Baseball runs are approximately Poisson but with extra variance.
// We use a Normal approximation clamped at 0, which is good enough.
function sampleRuns(rng: () => number, expected: number): number {
  const sample = normalSample(rng, expected, Math.sqrt(expected) * 1.1)
  return Math.max(0, Math.round(sample))
}

// ── Schedule generation ──────────────────────────────────────────────────────

export type ScheduledGame = {
  date: string
  away: string
  home: string
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000)
}

export function generateSchedule(year = 2026): ScheduledGame[] {
  const seasonStart = `${year}-04-03`
  const seasonEnd   = `${year}-09-25`
  const totalDays   = daysBetween(seasonStart, seasonEnd) // ~175 days

  // Build matchup list:
  //  - 18 games vs each division opponent (9 home + 9 away)
  //  - 6 games vs each cross-division opponent (3 home + 3 away)
  const matchups: Array<{ home: string; away: string; count: number }> = []

  for (const div of Object.values(DIVISIONS)) {
    for (let i = 0; i < div.length; i++) {
      for (let j = i + 1; j < div.length; j++) {
        matchups.push({ home: div[i], away: div[j], count: 9 })
        matchups.push({ home: div[j], away: div[i], count: 9 })
      }
    }
  }

  const divKeys = Object.keys(DIVISIONS)
  for (let di = 0; di < divKeys.length; di++) {
    for (let dj = di + 1; dj < divKeys.length; dj++) {
      const a = DIVISIONS[divKeys[di]]
      const b = DIVISIONS[divKeys[dj]]
      for (const ta of a) {
        for (const tb of b) {
          matchups.push({ home: ta, away: tb, count: 3 })
          matchups.push({ home: tb, away: ta, count: 3 })
        }
      }
    }
  }

  // Expand into individual games
  const rawGames: Array<{ home: string; away: string }> = []
  for (const m of matchups) {
    for (let k = 0; k < m.count; k++) {
      rawGames.push({ home: m.home, away: m.away })
    }
  }

  // Shuffle and spread across season dates
  // Use a simple Fisher-Yates shuffle with a fixed seed for reproducibility
  const rng = makeRng(year * 31337)
  for (let i = rawGames.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [rawGames[i], rawGames[j]] = [rawGames[j], rawGames[i]]
  }

  // Assign dates: spread games as evenly as possible
  // Each day has ~15 games (18 teams / 2 = 9 matchups/day but teams play every day)
  const schedule: ScheduledGame[] = []
  for (let i = 0; i < rawGames.length; i++) {
    const fraction = i / rawGames.length
    const dayOffset = Math.min(Math.floor(fraction * totalDays), totalDays)
    schedule.push({ date: addDays(seasonStart, dayOffset), ...rawGames[i] })
  }

  schedule.sort((a, b) => a.date.localeCompare(b.date))
  return schedule
}

// ── Game simulation ───────────────────────────────────────────────────────────

export type GameResult = {
  date: string
  away: string
  home: string
  awayRuns: number
  homeRuns: number
}

function simulateGame(
  rng: () => number,
  away: string,
  home: string,
  date: string,
): GameResult {
  const a = TEAM_RATINGS[away] ?? { off: 4.5, def: 4.5 }
  const h = TEAM_RATINGS[home] ?? { off: 4.5, def: 4.5 }

  // Home advantage: home team scores ~3% more
  const homeAdv = 1.03

  // Expected runs = geometric mean of offense × opposing defense factor
  const lgAvg = 4.5
  const awayExpected = (a.off / lgAvg) * (h.def / lgAvg) * lgAvg
  const homeExpected = (h.off / lgAvg) * (a.def / lgAvg) * lgAvg * homeAdv

  let awayRuns = sampleRuns(rng, awayExpected)
  let homeRuns = sampleRuns(rng, homeExpected)

  // No ties — if tied, play "extra innings" (coin-flip run)
  if (awayRuns === homeRuns) {
    if (rng() < 0.5) { awayRuns++ } else { homeRuns++ }
  }

  return { date, away, home, awayRuns, homeRuns }
}

// ── Season record ─────────────────────────────────────────────────────────────

export type TeamRecord = {
  name: string
  division: string
  wins: number
  losses: number
  rs: number
  ra: number
  pct: number
  gb: number
  streak: number       // positive = win streak, negative = loss streak
  last10W: number
  last10L: number
  homeWins: number
  homeLosses: number
  awayWins: number
  awayLosses: number
  divWins: number
  divLosses: number
}

function divisionOf(name: string): string {
  for (const [key, teams] of Object.entries(DIVISIONS)) {
    if (teams.includes(name)) return key
  }
  return "unknown"
}

// ── Full season simulation ────────────────────────────────────────────────────

export type SeasonResult = {
  seed: number
  year: number
  records: TeamRecord[]
  divisionStandings: Record<string, TeamRecord[]>
  results: GameResult[]
  schedule: ScheduledGame[]
  playoffs: PlayoffBracket
}

export type PlayoffSeed = {
  seed: number
  team: string
  record: string
  qualifier: "div" | "wc"
}

export type PlayoffSeries = {
  higher: string
  lower: string
  higherWins: number
  lowerWins: number
  winner: string | null
  games: number
  format: number  // best-of-N
}

export type PlayoffBracket = {
  seeds: PlayoffSeed[]
  wildCardRound: PlayoffSeries[]
  semifinal: PlayoffSeries[]
  final: PlayoffSeries | null
  champion: string | null
}

function simulateSeries(
  rng: () => number,
  teamA: string,
  teamB: string,
  bestOf: number,
): { winner: string; loser: string; winsA: number; winsB: number } {
  const needed = Math.ceil(bestOf / 2)
  let winsA = 0
  let winsB = 0

  while (winsA < needed && winsB < needed) {
    const result = simulateGame(rng, teamA, teamB, "")
    if (result.awayRuns > result.homeRuns) winsA++
    else winsB++
  }

  return winsA >= needed
    ? { winner: teamA, loser: teamB, winsA, winsB }
    : { winner: teamB, loser: teamA, winsA, winsB }
}

function simulatePlayoffs(
  rng: () => number,
  divStandings: Record<string, TeamRecord[]>,
  allRecords: TeamRecord[],
): PlayoffBracket {
  // Pick 3 division champs + 3 best remaining wild cards
  const divChamps = Object.values(divStandings).map((t) => t[0].name)

  const wildCardCandidates = allRecords
    .filter((r) => !divChamps.includes(r.name))
    .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    .slice(0, 3)
    .map((r) => r.name)

  const getRecord = (name: string) => {
    const r = allRecords.find((x) => x.name === name)
    return r ? `${r.wins}-${r.losses}` : ""
  }

  // Seed: 1-3 = div champs by record, 4-6 = wild cards by record
  const sortedChamps = divChamps
    .map((n) => allRecords.find((r) => r.name === n)!)
    .sort((a, b) => b.wins - a.wins)
    .map((r) => r.name)

  const seeds: PlayoffSeed[] = [
    ...sortedChamps.map((t, i) => ({ seed: i + 1, team: t, record: getRecord(t), qualifier: "div" as const })),
    ...wildCardCandidates.map((t, i) => ({ seed: i + 4, team: t, record: getRecord(t), qualifier: "wc" as const })),
  ]

  const bySeeed = (n: number) => seeds[n - 1].team

  // Wild Card Round: #4 vs #5, #3 vs #6 (best-of-3)
  const wc1 = simulateSeries(rng, bySeeed(5), bySeeed(4), 3)
  const wc2 = simulateSeries(rng, bySeeed(6), bySeeed(3), 3)

  const wildCardRound: PlayoffSeries[] = [
    { higher: bySeeed(4), lower: bySeeed(5), higherWins: wc1.winsB, lowerWins: wc1.winsA, winner: wc1.winner, games: wc1.winsA + wc1.winsB, format: 3 },
    { higher: bySeeed(3), lower: bySeeed(6), higherWins: wc2.winsB, lowerWins: wc2.winsA, winner: wc2.winner, games: wc2.winsA + wc2.winsB, format: 3 },
  ]

  // Semifinal: #1 vs WC winner 1, #2 vs WC winner 2 (best-of-5)
  const sf1 = simulateSeries(rng, wc1.winner, bySeeed(1), 5)
  const sf2 = simulateSeries(rng, wc2.winner, bySeeed(2), 5)

  const sfHigher1Wins = sf1.winner === bySeeed(1) ? sf1.winsB : sf1.winsA
  const sfLower1Wins  = sf1.winner === wc1.winner ? sf1.winsA : sf1.winsB
  const sfHigher2Wins = sf2.winner === bySeeed(2) ? sf2.winsB : sf2.winsA
  const sfLower2Wins  = sf2.winner === wc2.winner ? sf2.winsA : sf2.winsB

  const semifinal: PlayoffSeries[] = [
    { higher: bySeeed(1), lower: wc1.winner, higherWins: sfHigher1Wins, lowerWins: sfLower1Wins, winner: sf1.winner, games: sf1.winsA + sf1.winsB, format: 5 },
    { higher: bySeeed(2), lower: wc2.winner, higherWins: sfHigher2Wins, lowerWins: sfLower2Wins, winner: sf2.winner, games: sf2.winsA + sf2.winsB, format: 5 },
  ]

  // JBL Championship Series (best-of-7)
  const champ = simulateSeries(rng, sf1.winner, sf2.winner, 7)
  const finalHigher = [sf1.winner, sf2.winner].sort((a, b) => {
    const ra = allRecords.find((r) => r.name === a)!
    const rb = allRecords.find((r) => r.name === b)!
    return rb.wins - ra.wins
  })[0]
  const finalLower = finalHigher === sf1.winner ? sf2.winner : sf1.winner
  const finalHigherWins = champ.winner === finalHigher ? champ.winsA : champ.winsB
  const finalLowerWins  = champ.winner === finalLower  ? champ.winsA : champ.winsB

  const final: PlayoffSeries = {
    higher: finalHigher,
    lower: finalLower,
    higherWins: finalHigherWins,
    lowerWins: finalLowerWins,
    winner: champ.winner,
    games: champ.winsA + champ.winsB,
    format: 7,
  }

  return { seeds, wildCardRound, semifinal, final, champion: champ.winner }
}

// ── Public API ────────────────────────────────────────────────────────────────

export function simulateSeason(seed?: number, year = 2026): SeasonResult {
  const usedSeed = seed ?? (Math.random() * 0xffffffff) >>> 0
  const rng = makeRng(usedSeed)

  const schedule = generateSchedule(year)

  // Initialize records
  const records: Record<string, TeamRecord> = {}
  for (const name of ALL_TEAMS) {
    records[name] = {
      name,
      division: divisionOf(name),
      wins: 0, losses: 0, rs: 0, ra: 0,
      pct: 0, gb: 0,
      streak: 0,
      last10W: 0, last10L: 0,
      homeWins: 0, homeLosses: 0,
      awayWins: 0, awayLosses: 0,
      divWins: 0, divLosses: 0,
    }
  }

  // Track last 10 game results per team
  const last10: Record<string, boolean[]> = {}
  for (const name of ALL_TEAMS) last10[name] = []

  const results: GameResult[] = []

  for (const game of schedule) {
    const result = simulateGame(rng, game.away, game.home, game.date)
    results.push(result)

    const awayWon = result.awayRuns > result.homeRuns
    const ar = records[game.away]
    const hr = records[game.home]

    if (awayWon) {
      ar.wins++; hr.losses++
      ar.streak = ar.streak > 0 ? ar.streak + 1 : 1
      hr.streak = hr.streak < 0 ? hr.streak - 1 : -1
    } else {
      hr.wins++; ar.losses++
      hr.streak = hr.streak > 0 ? hr.streak + 1 : 1
      ar.streak = ar.streak < 0 ? ar.streak - 1 : -1
    }

    ar.rs += result.awayRuns; ar.ra += result.homeRuns
    hr.rs += result.homeRuns; hr.ra += result.awayRuns
    ar.awayWins  += awayWon ? 1 : 0; ar.awayLosses  += awayWon ? 0 : 1
    hr.homeWins  += awayWon ? 0 : 1; hr.homeLosses  += awayWon ? 1 : 0

    const sameDiv = ar.division === hr.division
    if (sameDiv) {
      if (awayWon) { ar.divWins++; hr.divLosses++ }
      else         { hr.divWins++; ar.divLosses++ }
    }

    const updateLast10 = (rec: TeamRecord, name: string, won: boolean) => {
      last10[name].push(won)
      if (last10[name].length > 10) last10[name].shift()
      rec.last10W = last10[name].filter(Boolean).length
      rec.last10L = last10[name].filter((x) => !x).length
    }
    updateLast10(ar, game.away, awayWon)
    updateLast10(hr, game.home, !awayWon)
  }

  // PCT + division standings
  const recordList = ALL_TEAMS.map((n) => records[n])
  for (const r of recordList) {
    r.pct = r.wins / (r.wins + r.losses) || 0
  }

  const divisionStandings: Record<string, TeamRecord[]> = {}
  for (const [divKey, teams] of Object.entries(DIVISIONS)) {
    const sorted = teams
      .map((n) => records[n])
      .sort((a, b) => b.wins - a.wins || a.losses - b.losses)
    const leader = sorted[0]
    for (let i = 0; i < sorted.length; i++) {
      sorted[i].gb = i === 0 ? 0 : ((leader.wins - sorted[i].wins) + (sorted[i].losses - leader.losses)) / 2
    }
    divisionStandings[divKey] = sorted
  }

  const allSorted = [...recordList].sort((a, b) => b.wins - a.wins || a.losses - b.losses)

  const playoffs = simulatePlayoffs(rng, divisionStandings, recordList)

  return {
    seed: usedSeed,
    year,
    records: allSorted,
    divisionStandings,
    results,
    schedule,
    playoffs,
  }
}
