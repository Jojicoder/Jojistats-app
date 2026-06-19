import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { getGameLiveFeed } from "../../api/mlb"
import type {
  MLBBoxscorePlayer,
  MLBGameLiveFeed,
  MLBOffense,
  MLBPlay,
} from "./types"
import {
  formatInning,
  getAtBatResultStyle,
  findPlayer,
  findPlayerTeamId,
  playerHref,
  getRunnersBeforeAtBat,
} from "./MLBGameDetailsUtils"
import { PlayerHeadshot } from "./MLBPlayerHeadshot"
import { ScoreHero } from "./MLBScoreHero"
import { Scoreboard } from "./MLBScoreboard"
import { LineupSidebar } from "./MLBLineupSidebar"
import { PlayByPlay } from "./MLBPlayByPlay"
import { PitchChart } from "./MLBPitchChart"

type MLBGameDetailsProps = {
  gamePk: number
  isLive: boolean
  backHref: string
}

function BasesDiamond({ offense }: { offense?: MLBOffense }) {
  const bases = [
    { key: "second", runner: offense?.second?.fullName, position: "left-1/2 top-1 -translate-x-1/2" },
    { key: "third", runner: offense?.third?.fullName, position: "left-2 top-1/2 -translate-y-1/2" },
    { key: "first", runner: offense?.first?.fullName, position: "right-2 top-1/2 -translate-y-1/2" },
  ]

  return (
    <div className="relative h-20 w-24 shrink-0" aria-label="Base runners">
      {bases.map((base) => (
        <div
          key={base.key}
          title={base.runner ?? `${base.key} base empty`}
          className={`absolute h-6 w-6 rotate-45 border-2 transition-colors ${
            base.runner
              ? "border-amber-400 bg-amber-400 shadow-md shadow-amber-200"
              : "border-gray-300 bg-white"
          } ${base.position}`}
        >
          <span className="sr-only">{base.runner ?? "Empty"}</span>
        </div>
      ))}
      <div className="absolute bottom-0 left-1/2 h-5 w-5 -translate-x-1/2 rotate-45 border-2 border-gray-300 bg-gray-100" />
    </div>
  )
}

function CountLights({ label, count, max, color }: {
  label: string
  count: number
  max: number
  color: string
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-3 text-xs font-extrabold text-gray-400">{label}</span>
      <div className="flex gap-1">
        {Array.from({ length: max }, (_, index) => (
          <span
            key={index}
            className={`h-3 w-3 rounded-full border-2 transition-colors ${
              index < count ? color : "border-gray-200 bg-white"
            }`}
          />
        ))}
      </div>
    </div>
  )
}

