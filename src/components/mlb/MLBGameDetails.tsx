import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getGameLiveFeed } from "./api"
import type {
  MLBBoxscorePlayer,
  MLBGameLiveFeed,
  MLBOffense,
  MLBPlay,
  MLBPlayEvent,
} from "./types"

type MLBGameDetailsProps = {
  gamePk: number
  isLive: boolean
  backHref: string
}

const PITCH_COLORS: Record<string, string> = {
  FF: "#2563eb",
  SI: "#0891b2",
  FC: "#7c3aed",
  SL: "#dc2626",
  CU: "#ea580c",
  CH: "#16a34a",
  FS: "#0d9488",
  KC: "#f59e0b",
}

function formatInning(play: MLBPlay) {
  const half = play.about?.halfInning
  const inning = play.about?.inning
  if (!half || !inning) return ""
  return `${half === "top" ? "Top" : "Bot"} ${inning}`
}

function getAtBatResultStyle(play?: MLBPlay) {
  const eventType = play?.result?.eventType ?? ""
  const event = play?.result?.event ?? "At-Bat Result"
  const scoring = Boolean(play?.result?.rbi) || eventType.includes("home_run")
  const hit = ["single", "double", "triple", "home_run"].includes(eventType)
  const onBase = [
    "walk",
    "intent_walk",
    "hit_by_pitch",
    "catcher_interf",
    "field_error",
  ].includes(eventType)

  if (scoring) {
    return { label: event, box: "border-amber-300 bg-amber-50", badge: "bg-amber-500 text-white", text: "text-amber-950" }
  }
  if (hit) {
    return { label: event, box: "border-emerald-300 bg-emerald-50", badge: "bg-emerald-600 text-white", text: "text-emerald-950" }
  }
  if (onBase) {
    return { label: event, box: "border-blue-300 bg-blue-50", badge: "bg-blue-600 text-white", text: "text-blue-950" }
  }
  return { label: event, box: "border-gray-300 bg-gray-50", badge: "bg-gray-700 text-white", text: "text-gray-900" }
}

function playerImage(id?: number) {
  return id
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`
    : ""
}

function teamLogoUrl(id?: number) {
  return id ? `https://www.mlbstatic.com/team-logos/${id}.svg` : ""
}

