import fs from "node:fs"
import path from "node:path"

const season = process.argv[2] ?? "2026"
const root = process.env.JBL_JSON_ROOT
  ? path.resolve(process.env.JBL_JSON_ROOT)
  : path.join("public", "jbl", "seasons", String(season))
const seasonFile = path.join(root, "season.json")
const gamesIndexFile = path.join(root, "games", "index.json")

function fail(message) {
  console.error(`JBL JSON validation failed: ${message}`)
  process.exit(1)
}

function readJson(file) {
  if (!fs.existsSync(file)) fail(`missing ${file}`)
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"))
  } catch (error) {
    fail(`invalid JSON in ${file}: ${error.message}`)
  }
}

function assertObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) fail(`${label} must be an object`)
}

function assertArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`)
}

function assertString(value, label) {
  if (typeof value !== "string" || value.length === 0) fail(`${label} must be a non-empty string`)
}

const seasonJson = readJson(seasonFile)
assertObject(seasonJson, "season.json")
if (seasonJson.schemaVersion !== 1) fail("season.json schemaVersion must be 1")
if (seasonJson.league !== "JBL") fail("season.json league must be JBL")
assertArray(seasonJson.teams, "season.json teams")
assertArray(seasonJson.schedule, "season.json schedule")

const gameIds = new Set()
for (const [index, game] of seasonJson.schedule.entries()) {
  assertObject(game, `schedule[${index}]`)
  assertString(game.gameId, `schedule[${index}].gameId`)
  assertString(game.date, `schedule[${index}].date`)
  assertString(game.away, `schedule[${index}].away`)
  assertString(game.home, `schedule[${index}].home`)
  assertString(game.gameFile, `schedule[${index}].gameFile`)
  gameIds.add(game.gameId)
}

const gameIndex = readJson(gamesIndexFile)
assertArray(gameIndex, "games/index.json")

for (const fileName of gameIndex) {
  assertString(fileName, "games/index entry")
  const gameFile = path.join(root, "games", fileName)
  const game = readJson(gameFile)
  assertObject(game, fileName)
  if (game.schemaVersion !== 1) fail(`${fileName} schemaVersion must be 1`)
  assertString(game.gameId, `${fileName}.gameId`)
  assertString(game.date, `${fileName}.date`)
  assertString(game.away, `${fileName}.away`)
  assertString(game.home, `${fileName}.home`)
  assertObject(game.finalScore, `${fileName}.finalScore`)
  assertObject(game.lineScore, `${fileName}.lineScore`)
  assertObject(game.boxScore, `${fileName}.boxScore`)
  assertArray(game.boxScore.batters, `${fileName}.boxScore.batters`)
  assertArray(game.boxScore.pitchers, `${fileName}.boxScore.pitchers`)
  assertArray(game.events, `${fileName}.events`)

  if (!gameIds.has(game.gameId)) fail(`${fileName} gameId is not listed in season schedule`)

  for (const [eventIndex, event] of game.events.entries()) {
    assertObject(event, `${fileName}.events[${eventIndex}]`)
    assertString(event.type, `${fileName}.events[${eventIndex}].type`)
    if (event.type === "pitch") {
      for (const key of ["pitcher", "batter", "pitchType", "outcome", "basesBefore", "basesAfter"]) {
        if (!(key in event)) fail(`${fileName}.events[${eventIndex}] missing ${key}`)
      }
    }
    if (event.type === "play") {
      for (const key of ["batter", "pitcher", "result", "basesBefore", "basesAfter", "runnerAdvances"]) {
        if (!(key in event)) fail(`${fileName}.events[${eventIndex}] missing ${key}`)
      }
      assertArray(event.runnerAdvances, `${fileName}.events[${eventIndex}].runnerAdvances`)
    }
  }
}

console.log(`Validated JBL season ${season}: ${seasonJson.schedule.length} schedule entries, ${gameIndex.length} game files.`)
