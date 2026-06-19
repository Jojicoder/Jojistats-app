import type {
  DisplayStat,
  LeagueKey,
  Player,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
} from "../types"
import { useEffect, useMemo, useState } from "react"
import { calcBattingMetrics, fmtRate } from "../utils/metrics"
import { getStatColor } from "./mlb/playerStats"
import SavedEntriesList from "./SavedEntriesList"
import PerformanceTrendCard from "./PerformanceTrendCard"

type MyStatsPageProps = {
  activePlayer: Player
  calculatedStats: DisplayStat[]
  savedEntries: SavedBattingGameEntry[]
  pitchingEntries?: SavedPitchingGameEntry[]
  teamSavedEntries: SavedBattingGameEntry[]
  seasonYear: number
  league?: LeagueKey | null
  mode?: "batting" | "pitching"
  onModeChange?: (mode: "batting" | "pitching") => void
}

const statDescriptions: Record<string, string> = {
  AVG: "Batting Average",
  OBP: "On-base Percentage",
  OPS: "On-base Plus Slugging",
  "BB/K": "Walks / Strikeouts",
  HR: "Home Runs",
  RBI: "Runs Batted In",
  SB: "Stolen Bases",
  CS: "Caught Stealing",
  "SB%": "Stolen Base Percentage",
  HBP: "Hit By Pitch",
}

function getStatCardStyle(playerValue: number, teamValue: number, hasMinimumSample: boolean) {
  const map: Record<string, { bg: string; label: string; value: string }> = {
    emerald: { bg: "bg-emerald-50",  label: "text-emerald-700", value: "text-emerald-900" },
    green:   { bg: "bg-green-50",    label: "text-green-700",   value: "text-green-900"   },
    neutral: { bg: "bg-[#f7f8f3]",   label: "text-gray-400",    value: "text-green-950"   },
    rose:    { bg: "bg-rose-50",      label: "text-rose-600",    value: "text-rose-900"    },
    red:     { bg: "bg-red-50",       label: "text-red-600",     value: "text-red-900"     },
  }

  if (!hasMinimumSample || !Number.isFinite(playerValue) || teamValue <= 0) return map.neutral
  const ratio = playerValue / teamValue
  if (ratio >= 1.25) return map.emerald
  if (ratio >= 1.08) return map.green
  if (ratio < 0.7) return map.red
  if (ratio < 0.85) return map.rose
  return map.neutral
}

function formatRatio(value: number) { return value.toFixed(2) }

function buildBattingStats(entry: SavedBattingGameEntry): DisplayStat[] {
  const { statLine } = entry
  const singles = Math.max(statLine.H - statLine.doubles - statLine.triples - statLine.HR, 0)
  const totalBases = singles + statLine.doubles * 2 + statLine.triples * 3 + statLine.HR * 4
  const hbp = statLine.HBP ?? 0
  const sf = statLine.SF ?? 0
  const obpDenominator = statLine.AB + statLine.BB + hbp + sf
  const avg = statLine.AB > 0 ? statLine.H / statLine.AB : 0
  const obp = obpDenominator > 0 ? (statLine.H + statLine.BB + hbp) / obpDenominator : 0
  const slg = statLine.AB > 0 ? totalBases / statLine.AB : 0
  const bbPerK = statLine.SO > 0 ? formatRatio(statLine.BB / statLine.SO) : "--"
  const stealAttempts = (statLine.SB ?? 0) + (statLine.CS ?? 0)
  const sbPct = stealAttempts > 0 ? fmtRate((statLine.SB ?? 0) / stealAttempts) : "--"
  return [
    { label: "AVG",  value: fmtRate(avg) },
    { label: "OBP",  value: fmtRate(obp) },
    { label: "OPS",  value: fmtRate(obp + slg) },
    { label: "BB/K", value: bbPerK },
    { label: "HR",   value: String(statLine.HR) },
    { label: "RBI",  value: String(statLine.RBI) },
    { label: "SB",   value: String(statLine.SB ?? 0) },
    { label: "CS",   value: String(statLine.CS ?? 0) },
    { label: "SB%",  value: sbPct },
  ]
}

