// Build public/jbl/seasons/<season>/stats.json: season totals for every batter and pitcher,
// aggregated from the published regular-season game files (games/<id>.json or .json.gz).
// The app reads this one small file for league leaders and awards instead of every game.
//
//   node scripts/build-jbl-stats.mjs [season]
//
// Regular season only (playoff games live under playoffs/). Output is deterministic.
// Awards are computed here too, from the same totals:
//   MVP          highest batting runs (linear weights) among qualified hitters
//   Best Pitcher highest runs saved vs the league ERA among qualified starters (10+ starts)
// Qualification: 3.1 PA per team game for hitters, 1.0 IP per team game for pitchers.

import fs from "node:fs"
import path from "node:path"
import zlib from "node:zlib"

const season = process.argv[2] ?? "2026"
const root = process.env.JBL_JSON_ROOT ?? path.join("public", "jbl", "seasons", season)

function readJson(file) {
  const gz = `${file}.gz`
  if (fs.existsSync(gz)) return JSON.parse(zlib.gunzipSync(fs.readFileSync(gz)).toString("utf8"))
  return JSON.parse(fs.readFileSync(file, "utf8"))
}

const seasonJson = JSON.parse(fs.readFileSync(path.join(root, "season.json"), "utf8"))
const finished = seasonJson.schedule.filter((game) => game.finalScore)

// The box score stores innings as a decimal (6.0, 2.3, 0.7 = 6, 2 1/3, 2/3), not baseball
// notation, so convert with ip * 3 (a ".3" is one out, a ".7" is two).
const toOuts = (ip) => Math.round(ip * 3)

const batters = new Map()
const pitchers = new Map()
const teamGames = {}
let throughDate = ""

for (const entry of finished) {
  const game = readJson(path.join(root, entry.gameFile))
  teamGames[game.away] = (teamGames[game.away] ?? 0) + 1
  teamGames[game.home] = (teamGames[game.home] ?? 0) + 1
  if (game.date > throughDate) throughDate = game.date

  for (const b of game.boxScore.batters) {
    const key = `${b.team}:${b.name}`
    const row = batters.get(key) ?? { name: b.name, team: b.team, age: b.age ?? null, positions: {}, g: 0, ab: 0, r: 0, h: 0, rbi: 0, bb: 0, so: 0, hr: 0 }
    row.g += 1
    row.ab += b.ab
    row.r += b.runs ?? b.r ?? 0
    row.h += b.h
    row.rbi += b.rbi
    row.bb += b.bb
    row.so += b.so
    row.hr += b.hr
    if (b.position) row.positions[b.position] = (row.positions[b.position] ?? 0) + 1
    batters.set(key, row)
  }
  for (const p of game.boxScore.pitchers) {
    const key = `${p.team}:${p.name}`
    const row = pitchers.get(key) ?? { name: p.name, team: p.team, roles: {}, g: 0, gs: 0, outs: 0, h: 0, r: 0, er: 0, bb: 0, so: 0, hr: 0, w: 0, l: 0, sv: 0 }
    row.g += 1
    row.gs += p.gamesStarted ?? 0
    row.outs += toOuts(p.ip)
    row.h += p.h
    row.r += p.r
    row.er += p.er
    row.bb += p.bb
    row.so += p.so
    row.hr += p.hr
    row.w += p.wins ?? 0
    row.l += p.losses ?? 0
    row.sv += p.saves ?? 0
    if (p.role) row.roles[p.role] = (row.roles[p.role] ?? 0) + 1
    pitchers.set(key, row)
  }
}

const top = (counts) => Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? ""
const byName = (a, b) => a.team.localeCompare(b.team) || a.name.localeCompare(b.name)

const batterList = [...batters.values()].sort(byName).map(({ positions, ...row }) => ({ ...row, pos: top(positions) }))
const pitcherList = [...pitchers.values()].sort(byName).map(({ roles, ...row }) => ({ ...row, role: top(roles) }))

// Awards
const maxTeamGames = Math.max(0, ...Object.values(teamGames))
const minPa = Math.ceil(3.1 * maxTeamGames)
const minOuts = Math.ceil(1.0 * maxTeamGames) * 3
const battingRuns = (b) => (b.h - b.hr) * 0.47 + b.hr * 1.4 + b.bb * 0.33 - (b.ab - b.h) * 0.09
const leagueOuts = pitcherList.reduce((sum, p) => sum + p.outs, 0)
const leagueEr = pitcherList.reduce((sum, p) => sum + p.er, 0)
const leagueEra = leagueOuts > 0 ? (leagueEr * 27) / leagueOuts : 0
const runsSaved = (p) => ((leagueEra * p.outs) / 27) - p.er

const qualifiedBatters = batterList.filter((b) => b.ab + b.bb >= minPa)
const qualifiedPitchers = pitcherList.filter((p) => p.outs >= minOuts && p.gs >= 10)
const best = (list, score) => list.reduce((a, b) => (a && score(a) >= score(b) ? a : b), null)
const mvp = best(qualifiedBatters, battingRuns)
const bestPitcher = best(qualifiedPitchers, runsSaved)

const out = {
  schemaVersion: 1,
  season: Number(season),
  throughDate,
  gamesPlayed: finished.length,
  qualifying: { pa: minPa, outs: minOuts },
  leagueEra: Number(leagueEra.toFixed(2)),
  awards: {
    mvp: mvp ? { name: mvp.name, team: mvp.team, pos: mvp.pos, value: Number(battingRuns(mvp).toFixed(1)) } : null,
    bestPitcher: bestPitcher ? { name: bestPitcher.name, team: bestPitcher.team, role: bestPitcher.role, value: Number(runsSaved(bestPitcher).toFixed(1)) } : null,
  },
  batters: batterList,
  pitchers: pitcherList,
}

fs.writeFileSync(path.join(root, "stats.json"), JSON.stringify(out))
console.log(
  `JBL ${season}: stats.json with ${batterList.length} batters, ${pitcherList.length} pitchers from ${finished.length} games` +
    (mvp ? `; MVP ${mvp.name} (${mvp.team}), best pitcher ${bestPitcher?.name ?? "-"}` : ""),
)
