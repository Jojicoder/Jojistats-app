// Games are treated as starting 7pm and final by 9pm America/New_York —
// there's no real per-game start time in the data (a whole day's games are
// generated in one batch), so this is a single assumed nightly window
// rather than per-game scheduling.
const REVEAL_HOUR_NY = 21

function nowInNYParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date())
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00"
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` }
}

// True once the assumed 9pm-NY reveal window has passed for that date —
// independent of whether anyone has actually watched the game.
export function isGameTimeRevealed(gameDate: string): boolean {
  const now = nowInNYParts()
  if (gameDate < now.date) return true
  if (gameDate > now.date) return false
  return now.time >= `${String(REVEAL_HOUR_NY).padStart(2, "0")}:00`
}

// Same fallback shape used everywhere a game needs a stable localStorage
// key — keying by date alone would collide across the several games that
// happen on the same day.
export function gameStorageKey(gameId: string | undefined, away: string, home: string, date: string): string {
  return gameId ?? `${away}@${home}-${date}`
}

function watchedKey(gameId: string) {
  return `jbl-watched-${gameId}`
}

// True once someone has actually played this specific game's replay through
// to the end — lets an eager viewer find out the result early instead of
// waiting for the 9pm window, the same way watching a real broadcast would.
export function hasWatchedGame(gameId: string): boolean {
  return localStorage.getItem(watchedKey(gameId)) === "1"
}

export function markGameWatched(gameId: string): void {
  localStorage.setItem(watchedKey(gameId), "1")
}

export function isGameRevealed(gameDate: string, gameId: string): boolean {
  return isGameTimeRevealed(gameDate) || hasWatchedGame(gameId)
}

// Any list of games destined for a season aggregate, a team's "Recent
// Results", or a player's "All Games" log needs this — getJblVisibleGames
// returns every already-simulated game (including today's, batch-generated
// well before the assumed reveal time), so without this filter those views
// spoil today's result before the reveal system says it's safe to.
export function filterRevealedGames<T extends { gameId: string; date: string; away: string; home: string }>(
  games: T[]
): T[] {
  return games.filter((g) => isGameRevealed(g.date, gameStorageKey(g.gameId, g.away, g.home, g.date)))
}
