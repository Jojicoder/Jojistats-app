import type { JblGameJson } from "../../sim/jblJsonTypes"
import type { GameData, PitcherRoleAbbr, SimBatter, SimPitcher } from "./types"

// Baseball convention: rate stats that live in [0, 1) drop the leading zero
// (".313", not "0.313"). Values that reach 1.000+ (e.g. a big OPS) keep it.
export function fmtAvg(value: number, decimals = 3): string {
  const s = value.toFixed(decimals)
  return value < 1 ? s.replace(/^0\./, ".") : s
}

export function normalizeGame(game: JblGameJson): GameData {
  return {
    gameId: game.gameId,
    date: game.date,
    away: game.away,
    home: game.home,
    finalScore: game.finalScore,
    lineScore: game.lineScore,
    awayLineup: game.awayLineup,
    homeLineup: game.homeLineup,
    events: game.events.map((event) => {
      const isTop = "isTop" in event
        ? Boolean((event as { isTop?: boolean }).isTop)
        : "half" in event && event.half === "top"
      if (event.type === "half_inning") {
        return {
          type: "half_inning",
          inning: event.inning,
          isTop,
          score: event.score,
        }
      }
      if (event.type === "pitch") {
        return {
          type: "pitch",
          inning: event.inning,
          isTop,
          pitcher: event.pitcher,
          batter: event.batter,
          pitchType: event.pitchType,
          outcome: event.outcome,
          balls: event.ballsBefore,
          strikes: event.strikesBefore,
          outs: event.outsBefore,
          score: event.scoreBefore,
          bases: event.basesBefore,
          velo: event.velo,
          px: event.px,
          pz: event.pz,
          mx: event.mx,
          mz: event.mz,
          batHand: event.batHand,
          pitchHand: event.pitchHand,
        }
      }
      if (event.type === "play") {
        const runsScored = Array.isArray(event.runsScored)
          ? event.runsScored.length
          : Number(event.runsScored ?? 0)
        return {
          type: "play",
          inning: event.inning,
          isTop,
          batter: event.batter,
          pitcher: event.pitcher,
          result: event.result,
          outs: event.outsAfter,
          score: event.scoreAfter,
          bases: event.basesAfter,
          runsScored,
          hit: event.hit
            ? {
                ev: event.hit.ev,
                la: event.hit.la,
                sa: event.hit.sa,
                traj: event.hit.traj,
              }
            : undefined,
          runnerAdvances: (event.runnerAdvances ?? []).map((advance) => ({
            runner: advance.runner,
            from: advance.from,
            to: advance.to,
            result: advance.result,
          })),
          throwTo: event.throwTo === "pitcher" || event.throwTo === "catcher" ? undefined : event.throwTo,
        }
      }
      if (event.type === "stolen_base") {
        return {
          type: "stolen_base",
          inning: event.inning,
          isTop,
          runner: event.runner,
          base: event.base,
          success: event.success,
          score: event.score,
          bases: event.bases,
          outs: event.outs,
        }
      }
      if (event.type === "pickoff") {
        return {
          type: "pickoff",
          inning: event.inning,
          isTop,
          runner: event.runner,
          base: event.base,
          out: event.out,
          score: event.score,
          bases: event.bases,
          outs: event.outs,
        }
      }
      return {
        type: "substitution",
        inning: "inning" in event ? event.inning : 1,
        isTop,
        subType: "subType" in event ? event.subType : "defensive",
        playerOut: "playerOut" in event ? event.playerOut : "",
        playerIn: "playerIn" in event ? event.playerIn : "",
        team: "team" in event && event.team === game.away ? "away" : "home",
        score: { away: 0, home: 0 },
        bases: { first: null, second: null, third: null },
        outs: 0,
      }
    }),
  }
}

