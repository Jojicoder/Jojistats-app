import { useEffect, useState } from "react"
import type { LeagueKey, Player, SavedBattingGameEntry, SavedPitchingGameEntry } from "../types"
import { usePitchingStats } from "../hooks/usePitchingStats"
import PitchingTrendChart from "./PitchingTrendChart"
import { calcPitchingMetrics } from "../utils/metrics"
import { getStatColor } from "./mlb/playerStats"

type Props = {
  activePlayer: Player
  entries: SavedPitchingGameEntry[]
  teamEntries?: SavedPitchingGameEntry[]
  battingEntries?: SavedBattingGameEntry[]
  league?: LeagueKey | null
  mode?: "batting" | "pitching"
  onModeChange?: (mode: "batting" | "pitching") => void
}

const statDescriptions: Record<string, string> = {
  IP:   "Innings Pitched",
  ERA:  "Earned Run Average",
  WHIP: "Walks + Hits per Inning",
  "K/9": "Strikeouts per 9 Inn.",
  W:    "Wins",
  HLD:  "Holds",
  SV:   "Saves",
  H:    "Hits Allowed",
  R:    "Runs Allowed",
  ER:   "Earned Runs",
  BB:   "Walks",
  HBP:  "Hit Batters",
  SO:   "Strikeouts",
  HR:   "Home Runs Allowed",
}


function formatResult(entry: SavedPitchingGameEntry) {
  const { result, teamScore, opponentScore } = entry.gameMeta
  if (result === "W" || result === "L" || result === "T") return result
  if (teamScore == null || opponentScore == null) return null
  if (teamScore > opponentScore) return "W"
  if (teamScore < opponentScore) return "L"
  return "T"
}

function formatScore(entry: SavedPitchingGameEntry) {
  const { teamScore, opponentScore } = entry.gameMeta
  if (teamScore == null || opponentScore == null) return null
  return `${teamScore}–${opponentScore}`
}

function formatIP(outs: number) {
  const whole = Math.floor(outs / 3)
  const rem = outs % 3
  return rem === 0 ? `${whole}.0` : `${whole}.${rem}`
}

function formatPitchingRole(role: Player["pitchingRole"]) {
  if (role === "starter") return "SP"
  if (role === "reliever") return "RP"
  if (role === "closer") return "CL"
  return null
}

function resolvePitchingRole(player: Player): Player["pitchingRole"] {
  if (player.pitchingRole) return player.pitchingRole
  return player.positions.includes("P") ? "reliever" : null
}

function formatPlayerPositions(player: Player) {
  const role = formatPitchingRole(resolvePitchingRole(player))
  return player.positions
    .map((position) => position === "P" ? `P / ${role ?? "RP"}` : position)
    .join(", ")
}

function sumOptionalPitchingStat(
  entries: SavedPitchingGameEntry[],
  key: "holds" | "saves"
) {
  return entries.reduce((total, entry) => {
    const statLine = entry.statLine as typeof entry.statLine & Partial<Record<typeof key, number>>
    return total + (Number(statLine[key]) || 0)
  }, 0)
}

