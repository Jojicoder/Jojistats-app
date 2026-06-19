import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getPlayerGameLog,
  getPlayerStats,
  getRoster,
  getTeamStats,
  MLB_SEASON,
} from "../../api/mlb"
import BatterZoneMap from "./BatterZoneMap"
import MLBGameLog from "./MLBGameLog"
import MLBTrendChart from "./MLBTrendChart"
import MLBRosterSidebar from "./MLBRosterSidebar"
import { enrichStats, getStatColor, HITTING_CARDS, PITCHING_CARDS, SP_PITCHING_CARDS, RP_PITCHING_CARDS, CL_PITCHING_CARDS } from "./playerStats"
import type { GameLogSplit, MLBTeam, MLBTeamStats, RosterPlayer } from "./types"

type PlayersTabProps = {
  teams: MLBTeam[]
  selectedTeamId: number | null
  initialPlayerId?: number | null
}

type RosterSort = "az" | "pos" | "num"
type PitchingRole = "starter" | "reliever" | "closer"

const POS_ORDER: Record<string, number> = {
  SP: 0, RP: 1, CL: 2, P: 3,
  C: 4, "1B": 5, "2B": 6, "3B": 7, SS: 8,
  LF: 9, CF: 10, RF: 11, OF: 12, DH: 13,
}

function getDefaultStatsMode(player: RosterPlayer): "hitting" | "pitching" {
  return ["P", "SP", "RP", "CL"].includes(player.position.abbreviation) ? "pitching" : "hitting"
}

function inferPitchingRole(player: RosterPlayer | null, stats: Record<string, unknown> | null): PitchingRole | null {
  const pos = player?.position.abbreviation
  if (pos === "SP") return "starter"
  if (pos === "RP") return "reliever"
  if (pos === "CL") return "closer"
  if (pos !== "P") return null

  const gamesStarted = Number(stats?.gamesStarted ?? 0)
  const saves = Number(stats?.saves ?? 0)
  const holds = Number(stats?.holds ?? 0)
  const gamesFinished = Number(stats?.gamesFinished ?? 0)

  if (saves > 0 && saves >= Math.max(holds, gamesStarted)) return "closer"
  if (gamesStarted > 0) return "starter"
  if (holds > 0 || gamesFinished > 0 || stats) return "reliever"
  return null
}