function PlayerHeadshot({
  id,
  name = "",
  className,
}: {
  id?: number
  name?: string
  className: string
}) {
  if (!id) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 text-xs font-bold text-gray-400 ${className}`}>
        TBD
      </div>
    )
  }

  return <img src={playerImage(id)} alt={name} className={className} />
}

function findPlayer(feed: MLBGameLiveFeed, playerId?: number): MLBBoxscorePlayer | undefined {
  if (!playerId) return undefined
  const key = `ID${playerId}`
  return (
    feed.liveData?.boxscore?.teams?.away?.players?.[key] ??
    feed.liveData?.boxscore?.teams?.home?.players?.[key]
  )
}

function findPlayerTeamId(feed: MLBGameLiveFeed, playerId?: number): number | undefined {
  if (!playerId) return undefined
  const key = `ID${playerId}`
  if (feed.liveData?.boxscore?.teams?.away?.players?.[key]) {
    return feed.gameData?.teams?.away?.id
  }
  if (feed.liveData?.boxscore?.teams?.home?.players?.[key]) {
    return feed.gameData?.teams?.home?.id
  }
  return undefined
}

function playerHref(teamId: number | undefined, playerId: number | undefined): string | undefined {
  if (!teamId || !playerId) return undefined
  return `/mlb?teamId=${teamId}&view=players&playerId=${playerId}`
}

function getRunnersBeforeAtBat(
  plays: MLBPlay[],
  inning?: number,
  half?: "top" | "bottom" | null,
  atBatIndex?: number
): MLBOffense {
  const bases: Record<"1B" | "2B" | "3B", { id?: number; fullName?: string } | undefined> = {
    "1B": undefined,
    "2B": undefined,
    "3B": undefined,
  }

  for (const play of plays) {
    if (play.about?.inning !== inning || play.about?.halfInning !== half) {
      continue
    }

    if (
      atBatIndex !== undefined &&
      play.atBatIndex !== undefined &&
      play.atBatIndex >= atBatIndex
    ) {
      break
    }

    for (const runner of play.runners ?? []) {
      const person = runner.details?.runner
      const start = runner.movement?.start
      const end = runner.movement?.end

      if (person?.id !== undefined) {
        for (const base of ["1B", "2B", "3B"] as const) {
          if (bases[base]?.id === person.id) bases[base] = undefined
        }
      } else if (start === "1B" || start === "2B" || start === "3B") {
        bases[start] = undefined
      }

      if (
        !runner.movement?.isOut &&
        person &&
        (end === "1B" || end === "2B" || end === "3B")
      ) {
        bases[end] = person
      }
    }
  }

  return {
    first: bases["1B"],
    second: bases["2B"],
    third: bases["3B"],
  }
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
      <Link to={href} className="flex min-w-0 items-center gap-2.5 rounded-xl bg-gray-50 p-2.5 transition hover:bg-gray-100">
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

function PitchChart({ events, expanded = false }: { events: MLBPlayEvent[]; expanded?: boolean }) {
  const pitches = events.filter(
    (event) =>
      event.pitchData?.coordinates?.pX !== undefined &&
      event.pitchData?.coordinates?.pZ !== undefined
  )

  if (pitches.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
        <p className="font-semibold text-gray-700">Pitch location data is not available</p>
        <p className="mt-1 text-xs text-gray-400">
          Statcast tracking data is not available for this game (e.g. Spring Training, international games, or certain archived games).
        </p>
      </div>
    )
  }

  return (
    <div className={`grid gap-5 ${expanded ? "lg:grid-cols-[380px_1fr]" : "md:grid-cols-[320px_1fr]"}`}>
      <div className={`relative mx-auto overflow-hidden rounded-xl bg-[#1a2e1a] ${
        expanded
          ? "h-72 w-full max-w-60 md:h-96 md:max-w-84"
          : "h-64 w-full max-w-56 md:h-80 md:max-w-72"
      }`}>
        {/* Home plate area hint */}
        <div className="absolute bottom-[6%] left-1/2 h-[7%] w-[34%] -translate-x-1/2 rounded-sm bg-[#2a3e2a] opacity-60" />
        {/* Strike zone – wider and taller */}
        <div className="absolute left-[12%] top-[8%] h-[74%] w-[76%] border-2 border-white/60 bg-white/5">
          <span className="absolute left-1/3 top-0 h-full border-l border-white/25" />
          <span className="absolute left-2/3 top-0 h-full border-l border-white/25" />
          <span className="absolute left-0 top-1/3 w-full border-t border-white/25" />
          <span className="absolute left-0 top-2/3 w-full border-t border-white/25" />
        </div>
        <p className="absolute left-1/2 top-[10%] -translate-x-1/2 text-[9px] font-bold uppercase tracking-widest text-white/40">Strike Zone</p>
        {pitches.map((event, index) => {
          const x = Math.max(4, Math.min(96, 50 + (event.pitchData?.coordinates?.pX ?? 0) * 23))
          const z = Math.max(4, Math.min(96, 92 - (event.pitchData?.coordinates?.pZ ?? 0) * 20))
          const code = event.details?.type?.code ?? ""
          return (
            <span
              key={event.index ?? index}
              title={`${index + 1}. ${event.details?.type?.description ?? "Pitch"} ${event.pitchData?.startSpeed?.toFixed(1) ?? ""} mph`}
              className="absolute flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 text-[10px] font-extrabold text-white shadow-lg"
              style={{
                left: `${x}%`,
                top: `${z}%`,
                backgroundColor: PITCH_COLORS[code] ?? "#4b5563",
              }}
            >
              {index + 1}
            </span>
          )
        })}
      </div>

      <ol className={expanded ? "grid content-start gap-2 lg:grid-cols-2" : "max-h-128 space-y-2 overflow-y-auto pr-1"}>
        {pitches.map((event, index) => (
          <li key={event.index ?? index} className="flex items-center justify-between gap-3 rounded-xl bg-gray-50 px-3 py-2.5 transition hover:bg-gray-100">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold text-white shadow-sm"
                style={{ backgroundColor: PITCH_COLORS[event.details?.type?.code ?? ""] ?? "#4b5563" }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">
                  {event.details?.type?.description ?? "Pitch"} · {event.details?.description ?? ""}
                </p>
                <p className="text-xs text-gray-400">
                  {event.pitchData?.startSpeed?.toFixed(1) ?? "—"} mph
                  {event.pitchData?.breaks?.spinRate ? ` · ${Math.round(event.pitchData.breaks.spinRate)} rpm` : ""}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-bold tabular-nums text-gray-500 shadow-sm ring-1 ring-gray-200">
              {event.count?.balls ?? 0}-{event.count?.strikes ?? 0}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ScoreHero({ feed, liveStatus, finalStatus }: {
  feed: MLBGameLiveFeed
  liveStatus: boolean
  finalStatus: boolean
}) {
  const linescore = feed.liveData?.linescore
  const away = feed.gameData?.teams?.away
  const home = feed.gameData?.teams?.home
  const awayScore = linescore?.teams?.away?.runs ?? 0
  const homeScore = linescore?.teams?.home?.runs ?? 0
  const awayWinning = finalStatus && awayScore > homeScore
  const homeWinning = finalStatus && homeScore > awayScore

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      {/* Away team */}
      <Link
        to={away?.id ? `/mlb/teams/${away.id}` : "#"}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 transition hover:bg-gray-50 ${finalStatus && !awayWinning ? "opacity-55" : ""}`}
      >
        {away?.id && (
          <img
            src={teamLogoUrl(away.id)}
            alt={away.name}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-800">{away?.teamName ?? away?.name ?? "Away"}</p>
          <p className="text-[10px] text-gray-400">{away?.abbreviation ?? "AWY"}</p>
        </div>
      </Link>

      {/* Score */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex items-center gap-2.5">
          <span className={`text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl ${
            finalStatus && awayWinning ? "text-gray-900" : finalStatus && !awayWinning ? "text-gray-400" : "text-gray-900"
          }`}>
            {awayScore}
          </span>
          <span className="text-lg font-light text-gray-300">–</span>
          <span className={`text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl ${
            finalStatus && homeWinning ? "text-gray-900" : finalStatus && !homeWinning ? "text-gray-400" : "text-gray-900"
          }`}>
            {homeScore}
          </span>
        </div>
        {liveStatus && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {linescore?.inningHalf ?? ""} {linescore?.currentInningOrdinal ?? ""}
            </span>
          </div>
        )}
        {finalStatus && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Final</span>
        )}
        {!liveStatus && !finalStatus && (
          <span className="text-[10px] font-semibold text-blue-600">{feed.gameData?.status?.detailedState ?? ""}</span>
        )}
      </div>

      {/* Home team */}
      <Link
        to={home?.id ? `/mlb/teams/${home.id}` : "#"}
        className={`flex min-w-0 flex-1 flex-row-reverse items-center gap-2 rounded-xl p-1 transition hover:bg-gray-50 ${finalStatus && !homeWinning ? "opacity-55" : ""}`}
      >
        {home?.id && (
          <img
            src={teamLogoUrl(home.id)}
            alt={home.name}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />
        )}
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-bold text-gray-800">{home?.teamName ?? home?.name ?? "Home"}</p>
          <p className="text-[10px] text-gray-400">{home?.abbreviation ?? "HME"}</p>
        </div>
      </Link>
    </div>
  )
}