function PlayerMatchup({
  role,
  player,
  boxscorePlayer,
  href,
}: {
  role: "Batter" | "Pitcher"
  player?: { id?: number; fullName?: string }
  boxscorePlayer?: MLBBoxscorePlayer
  href?: string
}) {
  const batting = boxscorePlayer?.seasonStats?.batting
  const pitching = boxscorePlayer?.seasonStats?.pitching
  const stats = role === "Batter"
    ? [
        ["AVG", batting?.avg ?? "—"],
        ["OPS", batting?.ops ?? "—"],
        ["HR", batting?.homeRuns ?? "—"],
      ]
    : [
        ["ERA", pitching?.era ?? "—"],
        ["WHIP", pitching?.whip ?? "—"],
        ["K", pitching?.strikeOuts ?? "—"],
      ]

  const inner = (
    <>
      <PlayerHeadshot
        id={player?.id}
        name={player?.fullName}
        className="h-12 w-12 shrink-0 rounded-full border-2 border-white object-cover object-[50%_35%] shadow-sm"
      />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{role}</p>
        <p className="truncate text-sm font-extrabold text-gray-900">{player?.fullName ?? `${role} TBD`}</p>
        <div className="mt-1 flex gap-3">
          {stats.map(([label, value]) => (
            <div key={label}>
              <p className="text-[9px] font-bold uppercase tracking-wide text-gray-400">{label}</p>
              <p className="text-xs font-extrabold text-gray-700">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </>
  )

  if (href) {
    return (
      <Link to={href} target="_blank" rel="noreferrer" className="flex min-w-0 items-center gap-2.5 rounded-xl bg-gray-50 p-2.5 transition hover:bg-gray-100">
        {inner}
      </Link>
    )
  }
  return (
    <div className="flex min-w-0 items-center gap-2.5 rounded-xl bg-gray-50 p-2.5">
      {inner}
    </div>
  )
}

function PreGameSummary({ feed }: { feed: MLBGameLiveFeed }) {
  const start = feed.gameData?.datetime?.dateTime
  const probable = feed.gameData?.probablePitchers

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Game Information</p>
        <p className="mt-3 text-lg font-extrabold text-gray-900">
          {start
            ? new Date(start).toLocaleString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })
            : "Start time TBD"}
        </p>
        <p className="mt-2 text-sm text-gray-500">{feed.gameData?.venue?.name ?? "Venue TBD"}</p>
      </div>
      <div className="rounded-2xl bg-white p-5 shadow-sm">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Probable Pitchers</p>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {(["away", "home"] as const).map((side) => {
            const pitcher = probable?.[side]
            const team = feed.gameData?.teams?.[side]
            return (
              <div key={side} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                <PlayerHeadshot
                  id={pitcher?.id}
                  name={pitcher?.fullName}
                  className="h-14 w-14 shrink-0 rounded-full object-cover object-[50%_35%]"
                />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{team?.abbreviation ?? side} starter</p>
                  <p className="font-bold text-gray-900">{pitcher?.fullName ?? "TBD"}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function Decisions({ feed }: { feed: MLBGameLiveFeed }) {
  const decisions = feed.liveData?.decisions
  const rows = [
    ["W", decisions?.winner, "bg-emerald-50 text-emerald-700"],
    ["L", decisions?.loser, "bg-red-50 text-red-600"],
    ["SV", decisions?.save, "bg-blue-50 text-blue-700"],
  ] as const
  const available = rows.filter(([, player]) => player)
  if (available.length === 0) return null

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Decisions</p>
      <div className={`mt-3 grid gap-3 ${
        available.length === 1
          ? "sm:grid-cols-1"
          : available.length === 2
          ? "sm:grid-cols-2"
          : "sm:grid-cols-3"
      }`}>
        {available.map(([label, player, badgeClass]) => {
          const teamId = findPlayerTeamId(feed, player?.id)
          const href = playerHref(teamId, player?.id)
          const inner = (
            <>
              <PlayerHeadshot
                id={player?.id}
                name={player?.fullName}
                className="h-12 w-12 shrink-0 rounded-full object-cover object-[50%_35%]"
              />
              <div>
                <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${badgeClass}`}>{label}</span>
                <p className="mt-0.5 text-sm font-bold text-gray-900">{player?.fullName}</p>
              </div>
            </>
          )
          return href ? (
            <Link key={label} to={href} target="_blank" rel="noreferrer" className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100">
              {inner}
            </Link>
          ) : (
            <div key={label} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
              {inner}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function MLBGameDetails({ gamePk, isLive, backHref }: MLBGameDetailsProps) {
  const [feed, setFeed] = useState<MLBGameLiveFeed | null>(null)
  const [error, setError] = useState("")
  const [selectedInning, setSelectedInning] = useState<number | null>(null)
  const [selectedHalf, setSelectedHalf] = useState<"top" | "bottom" | null>(null)
  const [selectedAtBatIndex, setSelectedAtBatIndex] = useState<number | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => {
      getGameLiveFeed(gamePk)
        .then((data) => {
          if (!cancelled) {
            setFeed(data)
            setError("")
            setLastUpdated(new Date())
          }
        })
        .catch(() => {
          if (!cancelled) setError("Failed to load game details.")
        })
    }
    load()
    const refreshId = window.setInterval(load, isLive ? 10_000 : 30_000)
    return () => {
      cancelled = true
      window.clearInterval(refreshId)
    }
  }, [gamePk, isLive])

  if (!feed && !error) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600" />
        <p className="mt-3 text-sm text-gray-400">Loading game details...</p>
      </div>
    )
  }
  if (error && !feed) {
    return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
  }
  if (!feed) return null

  const linescore = feed.liveData?.linescore
  const currentPlay = feed.liveData?.plays?.currentPlay
  const allPlays = feed.liveData?.plays?.allPlays ?? []
  const state = feed.gameData?.status?.abstractGameState
  const liveStatus = state === "Live"
  const previewStatus = state === "Preview"
  const finalStatus = state === "Final"
  const inningPlays = selectedInning === null
    ? []
    : allPlays.filter(
        (play: MLBPlay) =>
          play.about?.inning === selectedInning &&
          play.about?.halfInning === selectedHalf &&
          play.result?.event != null
      )
  const selectedPlayPosition = selectedAtBatIndex === null
    ? -1
    : inningPlays.findIndex((play: MLBPlay) => play.atBatIndex === selectedAtBatIndex)
  const displayedPlay = selectedPlayPosition >= 0
    ? inningPlays[selectedPlayPosition]
    : currentPlay
  const viewingHistoricalAtBat = selectedPlayPosition >= 0
  const historicalOffense = viewingHistoricalAtBat
    ? getRunnersBeforeAtBat(
        allPlays,
        selectedInning ?? undefined,
        selectedHalf,
        displayedPlay?.atBatIndex
      )
    : undefined
  const pitchEvents = displayedPlay?.playEvents?.filter((event) => event.isPitch) ?? []
  const batter = displayedPlay?.matchup?.batter ?? linescore?.offense?.batter
  const pitcher = displayedPlay?.matchup?.pitcher ?? linescore?.defense?.pitcher
  const resultStyle = getAtBatResultStyle(displayedPlay)

  const handleSelectHalfInning = (inning: number, half: "top" | "bottom") => {
    const playsForInning = allPlays.filter(
      (play: MLBPlay) =>
        play.about?.inning === inning &&
        play.about?.halfInning === half &&
        play.result?.event != null
    )
    const firstPlay = playsForInning[0]
    setSelectedInning(inning)
    setSelectedHalf(half)
    setSelectedAtBatIndex(firstPlay?.atBatIndex ?? null)
  }
  const handleClearInning = () => {
    setSelectedInning(null)
    setSelectedHalf(null)
    setSelectedAtBatIndex(null)
  }
  const showPreviousAtBat = () => {
    if (selectedPlayPosition <= 0) return
    setSelectedAtBatIndex(inningPlays[selectedPlayPosition - 1]?.atBatIndex ?? null)
  }
  const showNextAtBat = () => {
    if (selectedPlayPosition < 0 || selectedPlayPosition >= inningPlays.length - 1) return
    setSelectedAtBatIndex(inningPlays[selectedPlayPosition + 1]?.atBatIndex ?? null)
  }
  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      const data = await getGameLiveFeed(gamePk)
      setFeed(data)
      setError("")
      setLastUpdated(new Date())
      setSelectedInning(null)
      setSelectedHalf(null)
      setSelectedAtBatIndex(null)
    } catch {
      setError("Failed to refresh the latest game information.")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-4 py-2">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-green-700 sm:text-[10px]">
              Game Status
            </p>
            <h1 className="text-base font-extrabold leading-tight text-gray-900 sm:text-lg">
              Game Details
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {lastUpdated && (
              <span className="hidden text-xs text-gray-400 sm:inline">
                Updated {lastUpdated.toLocaleTimeString("en-US", {
                  hour: "numeric",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-bold text-green-900 shadow-sm transition hover:bg-gray-50 disabled:cursor-wait disabled:opacity-60"
            >
              <span className={isRefreshing ? "inline-block animate-spin" : ""} aria-hidden="true">↻</span>
              {isRefreshing ? "Refreshing..." : "Refresh"}
            </button>
            <Link
              to={backHref}
              className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-green-900 shadow-sm hover:bg-gray-50"
            >
              ← Back
            </Link>
          </div>
        </div>

        {error && feed && <p className="px-4 pt-2 text-right text-xs text-red-500">{error}</p>}

        <div className="px-4 py-1.5">
          <ScoreHero feed={feed} liveStatus={liveStatus} finalStatus={finalStatus} />
        </div>

        <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5 text-center">
          <p className="text-xs text-gray-400">
            {feed.gameData?.venue?.name ?? ""}
            {feed.gameData?.datetime?.dateTime
              ? ` · ${new Date(feed.gameData.datetime.dateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
              : ""}
          </p>
        </div>

        <div className="px-4 pb-3 pt-2">
          <Scoreboard
            feed={feed}
            selectedInning={selectedInning}
            selectedHalf={selectedHalf}
            onSelectHalfInning={handleSelectHalfInning}
          />
        </div>
      </section>

      {previewStatus && <PreGameSummary feed={feed} />}
      {finalStatus && <Decisions feed={feed} />}

      {finalStatus && !viewingHistoricalAtBat && (
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Pitch Location</p>
          <p className="mt-1 text-base font-extrabold text-gray-900">At-Bat Details</p>
          <p className="mt-2 text-sm text-gray-500">
            Click any inning cell in the scoreboard above to view pitch location and matchup details for each at-bat.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-xl bg-gray-50 px-4 py-3 text-xs text-gray-400">
            <span className="text-base">↑</span>
            Click any inning cell above to explore pitch-by-pitch data
          </div>
        </div>
      )}

      {(liveStatus || pitchEvents.length > 0) && (
        <div className={`grid gap-4 ${
          liveStatus || viewingHistoricalAtBat
            ? "xl:grid-cols-[180px_minmax(320px,0.8fr)_minmax(0,1.4fr)] xl:items-stretch"
            : "grid-cols-1"
        }`}>
          {(liveStatus || viewingHistoricalAtBat) && (() => {
            const inningHalf = liveStatus
              ? (feed.liveData?.linescore?.inningHalf?.toLowerCase() === "bottom" ? "bottom" : "top")
              : selectedHalf
            const battingSide: "away" | "home" | null = inningHalf === "top" ? "away" : inningHalf === "bottom" ? "home" : null
            return (
              <LineupSidebar
                feed={feed}
                currentBatterId={batter?.id}
                battingSide={battingSide}
              />
            )
          })()}
          {(liveStatus || viewingHistoricalAtBat) && (
            <section className="h-full rounded-2xl bg-white p-3 shadow-sm sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                    {viewingHistoricalAtBat && selectedHalf
                      ? `${selectedHalf === "top" ? "Top" : "Bottom"} ${selectedInning} Matchup`
                      : "Current Matchup"}
                  </p>
                  {viewingHistoricalAtBat && (
                    <p className="mt-0.5 text-xs text-gray-400">
                      At-bat {selectedPlayPosition + 1} of {inningPlays.length}
                    </p>
                  )}
                </div>
                {viewingHistoricalAtBat && (
                  <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-600">
                    {formatInning(displayedPlay ?? {})}
                  </span>
                )}
              </div>
              <div className="mt-3 grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
                  <PlayerMatchup role="Batter" player={batter} boxscorePlayer={findPlayer(feed, batter?.id)} href={playerHref(findPlayerTeamId(feed, batter?.id), batter?.id)} />
                  <PlayerMatchup role="Pitcher" player={pitcher} boxscorePlayer={findPlayer(feed, pitcher?.id)} href={playerHref(findPlayerTeamId(feed, pitcher?.id), pitcher?.id)} />
                </div>
                <div className="flex items-center justify-around gap-4 rounded-xl bg-gray-50 p-3 ring-1 ring-gray-100">
                  <BasesDiamond offense={historicalOffense ?? linescore?.offense} />
                  <div className="space-y-2">
                    <CountLights label="B" count={viewingHistoricalAtBat ? displayedPlay?.count?.balls ?? 0 : linescore?.balls ?? currentPlay?.count?.balls ?? 0} max={3} color="border-green-500 bg-green-500" />
                    <CountLights label="S" count={viewingHistoricalAtBat ? displayedPlay?.count?.strikes ?? 0 : linescore?.strikes ?? currentPlay?.count?.strikes ?? 0} max={2} color="border-amber-400 bg-amber-400" />
                    <CountLights label="O" count={viewingHistoricalAtBat ? displayedPlay?.count?.outs ?? 0 : linescore?.outs ?? currentPlay?.count?.outs ?? 0} max={2} color="border-red-500 bg-red-500" />
                  </div>
                </div>
                {viewingHistoricalAtBat && (
                  <div className={`rounded-xl border-2 p-3 ${resultStyle.box}`}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-extrabold uppercase tracking-wide ${resultStyle.badge}`}>
                        {resultStyle.label}
                      </span>
                      {(displayedPlay?.result?.awayScore !== undefined || displayedPlay?.result?.homeScore !== undefined) && (
                        <span className={`text-xs font-extrabold ${resultStyle.text}`}>
                          Score {displayedPlay?.result?.awayScore ?? 0}–{displayedPlay?.result?.homeScore ?? 0}
                        </span>
                      )}
                    </div>
                    <p className={`mt-2 text-sm font-bold leading-relaxed ${resultStyle.text}`}>
                      {displayedPlay?.result?.description ?? "At-bat result unavailable"}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={showPreviousAtBat}
                        disabled={selectedPlayPosition <= 0}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ← Previous
                      </button>
                      <button
                        type="button"
                        onClick={showNextAtBat}
                        disabled={selectedPlayPosition >= inningPlays.length - 1}
                        className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next →
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {pitchEvents.length > 0 && (
            <section className="h-full rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                {viewingHistoricalAtBat
                  ? `${selectedHalf === "top" ? "Top" : "Bottom"} ${selectedInning} · At-Bat ${selectedPlayPosition + 1}`
                  : liveStatus ? "Current At-Bat" : "Final At-Bat"}
              </p>
              <h2 className="mt-1 text-2xl font-extrabold text-gray-900">Pitch Location</h2>
              <div className="mt-5">
                <PitchChart events={pitchEvents} expanded={viewingHistoricalAtBat || !liveStatus} />
              </div>
            </section>
          )}
        </div>
      )}

      <PlayByPlay
        plays={allPlays}
        selectedInning={selectedInning}
        selectedHalf={selectedHalf}
        selectedAtBatIndex={selectedAtBatIndex}
        onClearInning={handleClearInning}
        onSelectAtBat={(inning, half, atBatIndex) => {
          setSelectedInning(inning)
          setSelectedHalf(half)
          setSelectedAtBatIndex(atBatIndex)
          window.scrollTo({ top: 0, behavior: "smooth" })
        }}
      />
    </div>
  )
}
