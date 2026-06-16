import { useMemo, useState } from "react"
import type {
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import { calcBattingMetrics, calcPitchingMetrics } from "../utils/metrics"

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


export default function Sidebar({
  players,
  activePlayerId,
  setActivePlayerId,
  savedEntriesByPlayer = {},
  pitchingEntriesByPlayer = {},
  mode = "batting",
}: SidebarProps) {
  const [sortByByMode, setSortByByMode] = useState<Record<"batting" | "pitching", SidebarSortKey>>({
    batting: "jersey",
    pitching: "games",
  })
  const sortBy = sortByByMode[mode]

  const playerMetrics = useMemo(() => {
    const map: Record<string, {
      batting: ReturnType<typeof calcBattingMetrics>
      pitching: ReturnType<typeof calcPitchingMetrics>
    }> = {}
    for (const player of players) {
      map[player.id] = {
        batting: calcBattingMetrics(savedEntriesByPlayer[player.id] ?? []),
        pitching: calcPitchingMetrics(pitchingEntriesByPlayer[player.id] ?? []),
      }
    }
    return map
  }, [players, savedEntriesByPlayer, pitchingEntriesByPlayer])

  const sortedPlayers = useMemo(() => {
    const nextPlayers = [...players]

    nextPlayers.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)

      if (sortBy === "position") {
        const pos = a.positions[0].localeCompare(b.positions[0])
        if (pos !== 0) return pos
        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      if (mode === "pitching") {
        const aIsPitcher = a.positions.includes("P")
        const bIsPitcher = b.positions.includes("P")
        const am = playerMetrics[a.id].pitching
        const bm = playerMetrics[b.id].pitching

        if (sortBy === "jersey") {
          if (am.games > 0 && bm.games === 0) return -1
          if (am.games === 0 && bm.games > 0) return 1
          if (aIsPitcher && !bIsPitcher) return -1
          if (!aIsPitcher && bIsPitcher) return 1
          return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
        }

        if (sortBy === "games") {
          const games = bm.games - am.games
          if (games !== 0) return games
          if (aIsPitcher && !bIsPitcher) return -1
          if (!aIsPitcher && bIsPitcher) return 1
          return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
        }
        if (sortBy === "era") {
          const aEra = am.ip > 0 ? am.era : Infinity
          const bEra = bm.ip > 0 ? bm.era : Infinity
          return aEra - bEra
        }
        if (sortBy === "whip") {
          const aWhip = am.ip > 0 ? am.whip : Infinity
          const bWhip = bm.ip > 0 ? bm.whip : Infinity
          return aWhip - bWhip
        }
        if (sortBy === "ip") return bm.ip - am.ip
        if (sortBy === "so") return bm.so - am.so
        if (sortBy === "bb") return am.bb - bm.bb

        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      const am = playerMetrics[a.id].batting
      const bm = playerMetrics[b.id].batting

      if (sortBy === "games") return bm.games - am.games
      if (sortBy === "pa") return bm.pa - am.pa
      if (sortBy === "avg") return bm.avg - am.avg
      if (sortBy === "ops") return bm.ops - am.ops
      if (sortBy === "hr") return bm.hr - am.hr
      if (sortBy === "rbi") return bm.rbi - am.rbi

      return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
    })

    return nextPlayers
  }, [players, playerMetrics, sortBy, mode])

  return (
    <aside className="h-fit w-full shrink-0 rounded-2xl bg-white p-4 shadow-sm lg:w-72 lg:max-w-72">
      <div className="flex min-w-0 flex-col gap-3 lg:block">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900">Team Roster</h2>
          <p className="mt-0.5 text-xs text-gray-400">{players.length} players</p>
        </div>

        <div className="min-w-0 lg:mt-4">
          <label className="block text-xs font-bold uppercase tracking-widest text-gray-400">Sort by</label>
          <select
            value={sortBy}
            onChange={(e) =>
              setSortByByMode((prev) => ({
                ...prev,
                [mode]: e.target.value as SidebarSortKey,
              }))
            }
            className="mt-1 w-full min-w-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600"
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

      <div className="mt-3 flex flex-col gap-2">
        {sortedPlayers.map((player) => {
          const isActive = player.id === activePlayerId
          const battingMetrics = playerMetrics[player.id].batting
          const pitchingMetrics = playerMetrics[player.id].pitching

          return (
            <button
              key={player.id}
              type="button"
              onClick={() => setActivePlayerId(player.id)}
              className={`flex w-full min-w-0 items-center gap-2 rounded-xl px-3 py-2.5 text-left transition ${
                isActive
                  ? "bg-green-900 text-white"
                  : "bg-[#f7f8f3] text-gray-800 hover:bg-[#eef0e9]"
              }`}
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isActive
                  ? "bg-white/20 text-white"
                  : "border border-green-200 bg-green-50 text-green-900"
              }`}>
                {player.jerseyNumber != null ? player.jerseyNumber : "—"}
              </div>

              <div className="min-w-0 flex-1 overflow-hidden">
                <p className="truncate text-sm font-semibold">
                  {player.name}
                </p>
                <p className={`mt-0.5 truncate text-xs ${isActive ? "text-green-200" : "text-gray-400"}`}>
                  {player.positions.join(", ")} · {mode === "pitching" ? pitchingMetrics.games : battingMetrics.games}G
                </p>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}
