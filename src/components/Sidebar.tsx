import { useMemo, useState } from "react"
import type {
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"

type SidebarSortKey =
  | "jersey"
  | "name"
  | "position"
  | "games"
  | "pa"
  | "avg"
  | "ops"
  | "hr"
  | "rbi"
  | "era"
  | "whip"
  | "ip"
  | "so"
  | "bb"

type SidebarProps = {
  players: Player[]
  activePlayerId: string
  setActivePlayerId: (playerId: string) => void
  savedEntriesByPlayer?: Record<string, SavedBattingGameEntry[]>
  pitchingEntriesByPlayer?: Record<string, SavedPitchingGameEntry[]>
  mode?: "batting" | "pitching"
}

function getPlayerTotals(entries: SavedBattingGameEntry[]) {
  return entries.reduce(
    (acc, entry) => {
      acc.ab += entry.statLine.AB
      acc.h += entry.statLine.H
      acc.doubles += entry.statLine.doubles
      acc.triples += entry.statLine.triples
      acc.hr += entry.statLine.HR
      acc.rbi += entry.statLine.RBI
      acc.bb += entry.statLine.BB
      return acc
    },
    { ab: 0, h: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, bb: 0 }
  )
}

function getPlayerMetrics(entries: SavedBattingGameEntry[]) {
  const totals = getPlayerTotals(entries)
  const pa = totals.ab + totals.bb
  const avg = totals.ab > 0 ? totals.h / totals.ab : 0
  const obp = pa > 0 ? (totals.h + totals.bb) / pa : 0

  const singles = Math.max(
    totals.h - totals.doubles - totals.triples - totals.hr,
    0
  )

  const totalBases =
    singles + totals.doubles * 2 + totals.triples * 3 + totals.hr * 4

  const slg = totals.ab > 0 ? totalBases / totals.ab : 0
  const ops = obp + slg

  return {
    games: entries.length,
    pa,
    avg,
    ops,
    hr: totals.hr,
    rbi: totals.rbi,
  }
}

function getPitchingMetrics(entries: SavedPitchingGameEntry[]) {
  const totals = entries.reduce(
    (acc, entry) => {
      acc.outs += entry.statLine.inningsPitchedOuts
      acc.h += entry.statLine.hitsAllowed
      acc.er += entry.statLine.earnedRuns
      acc.bb += entry.statLine.walks
      acc.so += entry.statLine.strikeouts
      return acc
    },
    { outs: 0, h: 0, er: 0, bb: 0, so: 0 }
  )

  const ip = totals.outs / 3
  const era = ip > 0 ? (totals.er * 9) / ip : 999
  const whip = ip > 0 ? (totals.bb + totals.h) / ip : 999

  return {
    games: entries.length,
    ip,
    era,
    whip,
    so: totals.so,
    bb: totals.bb,
  }
}

export default function Sidebar({
  players,
  activePlayerId,
  setActivePlayerId,
  savedEntriesByPlayer = {},
  pitchingEntriesByPlayer = {},
  mode = "batting",
}: SidebarProps) {
  const [sortBy, setSortBy] = useState<SidebarSortKey>("jersey")

  const sortedPlayers = useMemo(() => {
    const nextPlayers = [...players]

    nextPlayers.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)

      if (sortBy === "position") {
        const pos = a.position.localeCompare(b.position)
        if (pos !== 0) return pos
        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      if (mode === "pitching") {
        const aIsPitcher = a.position === "P"
        const bIsPitcher = b.position === "P"

        if (sortBy === "jersey") {
          if (aIsPitcher && !bIsPitcher) return -1
          if (!aIsPitcher && bIsPitcher) return 1
          return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
        }

        const aMetrics = getPitchingMetrics(pitchingEntriesByPlayer[a.id] ?? [])
        const bMetrics = getPitchingMetrics(pitchingEntriesByPlayer[b.id] ?? [])

        if (sortBy === "games") return bMetrics.games - aMetrics.games
        if (sortBy === "era") return aMetrics.era - bMetrics.era
        if (sortBy === "whip") return aMetrics.whip - bMetrics.whip
        if (sortBy === "ip") return bMetrics.ip - aMetrics.ip
        if (sortBy === "so") return bMetrics.so - aMetrics.so
        if (sortBy === "bb") return aMetrics.bb - bMetrics.bb

        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      const aMetrics = getPlayerMetrics(savedEntriesByPlayer[a.id] ?? [])
      const bMetrics = getPlayerMetrics(savedEntriesByPlayer[b.id] ?? [])

      if (sortBy === "games") return bMetrics.games - aMetrics.games
      if (sortBy === "pa") return bMetrics.pa - aMetrics.pa
      if (sortBy === "avg") return bMetrics.avg - aMetrics.avg
      if (sortBy === "ops") return bMetrics.ops - aMetrics.ops
      if (sortBy === "hr") return bMetrics.hr - aMetrics.hr
      if (sortBy === "rbi") return bMetrics.rbi - aMetrics.rbi

      return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
    })

    return nextPlayers
  }, [
    players,
    savedEntriesByPlayer,
    pitchingEntriesByPlayer,
    sortBy,
    mode,
  ])

  return (
    <aside className="w-full shrink-0 rounded-xl bg-white p-2 shadow-sm lg:max-w-[240px] lg:rounded-2xl lg:p-4">
      {/* モバイル: 1行 / デスクトップ: 縦積み */}
      <div className="flex items-center justify-between gap-2 lg:block">
        <div>
          <p className="text-base font-semibold text-gray-800 lg:text-lg">Team Roster</p>
          <p className="hidden text-sm text-gray-500 lg:mt-1 lg:block">{players.length} players</p>
        </div>

        <div className="flex items-center gap-2 lg:mt-4 lg:max-w-xs lg:flex-col lg:items-start lg:gap-0">
          <span className="text-xs font-medium text-gray-500 lg:hidden">Sort:</span>
          <label className="hidden text-xs font-medium text-gray-500 lg:block">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SidebarSortKey)}
            className="max-w-36 rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs lg:mt-1 lg:w-full lg:max-w-none lg:px-3 lg:py-2 lg:text-sm"
          >
            <option value="jersey">Jersey Number</option>
            <option value="name">Name</option>
            <option value="position">Position</option>
            <option value="games">Games Played</option>

            {mode === "batting" ? (
              <>
                <option value="pa">PA</option>
                <option value="avg">AVG</option>
                <option value="ops">OPS</option>
                <option value="hr">HR</option>
                <option value="rbi">RBI</option>
              </>
            ) : (
              <>
                <option value="era">ERA</option>
                <option value="whip">WHIP</option>
                <option value="ip">IP</option>
                <option value="so">SO</option>
                <option value="bb">BB</option>
              </>
            )}
          </select>
        </div>
      </div>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-3 lg:overflow-visible lg:pb-0">
        {sortedPlayers.map((player) => {
          const isActive = player.id === activePlayerId
          const battingMetrics = getPlayerMetrics(
            savedEntriesByPlayer[player.id] ?? []
          )
          const pitchingMetrics = getPitchingMetrics(
            pitchingEntriesByPlayer[player.id] ?? []
          )

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => setActivePlayerId(player.id)}
              className={`flex min-w-[150px] items-center gap-2 rounded-xl px-3 py-3 text-left transition lg:min-w-0 lg:gap-3 lg:rounded-2xl lg:px-4 lg:py-4 ${
                isActive
                  ? "bg-green-900 text-white"
                  : "bg-gray-50 text-gray-800 hover:bg-gray-100"
              }`}
            >
              <div
                className={`h-8 w-8 shrink-0 rounded-full lg:h-10 lg:w-10 ${
                  isActive ? "bg-white/20" : "bg-gray-300"
                }`}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold lg:text-base">
                  {player.jerseyNumber != null
                    ? `#${player.jerseyNumber} ${player.name}`
                    : player.name}
                </p>

                <p
                  className={`mt-1 text-xs lg:text-sm ${
                    isActive ? "text-green-100" : "text-gray-500"
                  }`}
                >
                  {player.position} · G{" "}
                  {mode === "pitching"
                    ? pitchingMetrics.games
                    : battingMetrics.games}
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
