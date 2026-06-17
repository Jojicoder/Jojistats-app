import type { Player, Position, BattingEntryData, PitchingEntryData, DraftGameMeta, PendingBattingEntry, PendingPitchingEntry } from "../types"
import type { BasesState, GameHalf, LivePlay, LivePitchPlay, LivePlayResult, LivePitchResult } from "./RecordGamePage.types"

export const emptyBases: BasesState = {
  first: false,
  second: false,
  third: false,
}

export const gamePositionOptions: Position[] = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","DH","UTIL",
]

export const liveResultLabels: { result: LivePlayResult; label: string }[] = [
  { result: "1B", label: "Single" },
  { result: "2B", label: "Double" },
  { result: "3B", label: "Triple" },
  { result: "HR", label: "HR" },
  { result: "BB", label: "Walk" },
  { result: "HBP", label: "Hit By Pitch" },
  { result: "SF", label: "Sac Fly" },
  { result: "SO", label: "Strikeout" },
  { result: "OUT", label: "Out" },
  { result: "E", label: "Error" },
  { result: "FC", label: "FC Safe" },
  { result: "FC_OUT_2B", label: "FC Out (2B)" },
  { result: "FC_OUT_3B", label: "FC Out (3B)" },
]

export const livePitchResultLabels: { result: LivePitchResult; label: string }[] = [
  { result: "OUT", label: "Out" },
  { result: "SO", label: "Strikeout" },
  { result: "BB", label: "Walk" },
  { result: "HBP", label: "Hit By Pitch" },
  { result: "HR", label: "HR Allowed" },
]

export function createEmptyBattingLine(): BattingEntryData {
  return {
    AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "",
  }
}

export function createEmptyPitchingLine(): PitchingEntryData {
  return {
    inningsPitchedOuts: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    hitBatters: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    note: "",
  }
}

export function buildLiveStatLine(result: LivePlayResult, rbi: number): BattingEntryData {
  const statLine = createEmptyBattingLine()
  statLine.RBI = rbi

  if (result === "BB") { statLine.BB = 1; return statLine }
  if (result === "HBP") { statLine.HBP = 1; return statLine }
  if (result === "SF") { statLine.SF = 1; return statLine }

  statLine.AB = 1
  if (result === "SO") { statLine.SO = 1; return statLine }
  if (result === "1B") statLine.H = 1
  if (result === "2B") { statLine.H = 1; statLine.doubles = 1 }
  if (result === "3B") { statLine.H = 1; statLine.triples = 1 }
  if (result === "HR") { statLine.H = 1; statLine.HR = 1 }

  return statLine
}

export function isOutResult(result: LivePlayResult) {
  return result === "SO" || result === "OUT" || result === "SF" || result === "FC_OUT_2B" || result === "FC_OUT_3B"
}

export function isPitchOutResult(result: LivePitchResult) {
  return result === "OUT" || result === "SO"
}

export function getNextHalfInning(inning: number, half: GameHalf) {
  if (half === "Top") return { inning, half: "Bottom" as GameHalf }
  return { inning: inning + 1, half: "Top" as GameHalf }
}

export function countBases(bases: BasesState) {
  return Number(bases.first) + Number(bases.second) + Number(bases.third)
}

export function isBasesLoaded(bases: BasesState) {
  return bases.first && bases.second && bases.third
}

export function removeScoredRunners(bases: BasesState, runs: number): BasesState {
  const next = { ...bases }
  let remaining = Math.max(0, runs)
  if (remaining > 0 && next.third) { next.third = false; remaining -= 1 }
  if (remaining > 0 && next.second) { next.second = false; remaining -= 1 }
  if (remaining > 0 && next.first) { next.first = false }
  return next
}

