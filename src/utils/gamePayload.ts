import type {
  DraftGameMeta,
  BattingEntryData,
  PendingBattingEntry,
  PendingPitchingEntry,
  PitchingEntryData,
} from "../types"
import type { FullGamePayload } from "../api/api"

export function buildGamePayload(teamId: number, gameMeta: DraftGameMeta): FullGamePayload["game"] {
  return {
    team_id: teamId,
    game_date: gameMeta.date,
    opponent_name: gameMeta.opponent,
    season_year: gameMeta.seasonYear,
    match_number: gameMeta.matchNumber,
    location: gameMeta.location?.trim() || null,
    ...(gameMeta.memo !== undefined ? { memo: gameMeta.memo.trim() || null } : {}),
    team_score: gameMeta.teamScore ?? null,
    opponent_score: gameMeta.opponentScore ?? null,
    result: gameMeta.result || null,
  }
}

export function buildBattingStatPayload(
  playerId: string | number,
  gamePositions: string[],
  entry: BattingEntryData,
  battingOrder: number
): FullGamePayload["battingStats"][number] {
  return {
    player_id: Number(playerId),
    batting_order: battingOrder,
    game_positions: gamePositions,
    ab: entry.AB,
    h: entry.H,
    double_hits: entry.doubles,
    triple_hits: entry.triples,
    hr: entry.HR,
    rbi: entry.RBI,
    bb: entry.BB,
    hbp: entry.HBP,
    sf: entry.SF,
    so: entry.SO,
    note: entry.note.trim() || null,
  }
}

export function buildPitchingStatPayload(
  playerId: string | number,
  entry: PitchingEntryData
): NonNullable<FullGamePayload["pitchingStats"]>[number] {
  return {
    player_id: Number(playerId),
    innings_pitched_outs: entry.inningsPitchedOuts,
    hits_allowed: entry.hitsAllowed,
    runs_allowed: entry.runsAllowed,
    earned_runs: entry.earnedRuns,
    walks: entry.walks,
    hbp: entry.hitBatters,
    strikeouts: entry.strikeouts,
    home_runs_allowed: entry.homeRunsAllowed,
  }
}

export function buildFullGamePayload(
  teamId: number,
  gameMeta: DraftGameMeta,
  battingEntries: PendingBattingEntry[],
  pitchingEntries: PendingPitchingEntry[] = []
): FullGamePayload {
  return {
    game: buildGamePayload(teamId, gameMeta),
    battingStats: battingEntries.map((entry, index) =>
      buildBattingStatPayload(entry.playerId, entry.gamePositions, entry, index + 1)
    ),
    pitchingStats: pitchingEntries.map((entry) => buildPitchingStatPayload(entry.playerId, entry)),
  }
}
