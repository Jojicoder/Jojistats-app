import type { Player, DraftGameMeta, PendingBattingEntry, PendingPitchingEntry, Position } from "../types"
import type { BasesState, GameHalf, LivePlay, LivePitchPlay, LivePlayResult, LivePitchResult } from "./RecordGamePage.types"
import { emptyBases, createEmptyBattingLine } from "./gameConstants"
import {
  isOutResult, isPitchOutResult, getNextHalfInning,
  estimateRunsForBatting, nextBasesForBatting,
  estimateRunsForPitching, nextBasesForPitching,
  buildLiveStatLine, buildPitchingEntryFromPlays,
  removeScoredRunners, getActionTimeFromId,
} from "./gameStatUtils"

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