export function advanceBasesByHit(
  bases: BasesState,
  basesTaken: 1 | 2 | 3 | 4,
  runsDrivenIn: number
): BasesState {
  if (basesTaken === 4) return { ...emptyBases }

  const occupiedBases = [
    bases.third ? 3 : null,
    bases.second ? 2 : null,
    bases.first ? 1 : null,
  ].filter((base): base is 1 | 2 | 3 => base != null)
  const scoredBases = new Set(occupiedBases.slice(0, Math.min(runsDrivenIn, occupiedBases.length)))
  const next = { ...emptyBases }

  occupiedBases.forEach((base) => {
    if (scoredBases.has(base)) return
    const destination = Math.min(base + basesTaken, 3)
    if (destination === 1) next.first = true
    if (destination === 2) next.second = true
    if (destination === 3) next.third = true
  })

  if (basesTaken === 1) next.first = true
  if (basesTaken === 2) next.second = true
  if (basesTaken === 3) next.third = true

  return next
}

export function advanceBasesByWalk(bases: BasesState): BasesState {
  return {
    first: true,
    second: bases.first ? true : bases.second,
    third: bases.first && bases.second ? true : bases.third,
  }
}

export function nextBasesForBatting(bases: BasesState, result: LivePlayResult, rbi: number): BasesState {
  if (result === "1B") return advanceBasesByHit(bases, 1, rbi)
  if (result === "2B") return advanceBasesByHit(bases, 2, rbi)
  if (result === "3B") return advanceBasesByHit(bases, 3, rbi)
  if (result === "HR") return { ...emptyBases }
  if (result === "BB" || result === "HBP") return advanceBasesByWalk(bases)
  if (result === "E") return { ...removeScoredRunners(bases, bases.third ? 1 : 0), first: true }
  if (result === "FC") return { ...removeScoredRunners(bases, rbi), first: true }
  // FC Out (2B): force play at 2nd - runner from 1st is out, runner on 2nd advances to 3rd, batter safe at 1st
  if (result === "FC_OUT_2B") {
    const afterScore = removeScoredRunners(bases, rbi)
    return {
      first: true,
      second: false,
      third: afterScore.third || (bases.first ? afterScore.second : false),
    }
  }
  // FC Out (3B): runner on 3rd is out (no RBI), 2nd runner stays, batter safe at 1st
  if (result === "FC_OUT_3B") return { first: true, second: bases.second, third: false }
  return removeScoredRunners(bases, rbi)
}

export function estimateRunsForBatting(bases: BasesState, result: LivePlayResult, rbi: number) {
  if (result === "E") return bases.third ? 1 : 0
  if (result === "SF") return bases.third ? 1 : 0
  if (result === "FC" || result === "FC_OUT_2B") return Number(bases.third)
  if (result === "FC_OUT_3B") return 0
  if (result === "HR") return countBases(bases) + 1
  if (result === "BB" || result === "HBP") return isBasesLoaded(bases) ? 1 : 0
  return rbi
}

export function estimateRbiForBatting(bases: BasesState, result: LivePlayResult) {
  if (result === "HR") return countBases(bases) + 1
  if (result === "3B") return countBases(bases)
  if (result === "2B") return Number(bases.second) + Number(bases.third)
  if (result === "1B") return Number(bases.third)
  if (result === "SF") return bases.third ? 1 : 0
  if (result === "BB" || result === "HBP") return isBasesLoaded(bases) ? 1 : 0
  if (result === "FC" || result === "FC_OUT_2B") return Number(bases.third)
  if (result === "FC_OUT_3B") return 0
  return 0
}

export function nextBasesForPitching(bases: BasesState, result: LivePitchResult): BasesState {
  if (result === "H") return advanceBasesByHit(bases, 1, 0)
  if (result === "2B") return advanceBasesByHit(bases, 2, 0)
  if (result === "3B") return advanceBasesByHit(bases, 3, countBases(bases))
  if (result === "BB" || result === "HBP") return advanceBasesByWalk(bases)
  if (result === "E") return advanceBasesByHit(bases, 1, 0)
  if (result === "HR") return { ...emptyBases }
  if (result === "R" || result === "ER") return bases
  return bases
}

export function estimateRunsForPitching(bases: BasesState, result: LivePitchResult) {
  if (result === "R" || result === "ER") return 1
  if (result === "HR") return countBases(bases) + 1
  if (result === "3B") return countBases(bases)
  if (result === "BB" || result === "HBP") return isBasesLoaded(bases) ? 1 : 0
  return 0
}

