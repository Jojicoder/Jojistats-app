import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getJblScheduleForDate, jblTeamSlug, type JblScheduleGame } from "../../api/jbl"
import { teamBadge, teamColors } from "./teamTheme"
import { gameStorageKey, isGameRevealed } from "./gameReveal"

function formatLocalDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Date(year, month - 1, day)
}

function shiftDate(value: string, amount: number) {
  const date = parseLocalDate(value)
  date.setDate(date.getDate() + amount)
  return formatLocalDate(date)
}

function getWeekDates(value: string) {
  const selected = parseLocalDate(value)
  const mondayOffset = selected.getDay() === 0 ? -6 : 1 - selected.getDay()
  selected.setDate(selected.getDate() + mondayOffset)

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(selected)
    date.setDate(selected.getDate() + index)
    return formatLocalDate(date)
  })
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-3.5 w-3.5">
      <path fill="currentColor" d="M5 3.4v9.2L12 8 5 3.4Z" />
    </svg>
  )
}

export default function TodayGamesTab({
  selectedTeamName,
}: {
  selectedTeamName?: string
}) {
  const [searchParams] = useSearchParams()
  const today = formatLocalDate(new Date())
  const requestedDate = searchParams.get("date")
  const initialDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : today
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [games, setGames] = useState<JblScheduleGame[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadGames = () => {
      setGames(null)
      setError("")
      getJblScheduleForDate(selectedDate)
        .then((data) => {
          if (!cancelled) setGames(data)
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load games for this date.")
        })
    }

    loadGames()
    return () => {
      cancelled = true
    }
  }, [selectedDate])

  const displayDate = parseLocalDate(selectedDate)
  const isToday = selectedDate === today
  const weekDates = getWeekDates(selectedDate)
  const sortedGames = useMemo(() => {
    if (!games || !selectedTeamName) return games
    return [...games].sort((a, b) => {
      const aIncludesTeam = a.away === selectedTeamName || a.home === selectedTeamName
      const bIncludesTeam = b.away === selectedTeamName || b.home === selectedTeamName
      return Number(bIncludesTeam) - Number(aIncludesTeam)
    })
  }, [games, selectedTeamName])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {isToday ? "Today's Games" : "JBL Schedule"}
            </p>
            <h2 className="mt-1 text-lg font-extrabold text-green-950">
              {displayDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </h2>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(event) => event.target.value && setSelectedDate(event.target.value)}
            aria-label="Select game date"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
          />
        </div>
        <div className="mt-4 overflow-x-auto pb-1">
          <div className="grid min-w-[455px] grid-cols-7 gap-1 sm:min-w-[560px] sm:gap-2">
            {weekDates.map((dateValue) => {
              const date = parseLocalDate(dateValue)
              const isSelected = dateValue === selectedDate
              const dateIsToday = dateValue === today

              return (
                <button
                  key={dateValue}
                  type="button"
                  onClick={() => setSelectedDate(dateValue)}
                  aria-pressed={isSelected}
                  className={`rounded-lg border px-1 py-1.5 text-center transition ${
                    isSelected
                      ? "border-green-900 bg-green-900 text-white shadow-sm"
                      : dateIsToday
                      ? "border-green-300 bg-green-50 text-green-900 hover:bg-green-100"
                      : "border-gray-200 bg-white text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="block text-[9px] font-bold uppercase tracking-wide">
                    {date.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className="block text-base font-extrabold leading-none">
                    {date.getDate()}
                  </span>
                  <span className="mt-0.5 block h-2.5 text-[8px] font-bold uppercase">
                    {dateIsToday ? "Today" : ""}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </section>

      {!games && !error && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading games...
        </div>
      )}

      {error && (
        <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
      )}

      {games?.length === 0 && (
        <div className="rounded-2xl bg-white px-6 py-10 text-center shadow-sm">
          <p className="text-lg font-bold text-gray-800">
            {isToday ? "Off day — no games today" : "No games scheduled"}
          </p>
          {!isToday && (
            <p className="mt-1 text-sm text-gray-500">
              JBL has no games for this date. Try the previous or next day.
            </p>
          )}
          <div className="mt-4 flex justify-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedDate((date) => shiftDate(date, -1))}
              className="rounded-xl bg-[#f7f8f3] px-4 py-2 text-sm font-semibold text-green-900"
            >
              Previous day
            </button>
            <button
              type="button"
              onClick={() => setSelectedDate((date) => shiftDate(date, 1))}
              className="rounded-xl bg-[#f7f8f3] px-4 py-2 text-sm font-semibold text-green-900"
            >
              Next day
            </button>
          </div>
        </div>
      )}

      {sortedGames && sortedGames.length > 0 && (
        <div key={selectedDate} className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {sortedGames.map((game, index) => {
            // Brand identity color for the "which team is this" label/score
            // text — not a uniform simulation, so always the home (default)
            // color set. The away set includes near-white colors for some
            // teams (e.g. Bronx Wolves), which would be invisible as text
            // on a white card.
            const awayColor = teamColors(game.away).primary
            const homeColor = teamColors(game.home).primary
            const isActuallyFinal = game.status === "final" || Boolean(game.finalScore)
            // The whole day's games are simulated to completion in one
            // batch, so a "final" result is sitting there the moment the
            // date exists — hide it behind the same reveal a real
            // broadcast would have (or until someone actually watches the
            // replay) so today's games aren't spoiled on sight.
            const revealed = !isActuallyFinal || isGameRevealed(
              game.date,
              gameStorageKey(game.gameId, game.away, game.home, game.date),
            )
            const isFinal = isActuallyFinal && revealed
            const awayWon = Boolean(isFinal && game.finalScore && game.finalScore.away > game.finalScore.home)
            const homeWon = Boolean(isFinal && game.finalScore && game.finalScore.home > game.finalScore.away)
            const statusLabel = isFinal ? "Final" : isActuallyFinal ? "Live" : "Scheduled"
            const winnerColor = awayWon ? awayColor : homeWon ? homeColor : "#14532d"

            return (
              <div
                key={game.gameId}
                className={`jbl-card-in rounded-2xl bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                  isFinal ? "ring-1 ring-gray-100" : ""
                }`}
                style={{
                  animationDelay: `${Math.min(index * 55, 440)}ms`,
                  boxShadow: isFinal
                    ? `0 1px 2px rgba(15, 23, 42, 0.06), 0 0 0 1px rgba(15, 23, 42, 0.04), 0 12px 30px color-mix(in srgb, ${winnerColor} 13%, transparent)`
                    : undefined,
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                      isFinal ? "bg-gray-100 text-gray-500" : "bg-[#f7f8f3] text-gray-500"
                    }`}
                  >
                    {statusLabel}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    JBL
                  </span>
                </div>
                <div className="space-y-2">
                  {([
                    { name: game.away, color: awayColor, won: awayWon, score: game.finalScore?.away },
                    { name: game.home, color: homeColor, won: homeWon, score: game.finalScore?.home },
                  ] as const).map((side) => (
                    <div
                      key={side.name}
                      className={`flex items-center justify-between rounded-lg px-1.5 py-1 transition ${
                        side.won ? "bg-gray-50" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {teamBadge(side.name, "lg")}
                        <Link
                          to={`/jbl/teams/${jblTeamSlug(side.name)}`}
                          className={`text-sm font-semibold hover:underline ${
                            side.won ? "text-green-900" : "text-gray-700"
                          }`}
                          style={side.won ? { color: side.color, textShadow: `0 0 18px color-mix(in srgb, ${side.color} 20%, transparent)` } : undefined}
                        >
                          {side.name}
                        </Link>
                      </div>
                      {isFinal && side.score !== undefined && (
                        <span
                          className={`text-xl font-extrabold tabular-nums ${
                            side.won ? "text-green-900" : "text-gray-400"
                          }`}
                          style={side.won ? { color: side.color } : { opacity: 0.58 }}
                        >
                          {side.score}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                {isFinal && (game.winPitcher || game.lossPitcher || game.savePitcher) && (
                  <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                    {game.winPitcher && <p><span className="font-bold text-green-800">W</span> {game.winPitcher}</p>}
                    {game.lossPitcher && <p><span className="font-bold text-red-600">L</span> {game.lossPitcher}</p>}
                    {game.savePitcher && <p><span className="font-bold text-blue-700">SV</span> {game.savePitcher}</p>}
                  </div>
                )}
                <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  <p>
                    <span className="font-bold text-gray-700">Venue:</span>{" "}
                    {game.venue}
                  </p>
                </div>
                <Link
                  to={`/jbl/games/${game.gameId}?team=${
                    encodeURIComponent(selectedTeamName ?? game.away)
                  }&date=${selectedDate}`}
                  className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-green-900 transition hover:bg-gray-50"
                >
                  <PlayIcon />
                  View game details
                </Link>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
