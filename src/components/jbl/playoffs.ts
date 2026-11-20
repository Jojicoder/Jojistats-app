import type { JblStandingLeague, JblTeam } from "../../api/jbl"

// ── Format (MLB style) ───────────────────────────────────────────────────────
// 6 teams: the 3 division winners (seeds 1–3, by record) plus the 3 best
// remaining teams as wild cards (seeds 4–6, by record).
//
//   Wild Card Series (Bo3):      #3 vs #6,  #4 vs #5     (#1, #2 get a bye)
//   Division Series (Bo5):       #1 vs W(#4/#5),  #2 vs W(#3/#6)
//   Championship Series (Bo7):   division series winners
//
// The bracket is fixed (no re-seeding) so it can be drawn as a static tree.
// When the engine has published playoffs.json, its seeds and results win;
// the seeding below is only the fallback before that (it has no head-to-head
// tie-breaker, the engine does).

export type PlayoffSeed = { seed: number; team: JblTeam }

export type PlayoffSeriesResult = {
  id: string
  /** Series wins keyed by team name. Missing = series not played yet. */
  wins?: Record<string, number>
  winner?: string
  /** Game ids (into games/<id>.json) so a series can link to replays. */
  games?: string[]
}

export type PlayoffGameSummary = {
  gameId: string
  date: string
  away: string
  home: string
  venue: string
  status: "final"
  finalScore: { away: number; home: number }
  gameFile: string
  winPitcher: string | null
  lossPitcher: string | null
  savePitcher: string | null
  series: string
  gameNumber: number
}

/** Engine export: public/jbl/seasons/<season>/playoffs.json */
export type PlayoffsJson = {
  schemaVersion: 1
  season: number
  format?: string
  champion?: string
  seeds?: { seed: number; team: string; division: string; wins: number; losses: number; divisionWinner: boolean }[]
  series: PlayoffSeriesResult[]
  games?: PlayoffGameSummary[]
}

export type BracketSlot =
  | { kind: "team"; seed: number; team: JblTeam }
  | { kind: "tbd"; label: string }

export type BracketSeries = {
  id: "wc1" | "wc2" | "sf1" | "sf2" | "final"
  round: "Wild Card Series" | "Division Series" | "Championship Series"
  bestOf: 3 | 5 | 7
  top: BracketSlot
  bottom: BracketSlot
  wins: { top: number; bottom: number }
  winner: "top" | "bottom" | null
  games: string[]
}

export type Bracket = {
  seeds: PlayoffSeed[]
  rounds: { name: string; series: BracketSeries[] }[]
  champion: JblTeam | null
}

function compareRecord(a: JblTeam, b: JblTeam) {
  if (b.pct !== a.pct) return b.pct - a.pct
  if (b.wins !== a.wins) return b.wins - a.wins
  const diffA = a.rs - a.ra
  const diffB = b.rs - b.ra
  if (diffB !== diffA) return diffB - diffA
  return a.name.localeCompare(b.name)
}

/** Division winners take seeds 1–3, the next 3 best records take seeds 4–6. */
export function seedPlayoffTeams(standings: JblStandingLeague[]): PlayoffSeed[] {
  const winners: JblTeam[] = []
  const rest: JblTeam[] = []
  for (const division of standings) {
    const ranked = [...division.teams].filter((team) => team.hasStats).sort(compareRecord)
    if (ranked.length === 0) continue
    winners.push(ranked[0])
    rest.push(...ranked.slice(1))
  }
  winners.sort(compareRecord)
  rest.sort(compareRecord)
  return [...winners, ...rest.slice(0, 3)].map((team, index) => ({ seed: index + 1, team }))
}

/** Seeds exactly as the engine published them (falls back to null if a team is unknown). */
export function seedsFromPlayoffs(
  playoffs: PlayoffsJson,
  standings: JblStandingLeague[],
): PlayoffSeed[] | null {
  if (!playoffs.seeds || playoffs.seeds.length !== 6) return null
  const byName = new Map(standings.flatMap((division) => division.teams).map((team) => [team.name, team]))
  const seeds: PlayoffSeed[] = []
  for (const entry of playoffs.seeds) {
    const team = byName.get(entry.team)
    if (!team) return null
    seeds.push({ seed: entry.seed, team })
  }
  return seeds.sort((a, b) => a.seed - b.seed)
}

const NEEDED = { 3: 2, 5: 3, 7: 4 } as const

export function buildBracket(
  seeds: PlayoffSeed[],
  results: PlayoffsJson | null,
): Bracket {
  const bySeed = (n: number): BracketSlot => {
    const found = seeds.find((s) => s.seed === n)
    return found ? { kind: "team", seed: found.seed, team: found.team } : { kind: "tbd", label: `Seed ${n}` }
  }
  const resultById = new Map((results?.series ?? []).map((r) => [r.id, r]))

  const make = (
    id: BracketSeries["id"],
    round: BracketSeries["round"],
    bestOf: BracketSeries["bestOf"],
    top: BracketSlot,
    bottom: BracketSlot,
  ): BracketSeries => {
    const result = resultById.get(id)
    const topName = top.kind === "team" ? top.team.name : null
    const bottomName = bottom.kind === "team" ? bottom.team.name : null
    const topWins = topName ? result?.wins?.[topName] ?? 0 : 0
    const bottomWins = bottomName ? result?.wins?.[bottomName] ?? 0 : 0
    let winner: BracketSeries["winner"] = null
    if (result?.winner && result.winner === topName) winner = "top"
    else if (result?.winner && result.winner === bottomName) winner = "bottom"
    else if (topWins >= NEEDED[bestOf]) winner = "top"
    else if (bottomWins >= NEEDED[bestOf]) winner = "bottom"
    return { id, round, bestOf, top, bottom, wins: { top: topWins, bottom: bottomWins }, winner, games: result?.games ?? [] }
  }

  const advance = (series: BracketSeries, fallback: string): BracketSlot => {
    if (!series.winner) return { kind: "tbd", label: fallback }
    const slot = series[series.winner]
    return slot
  }

  const wc1 = make("wc1", "Wild Card Series", 3, bySeed(3), bySeed(6))
  const wc2 = make("wc2", "Wild Card Series", 3, bySeed(4), bySeed(5))
  const sf1 = make("sf1", "Division Series", 5, bySeed(1), advance(wc2, "Winner #4/#5"))
  const sf2 = make("sf2", "Division Series", 5, bySeed(2), advance(wc1, "Winner #3/#6"))
  const final = make("final", "Championship Series", 7, advance(sf1, "Winner DS1"), advance(sf2, "Winner DS2"))

  const champSlot = final.winner ? final[final.winner] : null
  return {
    seeds,
    rounds: [
      { name: "Wild Card Series · Bo3", series: [wc1, wc2] },
      { name: "Division Series · Bo5", series: [sf1, sf2] },
      { name: "Championship Series · Bo7", series: [final] },
    ],
    champion: champSlot && champSlot.kind === "team" ? champSlot.team : null,
  }
}