export function estimateEarnedRunsForPitching(bases: BasesState, result: LivePitchResult) {
  if (result === "ER") return 1
  if (result === "HR") return estimateRunsForPitching(bases, result)
  if ((result === "BB" || result === "HBP") && isBasesLoaded(bases)) return 1
  return 0
}

export function buildPitchingEntryFromPlays(plays: LivePitchPlay[]): PitchingEntryData {
  return plays.reduce(
    (entry, play) => {
      const runs = estimateRunsForPitching(play.basesBefore ?? emptyBases, play.result)
      entry.inningsPitchedOuts += isPitchOutResult(play.result) ? 1 : 0
      entry.hitsAllowed += (play.result === "H" || play.result === "2B" || play.result === "3B" || play.result === "HR") ? 1 : 0
      entry.runsAllowed += runs
      entry.earnedRuns += estimateEarnedRunsForPitching(play.basesBefore ?? emptyBases, play.result)
      entry.walks += play.result === "BB" ? 1 : 0
      entry.hitBatters += play.result === "HBP" ? 1 : 0
      entry.strikeouts += play.result === "SO" ? 1 : 0
      entry.homeRunsAllowed += play.result === "HR" ? 1 : 0
      return entry
    },
    {
      ...createEmptyPitchingLine(),
    }
  )
}

export function getActionTimeFromId(id: string) {
  const time = Number(id.split("-")[0])
  return Number.isFinite(time) ? time : 0
}

export function recomputeLiveGame(battingPlays: LivePlay[], pitchingPlays: LivePitchPlay[]) {
  let away = 0
  let home = 0

  const nextBattingPlays: LivePlay[] = []
  const nextPitchingPlays: LivePitchPlay[] = []

  // Group plays by their stored (inning, half) — these values are the source of truth.
  // Processing frame-by-frame prevents deletion of 3-out plays from reassigning subsequent plays to wrong innings.
  const frameSet = new Map<string, { inning: number; half: GameHalf }>()
  const addFrame = (inning: number, half: GameHalf) => {
    const key = `${inning}-${half}`
    if (!frameSet.has(key)) frameSet.set(key, { inning, half })
  }
  battingPlays.forEach((p) => addFrame(p.inning, p.half))
  pitchingPlays.forEach((p) => addFrame(p.inning, p.half))

  const frames = Array.from(frameSet.values()).sort((a, b) => {
    if (a.inning !== b.inning) return a.inning - b.inning
    return a.half === b.half ? 0 : a.half === "Top" ? -1 : 1
  })

  let liveInning = 1
  let liveHalf: GameHalf = "Top"
  let liveOuts = 0
  let liveBases: BasesState = emptyBases

  for (const frame of frames) {
    let outs = 0
    let bases: BasesState = emptyBases

    const events = [
      ...battingPlays.filter((p) => p.inning === frame.inning && p.half === frame.half).map((p) => ({ type: "batting" as const, play: p })),
      ...pitchingPlays.filter((p) => p.inning === frame.inning && p.half === frame.half).map((p) => ({ type: "pitching" as const, play: p })),
    ].sort((a, b) => getActionTimeFromId(a.play.id) - getActionTimeFromId(b.play.id))

    for (const event of events) {
      if (event.type === "batting") {
        const play = event.play
        const rbi = Math.max(0, play.rbi)
        const runs = estimateRunsForBatting(bases, play.result, rbi)
        const statLine = buildLiveStatLine(play.result, rbi)
        nextBattingPlays.push({ ...play, inning: frame.inning, half: frame.half, outsBefore: outs, basesBefore: bases, rbi, runs, statLine })
        if (frame.half === "Top") away += runs
        else home += runs
        const nextOuts = outs + (isOutResult(play.result) ? 1 : 0)
        if (nextOuts >= 3) { outs = 3; bases = emptyBases }
        else { outs = nextOuts; bases = nextBasesForBatting(bases, play.result, rbi) }
      } else {
        const play = event.play
        const runs = estimateRunsForPitching(bases, play.result)
        nextPitchingPlays.push({ ...play, inning: frame.inning, half: frame.half, outsBefore: outs, basesBefore: bases })
        if (frame.half === "Top") away += runs
        else home += runs
        const nextOuts = outs + (isPitchOutResult(play.result) ? 1 : 0)
        if (nextOuts >= 3) { outs = 3; bases = emptyBases }
        else {
          outs = nextOuts
          if (play.result === "R" || play.result === "ER") {
            bases = play.scoredBase && bases[play.scoredBase]
              ? { ...bases, [play.scoredBase]: false }
              : removeScoredRunners(bases, 1)
          } else {
            bases = nextBasesForPitching(bases, play.result)
          }
        }
      }
    }

    liveInning = frame.inning
    liveHalf = frame.half
    liveOuts = outs
    liveBases = bases
  }

  if (liveOuts >= 3) {
    const next = getNextHalfInning(liveInning, liveHalf)
    liveInning = next.inning; liveHalf = next.half; liveOuts = 0; liveBases = emptyBases
  }

  return {
    livePlays: nextBattingPlays,
    livePitchPlays: nextPitchingPlays,
    awayScore: away,
    homeScore: home,
    liveInning,
    liveHalf,
    liveOuts,
    bases: liveBases,
    livePitchingEntry: buildPitchingEntryFromPlays(nextPitchingPlays),
  }
}

