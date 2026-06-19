import { useState } from "react"
import { Link } from "react-router-dom"
import type { MLBBoxscorePlayer, MLBGameLiveFeed } from "./types"
import { playerHref } from "./MLBGameDetailsUtils"

export function LineupSidebar({ feed, currentBatterId, battingSide }: {
  feed: MLBGameLiveFeed
  currentBatterId?: number
  battingSide: "away" | "home" | null
}) {
  const [viewSide, setViewSide] = useState<"away" | "home">(battingSide ?? "away")

  const buildLineup = (side: "away" | "home") => {
    const team = feed.liveData?.boxscore?.teams?.[side]
    const order = team?.battingOrder ?? []
    const players = team?.players ?? {}
    const teamId = side === "away" ? feed.gameData?.teams?.away?.id : feed.gameData?.teams?.home?.id
    const lineupBySlot = new Map<number, {
      id: number
      lastName: string
      pos: string
      avg: string
      teamId?: number
      orderNum: number
    }>()

    const addPlayer = (p: MLBBoxscorePlayer | undefined, fallbackSlot?: number) => {
      const id = p?.person?.id
      if (!id) return

      const orderNum = Number(p?.battingOrder ?? "")
      const slot = Number.isFinite(orderNum) && orderNum > 0
        ? Math.floor(orderNum / 100)
        : fallbackSlot
      if (!slot || slot < 1 || slot > 9) return

      const fullName = p?.person?.fullName ?? "—"
      const current = lineupBySlot.get(slot)
      if (current && Number.isFinite(orderNum) && orderNum < current.orderNum) return

      lineupBySlot.set(slot, {
        id,
        lastName: fullName.split(" ").slice(1).join(" ") || fullName,
        pos: p?.position?.abbreviation ?? "",
        avg: p?.seasonStats?.batting?.avg ?? "",
        teamId,
        orderNum: Number.isFinite(orderNum) ? orderNum : fallbackSlot ?? slot,
      })
    }

    Object.values(players).forEach((player) => addPlayer(player))
    order.forEach((id, index) => addPlayer(players[`ID${id}`], index + 1))

    return Array.from(lineupBySlot.entries())
      .sort(([a], [b]) => a - b)
      .map(([, player]) => player)
  }

  const awayAbbr = feed.gameData?.teams?.away?.abbreviation ?? "Away"
  const homeAbbr = feed.gameData?.teams?.home?.abbreviation ?? "Home"
  const awayLineup = buildLineup("away")
  const homeLineup = buildLineup("home")

  if (awayLineup.length === 0 && homeLineup.length === 0) return null

  const lineup = viewSide === "away" ? awayLineup : homeLineup

  return (
    <section className="flex h-full min-h-0 flex-col rounded-2xl bg-white p-4 shadow-sm">
      <p className="shrink-0 text-xs font-bold uppercase tracking-widest text-green-700">Lineup</p>

      <div className="mt-2 shrink-0 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => setViewSide("away")}
          className={`rounded-lg py-2 text-sm font-bold transition ${viewSide === "away" ? "bg-white text-green-900 shadow-sm" : "text-gray-500"}`}
        >
          {awayAbbr}
        </button>
        <button
          type="button"
          onClick={() => setViewSide("home")}
          className={`rounded-lg py-2 text-sm font-bold transition ${viewSide === "home" ? "bg-white text-green-900 shadow-sm" : "text-gray-500"}`}
        >
          {homeAbbr}
        </button>
      </div>

      <div className="mt-2">
        {lineup.map((player, index) => {
          const isCurrent = viewSide === (battingSide ?? "away") && player.id === currentBatterId
          const href = playerHref(player.teamId, player.id)
          const inner = (
            <div className={`flex items-center gap-2 rounded-lg px-2.5 py-2 transition ${
              isCurrent ? "bg-green-900" : "hover:bg-gray-50"
            }`}>
              <span className={`w-5 shrink-0 text-center text-sm font-extrabold ${isCurrent ? "text-green-400" : "text-gray-400"}`}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`truncate text-base font-semibold leading-none ${isCurrent ? "text-white" : "text-gray-800"}`}>
                  {player.lastName}
                </p>
                {player.avg && (
                  <p className={`text-xs leading-tight ${isCurrent ? "text-green-300" : "text-gray-400"}`}>{player.avg}</p>
                )}
              </div>
              <span className={`shrink-0 text-xs font-bold ${isCurrent ? "text-green-300" : "text-gray-400"}`}>
                {player.pos}
              </span>
            </div>
          )
          return href ? (
            <Link key={player.id} to={href} target="_blank" rel="noreferrer">{inner}</Link>
          ) : (
            <div key={player.id}>{inner}</div>
          )
        })}
      </div>
    </section>
  )
}