export default function PlayersTab({
  teams,
  selectedTeamId,
  initialPlayerId = null,
}: PlayersTabProps) {
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [rosterSort, setRosterSort] = useState<RosterSort>("az")
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null)
  const [statsMode, setStatsMode] = useState<"hitting" | "pitching">("hitting")
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [gameLog, setGameLog] = useState<GameLogSplit[]>([])
  const [teamStats, setTeamStats] = useState<MLBTeamStats | null>(null)
  const [rosterPitchingRoles, setRosterPitchingRoles] = useState<Record<number, PitchingRole>>({})
  const [cardsExpanded, setCardsExpanded] = useState(false)
  const appliedInitialPlayerId = useRef<number | null>(null)
  const playerRequestId = useRef(0)

  useEffect(() => {
    if (!selectedTeamId) {
      playerRequestId.current += 1
      setRoster([])
      setSelectedPlayer(null)
      setStats(null)
      setGameLog([])
      setTeamStats(null)
      setRosterPitchingRoles({})
      return
    }
    playerRequestId.current += 1
    setSelectedPlayer(null)
    setStats(null)
    setGameLog([])
    setRosterPitchingRoles({})
    setRosterLoading(true)
    Promise.all([getRoster(selectedTeamId), getTeamStats(selectedTeamId)])
      .then(([rosterData, teamStatsData]) => {
        setRoster(rosterData)
        setTeamStats(teamStatsData)
        const pitchers = rosterData.filter((p) => p.position.abbreviation === "P")
        void Promise.all(
          pitchers.map(async (p) => {
            try {
              const rawStats = await getPlayerStats(p.person.id, "pitching")
              return [p.person.id, inferPitchingRole(p, rawStats)] as const
            } catch {
              return [p.person.id, null] as const
            }
          })
        ).then((roles) => {
          setRosterPitchingRoles(
            Object.fromEntries(roles.filter((entry): entry is readonly [number, PitchingRole] => entry[1] !== null))
          )
        })
      })
      .catch(() => {})
      .finally(() => setRosterLoading(false))
  }, [selectedTeamId])

  const sortedRoster = useMemo(() => {
    const copy = [...roster]
    if (rosterSort === "pos") {
      return copy.sort((a, b) => {
        const pa = POS_ORDER[a.position.abbreviation] ?? 99
        const pb = POS_ORDER[b.position.abbreviation] ?? 99
        if (pa !== pb) return pa - pb
        return a.person.fullName.localeCompare(b.person.fullName)
      })
    }
    if (rosterSort === "num") {
      return copy.sort((a, b) => {
        const na = parseInt(a.jerseyNumber ?? "999", 10)
        const nb = parseInt(b.jerseyNumber ?? "999", 10)
        return na - nb
      })
    }
    return copy.sort((a, b) => a.person.fullName.localeCompare(b.person.fullName))
  }, [roster, rosterSort])

  const handleSelectPlayer = useCallback(async (player: RosterPlayer, mode: "hitting" | "pitching") => {
    const requestId = playerRequestId.current + 1
    playerRequestId.current = requestId
    setStatsMode(mode)
    setSelectedPlayer(player)
    setStatsLoading(true)
    setStats(null)
    setGameLog([])
    setCardsExpanded(false)
    try {
      const [rawStats, logData] = await Promise.all([
        getPlayerStats(player.person.id, mode),
        getPlayerGameLog(player.person.id, mode),
      ])
      if (playerRequestId.current !== requestId) return
      setStats(rawStats ? enrichStats(rawStats, mode) : null)
      setGameLog(logData)
    } catch {
      if (playerRequestId.current !== requestId) return
      setStats(null)
      setGameLog([])
    } finally {
      if (playerRequestId.current === requestId) setStatsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialPlayerId || rosterLoading || appliedInitialPlayerId.current === initialPlayerId) return
    const player = roster.find((candidate) => candidate.person.id === initialPlayerId)
    if (!player) return
    appliedInitialPlayerId.current = initialPlayerId
    void handleSelectPlayer(player, getDefaultStatsMode(player))
  }, [handleSelectPlayer, initialPlayerId, roster, rosterLoading])

  const handleModeChange = (mode: "hitting" | "pitching") => {
    setStatsMode(mode)
    setCardsExpanded(false)
    if (selectedPlayer) handleSelectPlayer(selectedPlayer, mode)
  }

  const pitchingRole = inferPitchingRole(selectedPlayer, stats)
  const pitchingRoleLabel =
    pitchingRole === "starter" ? "SP" : pitchingRole === "reliever" ? "RP" : pitchingRole === "closer" ? "CL" : null

  const cards =
    statsMode === "hitting" ? HITTING_CARDS
    : pitchingRole === "starter" ? SP_PITCHING_CARDS
    : pitchingRole === "reliever" ? RP_PITCHING_CARDS
    : pitchingRole === "closer" ? CL_PITCHING_CARDS
    : PITCHING_CARDS
  const showRolePitchingCards = statsMode === "pitching" && pitchingRole !== null
  const visibleCards = showRolePitchingCards || cardsExpanded ? cards : cards.slice(0, 4)

  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <div className="w-full space-y-3 lg:w-64 lg:shrink-0">
        <MLBRosterSidebar
          selectedTeamId={selectedTeamId}
          roster={roster}
          rosterLoading={rosterLoading}
          rosterSort={rosterSort}
          sortedRoster={sortedRoster}
          selectedPlayer={selectedPlayer}
          pitchingRole={pitchingRole}
          rosterPitchingRoles={rosterPitchingRoles}
          onSortChange={setRosterSort}
          onSelectPlayer={(player) => handleSelectPlayer(player, getDefaultStatsMode(player))}
        />
      </div>

      <div className="min-w-0 flex-1">
        {!selectedPlayer ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
            {selectedTeam ? "Select a player to view their stats." : "Select a team and a player."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-2 sm:gap-3">
                  {selectedTeamId && (
                    <img
                      src={`https://www.mlbstatic.com/team-logos/${selectedTeamId}.svg`}
                      alt=""
                      className="mt-0.5 hidden h-12 w-12 shrink-0 object-contain min-[420px]:block"
                    />
                  )}
                  <img
                    src={`https://img.mlbstatic.com/mlb-photos/image/upload/d_people:generic:headshot:67:current.png/w_213,q_auto:best/v1/people/${selectedPlayer.person.id}/headshot/67/current`}
                    alt={selectedPlayer.person.fullName}
                    className="h-14 w-14 shrink-0 rounded-full border border-gray-100 object-cover [object-position:50%_40%] sm:h-16 sm:w-16"
                  />
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                      {selectedTeam?.name} · {MLB_SEASON}
                    </p>
                    <h1 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-2xl">
                      {selectedPlayer.jerseyNumber && (
                        <span className="mr-1 text-gray-400">#{selectedPlayer.jerseyNumber}</span>
                      )}
                      {selectedPlayer.person.fullName}
                    </h1>
                    <p className="mt-0.5 text-sm text-gray-400">
                      {pitchingRoleLabel ?? selectedPlayer.position.abbreviation}
                      {selectedPlayer.person.batSide?.code && (
                        <span className="ml-2">
                          · Bats {selectedPlayer.person.batSide.code === "S" ? "Switch" : selectedPlayer.person.batSide.code === "L" ? "Left" : "Right"}
                        </span>
                      )}
                      {selectedPlayer.person.pitchHand?.code && (
                        <span className="ml-2">
                          · Throws {selectedPlayer.person.pitchHand.code === "L" ? "Left" : "Right"}
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="grid w-full grid-cols-2 rounded-xl border border-gray-200 bg-[#f7f8f3] p-1 sm:inline-flex sm:w-auto sm:shrink-0">
                  {(["hitting", "pitching"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                        statsMode === m ? "bg-green-900 text-white shadow-sm" : "text-gray-600 hover:text-green-900"
                      }`}
                    >
                      {m === "hitting" ? "Batting" : "Pitching"}
                    </button>
                  ))}
                </div>
              </div>

              {stats && !statsLoading && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Games Played</p>
                    <p className="mt-2 text-2xl font-extrabold text-green-950">{String(stats.gamesPlayed ?? "—")}</p>
                  </div>
                  <div className="rounded-xl bg-[#f7f8f3] px-4 py-3">
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                      {statsMode === "hitting" ? "At Bats" : "Innings Pitched"}
                    </p>
                    <p className="mt-2 text-2xl font-extrabold text-green-950">
                      {statsMode === "hitting" ? String(stats.atBats ?? "—") : String(stats.inningsPitched ?? "—")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {statsLoading ? (
              <div className="p-4 text-sm text-gray-400">Loading stats...</div>
            ) : !stats ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
                No {statsMode} stats available for this season.
              </div>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-4 shadow-sm">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                      {statsMode === "hitting" ? "Batting Stats" : "Pitching Stats"}
                    </p>
                    {!showRolePitchingCards && (
                      <button
                        type="button"
                        onClick={() => setCardsExpanded((v) => !v)}
                        className="cursor-pointer rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-500 hover:bg-gray-50"
                      >
                        {cardsExpanded ? "Show Less" : `Show All (${cards.length})`}
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {visibleCards.map(({ key, label, desc }) => {
                      const raw = stats[key]
                      const value = raw !== undefined && raw !== null ? String(raw) : "—"
                      const color = getStatColor(label, value, "mlb", statsMode === "pitching" ? pitchingRole : null)
                      return (
                        <div key={label} className={`min-w-0 rounded-xl p-3 sm:p-4 ${color.bg}`}>
                          <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>{label}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                          <p className={`mt-3 break-words text-2xl font-extrabold tracking-tight sm:text-3xl ${color.val}`}>{value}</p>
                        </div>
                      )
                    })}
                  </div>
                </section>
                <MLBTrendChart log={gameLog} mode={statsMode} teamStats={teamStats} />
                {statsMode === "hitting" && (
                  <BatterZoneMap playerId={selectedPlayer.person.id} batSide={selectedPlayer.person.batSide?.code} />
                )}
                <MLBGameLog log={gameLog} mode={statsMode} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