export function getPlayerLabel(player: Player) {
  return player.jerseyNumber != null ? `#${player.jerseyNumber} ${player.name}` : player.name
}

export function aggregateLivePlays(
  plays: LivePlay[],
  players: Player[],
  pitchingPlays: LivePitchPlay[] = []
): PendingBattingEntry[] {
  const byPlayer = new Map<string, PendingBattingEntry>()
  const pitcherIds = new Set(pitchingPlays.map((play) => play.pitcherId))

  plays.forEach((play) => {
    const player = players.find((item) => item.id === play.playerId)
    const existing = byPlayer.get(play.playerId)

    if (!existing) {
      const gamePositions = player ? [...player.positions] : ["UTIL" as Position]
      if (pitcherIds.has(play.playerId) && !gamePositions.includes("P")) gamePositions.push("P")
      byPlayer.set(play.playerId, {
        ...createEmptyBattingLine(), ...play.statLine,
        playerId: play.playerId, playerName: play.playerName, gamePositions,
      })
      return
    }

    existing.AB += play.statLine.AB
    existing.H += play.statLine.H
    existing.doubles += play.statLine.doubles
    existing.triples += play.statLine.triples
    existing.HR += play.statLine.HR
    existing.RBI += play.statLine.RBI
    existing.BB += play.statLine.BB
    existing.HBP += play.statLine.HBP ?? 0
    existing.SF += play.statLine.SF ?? 0
    existing.SO += play.statLine.SO
  })

  pitcherIds.forEach((pitcherId) => {
    const existing = byPlayer.get(pitcherId)
    const player = players.find((item) => item.id === pitcherId)

    if (existing) {
      if (!existing.gamePositions.includes("P")) existing.gamePositions.push("P")
      return
    }

    const gamePositions = player ? [...player.positions] : ["UTIL" as Position]
    if (!gamePositions.includes("P")) gamePositions.push("P")
    byPlayer.set(pitcherId, {
      ...createEmptyBattingLine(),
      playerId: pitcherId,
      playerName: player?.name ?? "Pitcher",
      gamePositions,
    })
  })

  return Array.from(byPlayer.values())
}

export function aggregateLivePitchingPlays(plays: LivePitchPlay[], players: Player[]): PendingPitchingEntry[] {
  const byPitcher = new Map<string, LivePitchPlay[]>()

  plays.forEach((play) => {
    const pitcherPlays = byPitcher.get(play.pitcherId) ?? []
    pitcherPlays.push(play)
    byPitcher.set(play.pitcherId, pitcherPlays)
  })

  return Array.from(byPitcher.entries()).map(([pitcherId, pitcherPlays]) => {
    const pitcher = players.find((player) => player.id === pitcherId)
    return {
      ...buildPitchingEntryFromPlays(pitcherPlays),
      playerId: pitcherId,
      playerName: pitcher?.name ?? pitcherPlays[0]?.pitcherName ?? "Pitcher",
    }
  })
}

export function formatLiveInnings(outs: number) {
  return `${Math.floor(outs / 3)}.${outs % 3}`
}