export function battingFromGames(games: JblGameJson[]): SimBatter[] {
  const byName = new Map<string, {
    name: string
    team: string
    jerseyNumber: number | null
    games: number
    ab: number
    r: number
    h: number
    rbi: number
    bb: number
    so: number
    hr: number
    positionCounts: Map<string, number>
  }>()

  for (const game of games) {
    for (const player of game.boxScore.batters) {
      const key = `${player.team}:${player.name}`
      const row = byName.get(key) ?? {
        name: player.name,
        team: player.team,
        jerseyNumber: null,
        games: 0,
        ab: 0,
        r: 0,
        h: 0,
        rbi: 0,
        bb: 0,
        so: 0,
        hr: 0,
        positionCounts: new Map<string, number>(),
      }
      row.games += 1
      row.ab += player.ab
      row.r += player.runs ?? player.r ?? 0
      row.h += player.h
      row.rbi += player.rbi
      row.bb += player.bb
      row.so += player.so
      row.hr += player.hr
      if (player.jerseyNumber) row.jerseyNumber = player.jerseyNumber
      if (player.position) {
        row.positionCounts.set(player.position, (row.positionCounts.get(player.position) ?? 0) + 1)
      }
      byName.set(key, row)
    }
  }

  return [...byName.values()]
    .map((row) => {
      const pa = row.ab + row.bb
      const singles = Math.max(0, row.h - row.hr)
      const totalBases = singles + row.hr * 4
      const avg = row.ab > 0 ? row.h / row.ab : 0
      const obp = pa > 0 ? (row.h + row.bb) / pa : 0
      const slg = row.ab > 0 ? totalBases / row.ab : 0
      const bip = row.ab - row.so - row.hr
      const position = [...row.positionCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? ""
      return {
        name: row.name,
        team: row.team,
        position,
        jerseyNumber: row.jerseyNumber,
        games: row.games,
        ab: row.ab,
        pa,
        avg,
        obp,
        slg,
        ops: obp + slg,
        woba: pa > 0 ? (0.69 * row.bb + 0.88 * singles + 2.03 * row.hr) / pa : 0,
        kPct: pa > 0 ? (row.so / pa) * 100 : 0,
        bbPct: pa > 0 ? (row.bb / pa) * 100 : 0,
        babip: bip > 0 ? (row.h - row.hr) / bip : 0,
        rbi: row.rbi,
        hr: row.hr,
        sb: 0,
      }
    })
    .sort((a, b) => b.ops - a.ops)
}

// ── Per-game raw logs ────────────────────────────────────────────────────────
// One raw stat line per game a player actually appeared in (not accumulated),
// so a player's page can build a cumulative trend over any trailing window
// (e.g. "last 15 games") the same way it builds one over the full season.

export type BattingRawGame = {
  date: string; gameId: string; opp: string; isHome: boolean
  ab: number; h: number; bb: number; hr: number; r: number; rbi: number; so: number
}
export type PitchingRawGame = {
  date: string; gameId: string; opp: string; isHome: boolean
  ip: number; er: number; bb: number; h: number; so: number; saves: number; hr: number; r: number
}

export function battingRawGameLog(games: JblGameJson[], team: string, name: string): BattingRawGame[] {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date))
  const out: BattingRawGame[] = []
  for (const game of sorted) {
    const row = game.boxScore.batters.find((p) => p.team === team && p.name === name)
    if (!row) continue
    out.push({
      date: game.date,
      gameId: game.gameId,
      opp: game.away === team ? game.home : game.away,
      isHome: game.home === team,
      ab: row.ab,
      h: row.h,
      bb: row.bb,
      hr: row.hr,
      r: row.runs ?? row.r ?? 0,
      rbi: row.rbi,
      so: row.so,
    })
  }
  return out
}

export function pitchingRawGameLog(games: JblGameJson[], team: string, name: string): PitchingRawGame[] {
  const sorted = [...games].sort((a, b) => a.date.localeCompare(b.date))
  const out: PitchingRawGame[] = []
  for (const game of sorted) {
    const row = game.boxScore.pitchers.find((p) => p.team === team && p.name === name)
    if (!row) continue
    out.push({
      date: game.date,
      gameId: game.gameId,
      opp: game.away === team ? game.home : game.away,
      isHome: game.home === team,
      ip: row.ip,
      er: row.er,
      bb: row.bb,
      h: row.h,
      so: row.so,
      saves: row.saves,
      hr: row.hr,
      r: row.r,
    })
  }
  return out
}