export default function MyPitchingStatsPage({
  activePlayer,
  entries,
  teamEntries = [],
  league,
  mode = "pitching",
  onModeChange,
}: Props) {
  const [selectedEntry, setSelectedEntry] = useState<SavedPitchingGameEntry | null>(null)

  useEffect(() => {
    setSelectedEntry(null)
  }, [activePlayer.id])

  const displayedEntries = selectedEntry ? [selectedEntry] : entries
  const statLines = displayedEntries.map((e) => e.statLine)
  const stats = usePitchingStats(statLines)
  const playerMetrics = calcPitchingMetrics(displayedEntries)
  const teamMetrics = calcPitchingMetrics(teamEntries)
  const playerIp = playerMetrics.outs / 3
  const teamIp = teamMetrics.outs / 3
  const pitchingRole = resolvePitchingRole(activePlayer)
  const kPerNine = playerIp > 0 ? (playerMetrics.so * 9) / playerIp : 0
  const wins = displayedEntries.filter((entry) => formatResult(entry) === "W").length
  const holds = sumOptionalPitchingStat(displayedEntries, "holds")
  const saves = sumOptionalPitchingStat(displayedEntries, "saves")
  const roleStatCards =
    pitchingRole === "closer"
      ? [
          { label: "SV", value: String(saves) },
          { label: "ERA", value: stats.era },
          { label: "WHIP", value: stats.whip },
          { label: "K/9", value: kPerNine.toFixed(2) },
        ]
      : pitchingRole === "starter"
        ? [
            { label: "ERA", value: stats.era },
            { label: "WHIP", value: stats.whip },
            { label: "IP", value: stats.ip },
            { label: "K/9", value: kPerNine.toFixed(2) },
            { label: "W", value: String(wins) },
          ]
        : [
            { label: "ERA", value: stats.era },
            { label: "WHIP", value: stats.whip },
            { label: "HLD", value: String(holds) },
            { label: "K/9", value: kPerNine.toFixed(2) },
          ]
  const perInning = (value: number, innings: number) => innings > 0 ? value / innings : 0
  const comparisons: Record<string, { player: number; team: number; lower: boolean; label: string }> = {
    ERA: { player: playerMetrics.era, team: teamMetrics.era, lower: true, label: teamMetrics.era.toFixed(2) },
    WHIP: { player: playerMetrics.whip, team: teamMetrics.whip, lower: true, label: teamMetrics.whip.toFixed(2) },
    H: { player: perInning(playerMetrics.h, playerIp), team: perInning(teamMetrics.h, teamIp), lower: true, label: `${perInning(teamMetrics.h, teamIp).toFixed(2)}/IP` },
    R: { player: perInning(playerMetrics.r, playerIp), team: perInning(teamMetrics.r, teamIp), lower: true, label: `${perInning(teamMetrics.r, teamIp).toFixed(2)}/IP` },
    ER: { player: perInning(playerMetrics.er, playerIp), team: perInning(teamMetrics.er, teamIp), lower: true, label: `${perInning(teamMetrics.er, teamIp).toFixed(2)}/IP` },
    BB: { player: perInning(playerMetrics.bb, playerIp), team: perInning(teamMetrics.bb, teamIp), lower: true, label: `${perInning(teamMetrics.bb, teamIp).toFixed(2)}/IP` },
    HBP: { player: perInning(playerMetrics.hbp, playerIp), team: perInning(teamMetrics.hbp, teamIp), lower: true, label: `${perInning(teamMetrics.hbp, teamIp).toFixed(2)}/IP` },
    SO: { player: perInning(playerMetrics.so, playerIp), team: perInning(teamMetrics.so, teamIp), lower: false, label: `${perInning(teamMetrics.so, teamIp).toFixed(2)}/IP` },
    HR: { player: perInning(playerMetrics.hr, playerIp), team: perInning(teamMetrics.hr, teamIp), lower: true, label: `${perInning(teamMetrics.hr, teamIp).toFixed(2)}/IP` },
  }
  return (
    <main className="min-w-0 w-full">
      <div className="w-full max-w-6xl space-y-5">

        {/* Player Header */}
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Pitching Stats</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
                {activePlayer.jerseyNumber != null
                  ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
                  : activePlayer.name}
              </h1>
              <p className="mt-0.5 text-sm text-gray-400">{formatPlayerPositions(activePlayer)}</p>
            </div>
            {onModeChange && (
              <div className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 sm:inline-flex sm:w-auto sm:shrink-0">
                <button type="button" onClick={() => onModeChange("batting")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "batting" ? "bg-green-900 text-white shadow-sm" : "text-gray-600 hover:text-green-900"}`}>
                  Batting
                </button>
                <button type="button" onClick={() => onModeChange("pitching")}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${mode === "pitching" ? "bg-green-900 text-white shadow-sm" : "text-gray-600 hover:text-green-900"}`}>
                  Pitching
                </button>
              </div>
            )}
          </div>

          {selectedEntry && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-3 py-2.5">
              <p className="text-sm font-semibold text-green-900">
                Showing {selectedEntry.gameMeta.date} vs {selectedEntry.gameMeta.opponent}
              </p>
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-50"
              >
                Clear
              </button>
            </div>
          )}

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Innings Pitched</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{stats.ip}</p>
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {roleStatCards.map(({ label, value }) => {
            const comparison = comparisons[label]
            const useAbsolute = league && (label === "ERA" || label === "WHIP" || label === "K/9" || label === "SV" || label === "HLD" || label === "W")
            const neutral = { bg: "bg-[#f7f8f3]", label: "text-gray-400", value: "text-green-950" }
            const s = useAbsolute
              ? (() => { const c = getStatColor(label, value, league, pitchingRole); return { bg: c.bg, label: c.lbl, value: c.val } })()
              : neutral
            return (
              <div key={label} className={`min-w-0 rounded-2xl p-3 shadow-sm sm:p-4 ${s.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${s.label}`}>{label}</p>
                <p className="mt-0.5 text-xs text-gray-400">{statDescriptions[label]}</p>
                <p className={`mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl ${s.value}`}>{value}</p>
                {comparison && !useAbsolute && <p className="mt-1 text-xs text-gray-400">Team {comparison.label}</p>}
              </div>
            )
          })}
        </section>

        <PitchingTrendChart entries={displayedEntries} league={league} pitchingRole={pitchingRole} />

        <RecentPitchingGames entries={entries} onSelect={setSelectedEntry} selectedId={selectedEntry?.id ?? null} />

      </div>
    </main>
  )
}