export function getGameResult(meta: DraftGameMeta): "W" | "L" | "T" | "" {
  if (meta.result === "W" || meta.result === "L" || meta.result === "T") return meta.result
  if (meta.teamScore == null || meta.opponentScore == null) return ""
  if (meta.teamScore > meta.opponentScore) return "W"
  if (meta.teamScore < meta.opponentScore) return "L"
  return "T"
}

export function getGameScore(meta: DraftGameMeta) {
  if (meta.teamScore == null || meta.opponentScore == null) return "-"
  return `${meta.teamScore}-${meta.opponentScore}`
}

export function battingResultClass(result: LivePlayResult): string {
  switch (result) {
    case "HR":  return "bg-green-800 text-white hover:bg-green-700"
    case "3B":  return "bg-emerald-600 text-white hover:bg-emerald-500"
    case "2B":  return "bg-emerald-500 text-white hover:bg-emerald-400"
    case "1B":  return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
    case "BB":
    case "HBP": return "bg-sky-100 text-sky-900 hover:bg-sky-200"
    case "SF":  return "bg-violet-100 text-violet-900 hover:bg-violet-200"
    case "SO":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "OUT": return "bg-gray-800 text-white hover:bg-gray-700"
    case "E":   return "bg-amber-100 text-amber-900 hover:bg-amber-200"
    case "FC":        return "bg-indigo-100 text-indigo-900 hover:bg-indigo-200"
    case "FC_OUT_2B": return "bg-indigo-800 text-white hover:bg-indigo-700"
    case "FC_OUT_3B": return "bg-indigo-600 text-white hover:bg-indigo-500"
  }
}

export function pitchingResultClass(result: LivePitchResult): string {
  switch (result) {
    case "OUT": return "bg-green-800 text-white hover:bg-green-700"
    case "SO":  return "bg-emerald-100 text-emerald-900 hover:bg-emerald-200"
    case "BB":  return "bg-amber-100 text-amber-900 hover:bg-amber-200"
    case "HBP": return "bg-sky-100 text-sky-900 hover:bg-sky-200"
    case "H":   return "bg-red-100 text-red-900 hover:bg-red-200"
    case "2B":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "3B":  return "bg-red-100 text-red-900 hover:bg-red-200"
    case "E":   return "bg-amber-100 text-amber-900 hover:bg-amber-200"
    case "R":   return "bg-orange-100 text-orange-900 hover:bg-orange-200"
    case "ER":  return "bg-red-200 text-red-900 hover:bg-red-300"
    case "HR":  return "bg-red-800 text-white hover:bg-red-700"
  }
}

export function battingResultBadge(result: LivePlayResult): string {
  switch (result) {
    case "HR":  return "bg-green-800 text-white"
    case "3B":  return "bg-emerald-600 text-white"
    case "2B":  return "bg-emerald-500 text-white"
    case "1B":  return "bg-emerald-100 text-emerald-900"
    case "BB":
    case "HBP": return "bg-sky-100 text-sky-900"
    case "SF":  return "bg-violet-100 text-violet-900"
    case "SO":  return "bg-red-100 text-red-900"
    case "OUT": return "bg-gray-200 text-gray-700"
    case "E":   return "bg-amber-100 text-amber-900"
    case "FC":        return "bg-indigo-100 text-indigo-900"
    case "FC_OUT_2B": return "bg-indigo-800 text-white"
    case "FC_OUT_3B": return "bg-indigo-600 text-white"
  }
}

export function pitchingResultBadge(result: LivePitchResult): string {
  switch (result) {
    case "OUT": return "bg-green-100 text-green-900"
    case "SO":  return "bg-emerald-100 text-emerald-900"
    case "BB":  return "bg-amber-100 text-amber-900"
    case "HBP": return "bg-sky-100 text-sky-900"
    case "H":   return "bg-red-100 text-red-900"
    case "2B":  return "bg-red-100 text-red-900"
    case "3B":  return "bg-red-100 text-red-900"
    case "E":   return "bg-amber-100 text-amber-900"
    case "R":   return "bg-orange-100 text-orange-900"
    case "ER":  return "bg-red-200 text-red-900"
    case "HR":  return "bg-red-800 text-white"
  }
}
