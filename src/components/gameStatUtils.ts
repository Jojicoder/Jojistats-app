import type { BattingEntryData, PitchingEntryData } from "../types"
import type { BasesState, GameHalf, LivePitchPlay, LivePlayResult, LivePitchResult } from "./RecordGamePage.types"
import { emptyBases, createEmptyBattingLine, createEmptyPitchingLine } from "./gameConstants"

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
    { ...createEmptyPitchingLine() }
  )
}

export function getActionTimeFromId(id: string) {
  const time = Number(id.split("-")[0])
  return Number.isFinite(time) ? time : 0
}