function RecentPitchingGames({
  entries,
  onSelect,
  selectedId,
}: {
  entries: SavedPitchingGameEntry[]
  onSelect?: (entry: SavedPitchingGameEntry) => void
  selectedId: string | null
}) {
  const [isExpanded, setIsExpanded] = useState(false)

  const sorted = [...entries].sort((a, b) => {
    const d = b.gameMeta.date.localeCompare(a.gameMeta.date)
    return d !== 0 ? d : b.gameMeta.matchNumber - a.gameMeta.matchNumber
  })

  const visible = isExpanded ? sorted : sorted.slice(0, 5)
  const hasMore = sorted.length > 5

  if (!entries.length) {
    return (
      <section className="rounded-2xl bg-white p-5 shadow-sm">
        <h2 className="text-base font-bold text-gray-900">All Saved Games</h2>
        <div className="mt-4 rounded-xl border border-dashed border-gray-200 px-4 py-8 text-center text-sm text-gray-400">
          No pitching records yet.
        </div>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-gray-900">All Saved Games</h2>
          <p className="mt-0.5 text-xs text-gray-400">Saved pitching results for this player</p>
        </div>
        {hasMore && (
          <button
            type="button"
            onClick={() => setIsExpanded((p) => !p)}
            className="whitespace-nowrap rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
          >
            {isExpanded ? "Show Less" : "Show All"}
          </button>
        )}
      </div>

      <div className="mt-4 space-y-2">
        {visible.map((entry) => {
          const isSelected = selectedId === entry.id
          const result = formatResult(entry)
          const score = formatScore(entry)
          const ip = formatIP(entry.statLine.inningsPitchedOuts)

          return (
            <div
              key={entry.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelect?.(entry)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(entry) }
              }}
              className={`cursor-pointer rounded-xl px-4 py-3 transition ${
                isSelected
                  ? "border border-green-200 bg-green-50"
                  : "bg-[#f7f8f3] hover:bg-[#eef0e9]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900">
                      vs {entry.gameMeta.opponent}
                    </p>
                    {result && (
                      <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-extrabold ${
                        result === "W" ? "bg-green-100 text-green-800" :
                        result === "L" ? "bg-red-50 text-red-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {result}
                      </span>
                    )}
                    {score && (
                      <span className="font-mono text-xs font-semibold text-gray-500">{score}</span>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-gray-400">
                    {entry.gameMeta.date} · #{entry.gameMeta.matchNumber}
                    {entry.gameMeta.location?.trim() ? ` · ${entry.gameMeta.location}` : ""}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-sm font-bold text-green-950">{ip} <span className="text-xs font-normal text-gray-400">IP</span></p>
                  <p className="text-xs text-gray-500">
                    {entry.statLine.earnedRuns} ER · {entry.statLine.strikeouts} K · {entry.statLine.walks} BB
                  </p>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