function Scoreboard({
  feed,
  selectedInning,
  selectedHalf,
  onSelectHalfInning,
}: {
  feed: MLBGameLiveFeed
  selectedInning: number | null
  selectedHalf: "top" | "bottom" | null
  onSelectHalfInning: (inning: number, half: "top" | "bottom") => void
}) {
  const linescore = feed.liveData?.linescore
  const innings = linescore?.innings ?? []
  const allPlays = feed.liveData?.plays?.allPlays ?? []
  const inningNumbers = innings.length > 0
    ? innings.map((inning) => inning.num ?? 0)
    : Array.from({ length: 9 }, (_, index) => index + 1)

  function hasPlaysForHalf(inning: number, half: "top" | "bottom") {
    return allPlays.some(
      (play) => play.about?.inning === inning && play.about?.halfInning === half
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-50 ring-1 ring-gray-100">
      <table className="w-full min-w-155 text-center text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400">
            <th className="px-3 py-2.5 text-left">Team</th>
            {inningNumbers.map((inning) => (
              <th key={inning} className="px-2 py-2.5 font-bold">
                {inning}
              </th>
            ))}
            <th className="border-l border-gray-200 px-3 py-2.5 font-extrabold text-gray-600">R</th>
            <th className="px-3 py-2.5 font-bold">H</th>
            <th className="px-3 py-2.5 font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {(["away", "home"] as const).map((side, sideIndex) => {
            const team = feed.gameData?.teams?.[side]
            const total = linescore?.teams?.[side]
            const half = side === "away" ? "top" : "bottom"
            const isWinner = (side === "away" && (total?.runs ?? 0) > (linescore?.teams?.home?.runs ?? 0)) ||
                             (side === "home" && (total?.runs ?? 0) > (linescore?.teams?.away?.runs ?? 0))
            const isFinal = feed.gameData?.status?.abstractGameState === "Final"
            return (
              <tr key={side} className={`font-bold text-gray-800 ${sideIndex === 0 ? "" : "border-t border-gray-200"}`}>
                <td className="px-3 py-3 text-left">
                  <Link
                    to={team?.id ? `/mlb/teams/${team.id}` : "#"}
                    className="flex items-center gap-2 rounded-lg transition hover:opacity-75"
                  >
                    {team?.id && (
                      <img src={teamLogoUrl(team.id)} alt="" className="h-6 w-6 object-contain" />
                    )}
                    <span className="max-w-36 truncate text-sm font-bold text-gray-900">{team?.name ?? side}</span>
                    {isFinal && isWinner && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">W</span>
                    )}
                  </Link>
                </td>
                {inningNumbers.map((inning) => {
                  const inningData = innings.find((entry) => entry.num === inning)?.[side]
                  const isSelected = selectedInning === inning && selectedHalf === half
                  const hasData = hasPlaysForHalf(inning, half)
                  return (
                    <td key={inning} className="px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectHalfInning(inning, half)}
                        disabled={!hasData}
                        aria-label={`View ${half} of inning ${inning} play-by-play`}
                        className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition ${
                          isSelected
                            ? "bg-green-600 text-white shadow-sm"
                            : hasData
                            ? "text-gray-700 hover:bg-white hover:shadow-sm"
                            : "cursor-not-allowed text-gray-300"
                        }`}
                      >
                        {inningData?.runs ?? "–"}
                      </button>
                    </td>
                  )
                })}
                <td className="border-l border-gray-200 px-3 py-3 text-lg font-extrabold text-gray-900">{total?.runs ?? 0}</td>
                <td className="px-3 py-3 text-gray-600">{total?.hits ?? 0}</td>
                <td className="px-3 py-3 text-gray-400">{total?.errors ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
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
            <Link key={label} to={href} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 transition hover:bg-gray-100">
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

function PlayByPlay({
  plays,
  selectedInning,
  selectedHalf,
  selectedAtBatIndex,
  onClearInning,
  onSelectAtBat,
}: {
  plays: MLBPlay[]
  selectedInning: number | null
  selectedHalf: "top" | "bottom" | null
  selectedAtBatIndex: number | null
  onClearInning: () => void
  onSelectAtBat: (inning: number, half: "top" | "bottom", atBatIndex: number) => void
}) {
  const [showAll, setShowAll] = useState(false)
  const groups = useMemo(() => {
    const map = new Map<number, MLBPlay[]>()
    plays.filter((play) => play.result?.description).forEach((play) => {
      const inning = play.about?.inning ?? 0
      map.set(inning, [...(map.get(inning) ?? []), play])
    })
    return [...map.entries()].sort((a, b) => b[0] - a[0])
  }, [plays])
  const selectedGroup = selectedInning === null || selectedHalf === null
    ? null
    : (() => {
        const group = groups.find(([inning]) => inning === selectedInning)
        if (!group) return undefined
        return [
          group[0],
          group[1].filter((play) => play.about?.halfInning === selectedHalf),
        ] as [number, MLBPlay[]]
      })()
  const visibleGroups = selectedInning !== null
    ? selectedGroup ? [selectedGroup] : []
    : showAll ? groups : groups.slice(0, 3)

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">Play-by-Play</p>
          <h2 className="mt-0.5 text-lg font-extrabold text-gray-900">
            {selectedInning && selectedHalf
              ? `${selectedHalf === "top" ? "Top" : "Bottom"} ${selectedInning}`
              : "Inning Summary"}
          </h2>
        </div>
        {selectedInning !== null ? (
          <button
            type="button"
            onClick={onClearInning}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
          >
            All innings
          </button>
        ) : groups.length > 3 && (
          <button
            type="button"
            onClick={() => setShowAll((current) => !current)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-semibold text-gray-500 transition hover:bg-gray-100"
          >
            {showAll ? "Show recent" : "Show all"}
          </button>
        )}
      </div>
      <div className="mt-4 space-y-5">
        {visibleGroups.map(([inning, inningPlays]) => (
          <section key={inning}>
            <div className="mb-2 flex items-center gap-2">
              <div className="h-px flex-1 bg-gray-100" />
              <h3 className="text-xs font-extrabold uppercase tracking-widest text-gray-400">Inning {inning}</h3>
              <div className="h-px flex-1 bg-gray-100" />
            </div>
            <ol className="space-y-2">
              {[...inningPlays].reverse().map((play, index) => {
                const scoring = Boolean(play.result?.rbi) || (play.result?.eventType ?? "").includes("home_run")
                const half = play.about?.halfInning as "top" | "bottom" | undefined
                const canSelect = play.result?.event != null && half != null && play.atBatIndex != null
                const isSelected = play.atBatIndex != null && play.atBatIndex === selectedAtBatIndex
                return (
                  <li
                    key={`${play.atBatIndex ?? index}-${play.result?.description}`}
                    className={`rounded-xl border transition ${
                      scoring
                        ? isSelected
                          ? "border-amber-400 bg-amber-100"
                          : "border-amber-200 bg-amber-50"
                        : isSelected
                        ? "border-green-300 bg-green-50"
                        : "border-gray-100 bg-gray-50"
                    } ${canSelect ? "cursor-pointer hover:shadow-sm" : ""}`}
                    onClick={
                      canSelect
                        ? () => onSelectAtBat(inning, half!, play.atBatIndex!)
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3 px-3 py-2.5">
                      <p className="text-sm text-gray-700">{play.result?.description}</p>
                      <span className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold tabular-nums shadow-sm ring-1 ${
                        isSelected ? "bg-green-600 text-white ring-green-500" : "bg-white text-gray-400 ring-gray-100"
                      }`}>
                        {formatInning(play)}
                      </span>
                    </div>
                    {(play.result?.awayScore !== undefined || play.result?.homeScore !== undefined) && (
                      <p className={`px-3 pb-2.5 text-xs font-bold ${scoring ? "text-amber-700" : "text-gray-400"}`}>
                        {scoring && "★ "}Score {play.result?.awayScore ?? 0}–{play.result?.homeScore ?? 0}
                      </p>
                    )}
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
        {visibleGroups.length === 0 && (
          <p className="py-4 text-center text-sm text-gray-400">
            No play-by-play available for the selected half-inning.
          </p>
        )}
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
        (play) =>
          play.about?.inning === selectedInning &&
          play.about?.halfInning === selectedHalf &&
          play.result?.event != null   // exclude non-at-bat actions (pickoffs, steals, etc.)
      )
  const selectedPlayPosition = selectedAtBatIndex === null
    ? -1
    : inningPlays.findIndex((play) => play.atBatIndex === selectedAtBatIndex)
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
      (play) =>
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
      {/* Game header card */}
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm">
        {/* Top bar with controls */}
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

        {/* Score hero */}
        <div className="px-4 py-1.5">
          <ScoreHero feed={feed} liveStatus={liveStatus} finalStatus={finalStatus} />
        </div>

        {/* Venue + date bar */}
        <div className="border-t border-gray-100 bg-gray-50 px-4 py-1.5 text-center">
          <p className="text-xs text-gray-400">
            {feed.gameData?.venue?.name ?? ""}
            {feed.gameData?.datetime?.dateTime
              ? ` · ${new Date(feed.gameData.datetime.dateTime).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}`
              : ""}
          </p>
        </div>

        {/* Scoreboard */}
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

      {/* For completed games with no at-bat selected, prompt the user */}
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
            ? "xl:grid-cols-[minmax(360px,0.8fr)_minmax(0,1.4fr)] xl:items-stretch"
            : "grid-cols-1"
        }`}>
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
            <section className="h-full rounded-2xl bg-white p-3 shadow-sm sm:p-4">
              <p className="text-[10px] font-bold uppercase tracking-widest text-green-700">
                {viewingHistoricalAtBat
                  ? `${selectedHalf === "top" ? "Top" : "Bottom"} ${selectedInning} · At-Bat ${selectedPlayPosition + 1}`
                  : liveStatus ? "Current At-Bat" : "Final At-Bat"}
              </p>
              <h2 className="mt-0.5 text-lg font-extrabold text-gray-900">Pitch Location</h2>
              <div className="mt-3">
                <PitchChart events={pitchEvents} expanded={!liveStatus} />
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