export default function MyStatsPage({
  activePlayer,
  calculatedStats,
  savedEntries,
  teamSavedEntries,
  seasonYear,
  league,
  mode = "batting",
  onModeChange,
}: MyStatsPageProps) {
  const [selectedEntry, setSelectedEntry] = useState<SavedBattingGameEntry | null>(null)

  useEffect(() => {
    setSelectedEntry(null)
  }, [activePlayer.id])

  const displayedStats = useMemo(
    () => (selectedEntry ? buildBattingStats(selectedEntry) : calculatedStats),
    [calculatedStats, selectedEntry]
  )

  const displayedEntries = useMemo(
    () => (selectedEntry ? [selectedEntry] : savedEntries),
    [savedEntries, selectedEntry]
  )
  const totalPlateAppearances = displayedEntries.reduce(
    (total, entry) =>
      total +
      entry.statLine.AB +
      entry.statLine.BB +
      (entry.statLine.HBP ?? 0) +
      (entry.statLine.SF ?? 0),
    0
  )
  const playerMetrics = useMemo(() => calcBattingMetrics(displayedEntries), [displayedEntries])
  const teamMetrics = useMemo(() => calcBattingMetrics(teamSavedEntries), [teamSavedEntries])
  const teamGames = Math.max(teamMetrics.games, 1)
  const playerGames = Math.max(playerMetrics.games, 1)
  const statComparisons: Record<string, { player: number; team: number; teamLabel: string }> = {
    AVG: { player: playerMetrics.avg, team: teamMetrics.avg, teamLabel: fmtRate(teamMetrics.avg) },
    OBP: { player: playerMetrics.obp, team: teamMetrics.obp, teamLabel: fmtRate(teamMetrics.obp) },
    OPS: { player: playerMetrics.ops, team: teamMetrics.ops, teamLabel: fmtRate(teamMetrics.ops) },
    "BB/K": {
      player: playerMetrics.so > 0 ? playerMetrics.bb / playerMetrics.so : Number.NaN,
      team: teamMetrics.so > 0 ? teamMetrics.bb / teamMetrics.so : 0,
      teamLabel: teamMetrics.so > 0 ? formatRatio(teamMetrics.bb / teamMetrics.so) : "--",
    },
    HR: {
      player: playerMetrics.hr / playerGames,
      team: teamMetrics.hr / teamGames,
      teamLabel: `${(teamMetrics.hr / teamGames).toFixed(2)}/G`,
    },
    RBI: {
      player: playerMetrics.rbi / playerGames,
      team: teamMetrics.rbi / teamGames,
      teamLabel: `${(teamMetrics.rbi / teamGames).toFixed(2)}/G`,
    },
    SB: {
      player: playerMetrics.sb / playerGames,
      team: teamMetrics.sb / teamGames,
      teamLabel: `${(teamMetrics.sb / teamGames).toFixed(2)}/G`,
    },
  }
  const hasMinimumSample = totalPlateAppearances >= 5

  return (
    <main className="min-w-0 w-full">
      <div className="w-full max-w-6xl space-y-5">

        {/* ── Player Header ── */}
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Stats</p>
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
            <div className="min-w-0 rounded-xl bg-[#f7f8f3] px-3 py-3 sm:px-4">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Plate Apps</p>
              <p className="mt-2 text-2xl font-extrabold text-green-950">{totalPlateAppearances}</p>
              <p className="mt-0.5 text-xs text-gray-400">AB + BB + HBP + SF</p>
            </div>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {displayedStats.map((stat) => {
            const comparison = statComparisons[stat.label]
            const noColor = stat.label === "SB" || stat.label === "CS"
            const usesLeagueStandard = Boolean(
              !noColor && league && ["AVG", "OBP", "OPS", "BB/K", "HR"].includes(stat.label)
            )
            const leagueStyle = usesLeagueStandard
              ? (() => { const c = getStatColor(stat.label, stat.value, league); return { bg: c.bg, label: c.lbl, value: c.val } })()
              : null
            const style = leagueStyle ?? ((!noColor && comparison)
              ? getStatCardStyle(comparison.player, comparison.team, hasMinimumSample)
              : getStatCardStyle(0, 0, false))
            return (
              <div key={stat.label} className={`min-w-0 rounded-2xl p-3 shadow-sm sm:p-4 ${style.bg}`}>
                <p className={`text-xs font-bold uppercase tracking-widest ${style.label}`}>
                  {stat.label}
                </p>
                <p className="mt-0.5 text-xs text-gray-400">{statDescriptions[stat.label]}</p>
                <p className={`mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl ${style.value}`}>
                  {stat.value}
                </p>
                {comparison && !leagueStyle && (
                  <p className="mt-1 text-xs text-gray-400">Team {comparison.teamLabel}</p>
                )}
              </div>
            )
          })}
        </section>

        <PerformanceTrendCard
          playerEntries={displayedEntries}
          teamEntries={teamSavedEntries}
          seasonYear={seasonYear}
        />

        <SavedEntriesList
          savedEntries={savedEntries.slice().reverse()}
          title="All Saved Games"
          emptyMessage="No games recorded yet."
          onSelect={setSelectedEntry}
        />
      </div>
    </main>
  )
}

function formatPitchingRole(role: Player["pitchingRole"]) {
  if (role === "starter") return "SP"
  if (role === "reliever") return "RP"
  if (role === "closer") return "CL"
  return null
}

function formatPlayerPositions(player: Player) {
  const role = formatPitchingRole(player.pitchingRole)
  return player.positions
    .map((position) => position === "P" ? `P / ${role ?? "RP"}` : position)
    .join(", ")
}
