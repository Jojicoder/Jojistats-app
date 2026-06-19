import type { MLBBoxscorePlayer, MLBGameLiveFeed, MLBOffense, MLBPlay } from "./types"

export const PITCH_COLORS: Record<string, string> = {
  FF: "#2563eb",
  SI: "#0891b2",
  FC: "#7c3aed",
  SL: "#dc2626",
  CU: "#ea580c",
  CH: "#16a34a",
  FS: "#0d9488",
  KC: "#f59e0b",
}

export function formatInning(play: MLBPlay) {
  const half = play.about?.halfInning
  const inning = play.about?.inning
  if (!half || !inning) return ""
  return `${half === "top" ? "Top" : "Bot"} ${inning}`
}

export function getAtBatResultStyle(play?: MLBPlay) {
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

export function playerImage(id?: number) {
  return id
    ? `https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${id}/headshot/67/current`
    : ""
}

export function teamLogoUrl(id?: number) {
  return id ? `https://www.mlbstatic.com/team-logos/${id}.svg` : ""
}

export function findPlayer(feed: MLBGameLiveFeed, playerId?: number): MLBBoxscorePlayer | undefined {
  if (!playerId) return undefined
  const key = `ID${playerId}`
  return (
    feed.liveData?.boxscore?.teams?.away?.players?.[key] ??
    feed.liveData?.boxscore?.teams?.home?.players?.[key]
  )
}

export function findPlayerTeamId(feed: MLBGameLiveFeed, playerId?: number): number | undefined {
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

export function playerHref(teamId: number | undefined, playerId: number | undefined): string | undefined {
  if (!teamId || !playerId) return undefined
  return `/mlb?teamId=${teamId}&view=players&playerId=${playerId}`
}

export function getRunnersBeforeAtBat(
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