export function pitchingFromGames(games: JblGameJson[]): SimPitcher[] {
  const byName = new Map<string, {
    name: string
    team: string
    jerseyNumber: number | null
    roleCounts: Map<string, number>
    ip: number
    h: number
    r: number
    er: number
    bb: number
    so: number
    hr: number
    wins: number
    saves: number
    games: number
    gamesStarted: number
  }>()

  for (const game of games) {
    for (const player of game.boxScore.pitchers) {
      const key = `${player.team}:${player.name}`
      const row = byName.get(key) ?? {
        name: player.name,
        team: player.team,
        jerseyNumber: null,
        roleCounts: new Map<string, number>(),
        ip: 0,
        h: 0,
        r: 0,
        er: 0,
        bb: 0,
        so: 0,
        hr: 0,
        wins: 0,
        saves: 0,
        games: 0,
        gamesStarted: 0,
      }
      row.ip += player.ip
      row.h += player.h
      row.r += player.r
      row.er += player.er
      row.bb += player.bb
      row.so += player.so
      row.hr += player.hr
      row.wins += player.wins
      row.saves += player.saves
      row.games += 1
      row.gamesStarted += player.gamesStarted ?? 0
      if (player.jerseyNumber) row.jerseyNumber = player.jerseyNumber
      if (player.role) row.roleCounts.set(player.role, (row.roleCounts.get(player.role) ?? 0) + 1)
      byName.set(key, row)
    }
  }

  return [...byName.values()]
    .map((row) => {
      // Prefer the roster-assigned role (most frequent across appearances);
      // fall back to a share-of-starts/saves heuristic for older game data
      // exported before the engine started reporting it.
      const roleFromData = [...row.roleCounts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] as PitcherRoleAbbr | undefined
      const role: PitcherRoleAbbr = roleFromData
        ?? (row.gamesStarted / row.games >= 0.5 ? "SP" : row.saves > 0 ? "CL" : "MR")
      return {
      name: row.name,
      team: row.team,
      jerseyNumber: row.jerseyNumber,
      role,
      gs: row.gamesStarted,
      gr: row.games,
      ip: row.ip,
      w: row.wins,
      era: row.ip > 0 ? (row.er * 9) / row.ip : 0,
      whip: row.ip > 0 ? (row.bb + row.h) / row.ip : 0,
      k9: row.ip > 0 ? (row.so * 9) / row.ip : 0,
      bb9: row.ip > 0 ? (row.bb * 9) / row.ip : 0,
      kPct: row.so + row.bb + row.h > 0 ? (row.so / (row.so + row.bb + row.h)) * 100 : 0,
      bbPct: row.so + row.bb + row.h > 0 ? (row.bb / (row.so + row.bb + row.h)) * 100 : 0,
      fip: row.ip > 0 ? ((13 * row.hr + 3 * row.bb - 2 * row.so) / row.ip) + 3.1 : 0,
      sv: row.saves,
      }
    })
    .sort((a, b) => a.era - b.era)
}

// ── Handedness ───────────────────────────────────────────────────────────
// Not tracked on the roster itself — read off the first pitch event where the
// player actually batted/pitched, same approach GameDetails.tsx uses for the
// Pitching Staff card.

export function battingHandFor(games: JblGameJson[], team: string, name: string): "L" | "R" | null {
  for (const game of games) {
    if (game.away !== team && game.home !== team) continue
    for (const ev of game.events) {
      if (ev.type === "pitch" && ev.batter === name && ev.batHand) return ev.batHand
    }
  }
  return null
}

export function pitchingHandFor(games: JblGameJson[], team: string, name: string): "L" | "R" | null {
  for (const game of games) {
    if (game.away !== team && game.home !== team) continue
    for (const ev of game.events) {
      if (ev.type === "pitch" && ev.pitcher === name && ev.pitchHand) return ev.pitchHand
    }
  }
  return null
}
