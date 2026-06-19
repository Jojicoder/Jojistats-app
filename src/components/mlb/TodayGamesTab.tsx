import { useEffect, useMemo, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { getGames } from "../../api/mlb"
import type { MLBGame } from "./types"

// ── Today's Games ─────────────────────────────────────────────────────

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

function RunnerStatus({
  offense,
}: {
  offense: NonNullable<MLBGame["linescore"]>["offense"]
}) {
  const bases = [
    { label: "3B", occupied: Boolean(offense?.third) },
    { label: "2B", occupied: Boolean(offense?.second) },
    { label: "1B", occupied: Boolean(offense?.first) },
  ]

  return (
    <div className="flex items-center gap-1.5" aria-label="Base runners">
      {bases.map(({ label, occupied }) => (
        <span
          key={label}
          title={`${label}: ${occupied ? "Occupied" : "Empty"}`}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-[10px] font-bold ${
            occupied ? "bg-amber-400 text-amber-950" : "bg-gray-100 text-gray-400"
          }`}
        >
          {label}
        </span>
      ))}
    </div>
  )
}

export default function TodayGamesTab({
  selectedTeamId,
}: {
  selectedTeamId?: number | null
}) {
  const [searchParams] = useSearchParams()
  const today = formatLocalDate(new Date())
  const requestedDate = searchParams.get("date")
  const initialDate = requestedDate && /^\d{4}-\d{2}-\d{2}$/.test(requestedDate)
    ? requestedDate
    : today
  const [selectedDate, setSelectedDate] = useState(initialDate)
  const [games, setGames] = useState<MLBGame[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    let cancelled = false

    const loadGames = (showLoading: boolean) => {
      if (showLoading) setGames(null)
      setError("")
      getGames(selectedDate)
        .then((data) => {
          if (!cancelled) setGames(data)
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load games for this date.")
        })
    }

    loadGames(true)
    const refreshId = window.setInterval(() => loadGames(false), 30_000)

    return () => {
      cancelled = true
      window.clearInterval(refreshId)
    }
  }, [selectedDate])

  const displayDate = parseLocalDate(selectedDate)
  const isToday = selectedDate === today
  const weekDates = getWeekDates(selectedDate)
  const sortedGames = useMemo(() => {
    if (!games || !selectedTeamId) return games

    return [...games].sort((a, b) => {
      const aIncludesTeam =
        a.teams.away.team.id === selectedTeamId || a.teams.home.team.id === selectedTeamId
      const bIncludesTeam =
        b.teams.away.team.id === selectedTeamId || b.teams.home.team.id === selectedTeamId
      return Number(bIncludesTeam) - Number(aIncludesTeam)
    })
  }, [games, selectedTeamId])

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">
              {isToday ? "Today's Games" : "MLB Schedule"}
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
          <p className="text-lg font-bold text-gray-800">No games scheduled</p>
          <p className="mt-1 text-sm text-gray-500">
            MLB has no games scheduled for this date. Try the previous or next day.
          </p>
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {sortedGames.map((game) => {
          const isFinal = game.status.abstractGameState === "Final"
          const isLive = game.status.abstractGameState === "Live"
          const isPreview = game.status.abstractGameState === "Preview"
          const gameTime = new Date(game.gameDate).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })
          const liveLabel = [
            game.linescore?.inningHalf,
            game.linescore?.currentInningOrdinal,
          ].filter(Boolean).join(" ")
          return (
            <div key={game.gamePk} className="rounded-2xl bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between gap-3">
                <span
                  className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    isLive
                      ? "bg-green-100 text-green-700"
                      : isFinal
                      ? "bg-gray-100 text-gray-500"
                      : "bg-[#f7f8f3] text-gray-500"
                  }`}
                >
                  {isLive ? `● Live${liveLabel ? ` · ${liveLabel}` : ""}` : isFinal ? game.status.detailedState : gameTime}
                </span>
                {isLive && (
                  <span className="text-xs font-semibold text-gray-500">
                    {game.linescore?.outs ?? 0} out{game.linescore?.outs === 1 ? "" : "s"}
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {([game.teams.away, game.teams.home] as const).map((side, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <img
                        src={`https://www.mlbstatic.com/team-logos/${side.team.id}.svg`}
                        alt=""
                        className="h-6 w-6 shrink-0 object-contain"
                      />
                      <Link
                        to={`/mlb/teams/${side.team.id}`}
                        className={`text-sm font-semibold ${
                          side.isWinner ? "text-green-900" : "text-gray-700"
                        } hover:underline`}
                      >
                        {side.team.name}
                      </Link>
                    </div>
                    {(isFinal || isLive) && side.score !== undefined && (
                      <span
                        className={`text-xl font-extrabold tabular-nums ${
                          side.isWinner ? "text-green-900" : "text-gray-400"
                        }`}
                      >
                        {side.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {isLive && (
                <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3">
                  <span className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Runners
                  </span>
                  <RunnerStatus offense={game.linescore?.offense} />
                </div>
              )}
              {isFinal && game.decisions && (
                <div className="mt-4 space-y-1 border-t border-gray-100 pt-3 text-xs text-gray-600">
                  {game.decisions.winner && <p><span className="font-bold text-green-800">W</span> {game.decisions.winner.fullName}</p>}
                  {game.decisions.loser && <p><span className="font-bold text-red-600">L</span> {game.decisions.loser.fullName}</p>}
                  {game.decisions.save && <p><span className="font-bold text-blue-700">SV</span> {game.decisions.save.fullName}</p>}
                </div>
              )}
              {isPreview && (
                <div className="mt-4 space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-xs text-gray-500">
                    <span className="font-bold text-gray-700">Venue:</span>{" "}
                    {game.venue?.name ?? "To be announced"}
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-[#f7f8f3] p-2">
                      <span className="block font-bold text-gray-400">Away starter</span>
                      <span className="mt-0.5 block font-semibold text-gray-700">
                        {game.teams.away.probablePitcher?.fullName ?? "TBD"}
                      </span>
                    </div>
                    <div className="rounded-lg bg-[#f7f8f3] p-2">
                      <span className="block font-bold text-gray-400">Home starter</span>
                      <span className="mt-0.5 block font-semibold text-gray-700">
                        {game.teams.home.probablePitcher?.fullName ?? "TBD"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <Link
                to={`/mlb/games/${game.gamePk}?teamId=${
                  selectedTeamId ?? game.teams.away.team.id
                }&date=${selectedDate}&live=${isLive ? "1" : "0"}`}
                className="mt-4 block w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-center text-sm font-semibold text-green-900 transition hover:bg-gray-50"
              >
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
