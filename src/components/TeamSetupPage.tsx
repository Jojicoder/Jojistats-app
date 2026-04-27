import { useMemo, useState } from "react"
import type { Team, Player, SavedBattingGameEntry } from "../types"
import PlayerForm from "./PlayerForm"

type RosterSortKey =
  | "jersey"
  | "name"
  | "position"
  | "games"
  | "pa"
  | "avg"
  | "ops"
  | "hr"
  | "rbi"

type TeamSetupPageProps = {
  teams: Team[]
  activeTeamId: string | null
  setActiveTeamId: (teamId: string) => void
  onAddTeam: (name: string) => void
  onUpdateTeamName: (teamId: string, name: string) => void
  onArchiveTeam: (teamId: string) => void
  onChangeSeason: (year: number) => void
  teamName: string
  seasonYear: number
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
  onAddPlayer: (player: Player) => void
  onUpdatePlayer: (player: Player) => void
  onDeletePlayer: (playerId: string) => void
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
}

const currentYear = new Date().getFullYear()
const startYear = 2020

const seasonOptions = Array.from(
  { length: currentYear - startYear + 1 },
  (_, index) => currentYear - index
)

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
    {
      ab: 0,
      h: 0,
      doubles: 0,
      triples: 0,
      hr: 0,
      rbi: 0,
      bb: 0,
    }
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
    singles +
    totals.doubles * 2 +
    totals.triples * 3 +
    totals.hr * 4

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

function formatRate(value: number) {
  return value.toFixed(3).replace("0.", ".")
}

export default function TeamSetupPage({
  teams,
  activeTeamId,
  setActiveTeamId,
  onAddTeam,
  onUpdateTeamName,
  onArchiveTeam,
  onChangeSeason,
  teamName,
  seasonYear,
  players,
  activePlayerId,
  setActivePlayerId,
  savedEntriesByPlayer,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: TeamSetupPageProps) {
  const [editingTeamName, setEditingTeamName] = useState("")
  const [isEditingTeam, setIsEditingTeam] = useState(false)
  const [newTeamName, setNewTeamName] = useState("")
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<RosterSortKey>("jersey")

  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? null

  const editingPlayer =
    players.find((player) => player.id === editingPlayerId) ?? null

  const sortedPlayers = useMemo(() => {
    const nextPlayers = [...players]

    nextPlayers.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name)

      if (sortBy === "position") {
        const positionCompare = a.position.localeCompare(b.position)
        if (positionCompare !== 0) return positionCompare
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
  }, [players, savedEntriesByPlayer, sortBy])

  return (
    <main className="w-full">
      <div className="w-full space-y-6">
        <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
          <p className="text-sm font-medium text-green-900">Team Setup</p>
          <h1 className="mt-2 text-2xl font-bold">Manage team and roster</h1>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
            <div className="flex items-center gap-3 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              <span>Season</span>

              <select
                value={seasonYear}
                onChange={(event) => onChangeSeason(Number(event.target.value))}
                className="rounded-lg bg-green-900 px-4 py-2 text-sm font-medium text-white"
              >
                {seasonOptions.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <h2 className="text-lg font-semibold">Add Team</h2>

              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Brooklyn Waves"
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 px-3 py-2"
                />

                <button
                  type="button"
                  onClick={() => {
                    if (newTeamName.trim() === "") return
                    onAddTeam(newTeamName.trim())
                    setNewTeamName("")
                  }}
                  className="rounded-lg bg-green-900 px-4 py-2 text-sm font-medium text-white"
                >
                  Add Team
                </button>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold">Team List</h2>

              {teams.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                  No teams yet.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {teams.map((team, index) => {
                    const isActive = team.id === activeTeamId

                    return (
                      <div
                        key={team.id}
                        className={`rounded-xl border px-4 py-3 transition ${
                          isActive
                            ? "border-green-900 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTeamId(team.id)
                              setEditingTeamName(team.name)
                              setIsEditingTeam(false)
                            }}
                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                          >
                            <div className="w-7 shrink-0 text-sm font-semibold text-gray-400">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-800">
                                {team.name}
                              </p>
                              <p className="mt-1 text-xs text-gray-400">
                                Current Season {team.currentSeasonYear}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (!isEditingTeam) {
                                setEditingTeamName(team.name)
                              }
                              setIsEditingTeam((prev) => !prev)
                            }}
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
                          >
                            {isEditingTeam ? "Close" : "Edit"}
                          </button>
                        </div>

                        {isActive && isEditingTeam && (
                          <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
                            <label className="text-xs font-medium text-gray-500">
                              Edit Team Name
                            </label>

                            <input
                              type="text"
                              value={editingTeamName}
                              onChange={(e) => setEditingTeamName(e.target.value)}
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />

                            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                  if (editingTeamName.trim() === "") return
                                  onUpdateTeamName(team.id, editingTeamName.trim())
                                  setIsEditingTeam(false)
                                }}
                                className="rounded-lg bg-green-900 px-4 py-2 text-sm text-white"
                              >
                                Update
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    `Archive team "${team.name}"?`
                                  )
                                  if (!confirmed) return
                                  onArchiveTeam(team.id)
                                  setIsEditingTeam(false)
                                }}
                                className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white"
                              >
                                Archive
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>

          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <p className="text-sm font-medium text-green-900">Roster</p>
              <h2 className="mt-2 break-words text-2xl font-bold">
                {teamName}
              </h2>
              <p className="mt-2 text-gray-600">
                Season {seasonYear} · Manage your players here.
              </p>

              <div className="mt-4 flex flex-wrap gap-3">
                <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Total Players: {players.length}
                </div>

                <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Active Player:{" "}
                  {activePlayer
                    ? activePlayer.jerseyNumber != null
                      ? `#${activePlayer.jerseyNumber} ${activePlayer.name}`
                      : activePlayer.name
                    : "None"}
                </div>
              </div>
            </div>

            {activeTeamId ? (
              <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <h3 className="text-lg font-semibold">Add Player</h3>

                <div className="mt-4">
                  <PlayerForm
                    teamId={activeTeamId}
                    seasonYear={seasonYear}
                    mode="add"
                    onSave={onAddPlayer}
                  />
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-yellow-50 p-6 text-sm text-yellow-800">
                Please create or select a team first before adding players.
              </div>
            )}
          </section>

          <section className="self-start">
            <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">Player List</h3>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-gray-500">
                    Sort by
                  </label>

                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as RosterSortKey)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                  >
                    <option value="jersey">Jersey Number</option>
                    <option value="name">Name</option>
                    <option value="position">Position</option>
                    <option value="games">Games Played</option>
                    <option value="pa">PA</option>
                    <option value="avg">AVG</option>
                    <option value="ops">OPS</option>
                    <option value="hr">HR</option>
                    <option value="rbi">RBI</option>
                  </select>
                </div>
              </div>

              {sortedPlayers.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                  No players yet. Add your first player in the center column.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {sortedPlayers.map((player, index) => {
                    const isActive = player.id === activePlayerId
                    const isEditing = player.id === editingPlayerId
                    const entries = savedEntriesByPlayer[player.id] ?? []
                    const metrics = getPlayerMetrics(entries)

                    return (
                      <div
                        key={player.id}
                        className={`rounded-xl border px-4 py-3 transition ${
                          isActive
                            ? "border-green-900 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                          <button
                            type="button"
                            onClick={() => setActivePlayerId(player.id)}
                            className="flex min-w-0 flex-1 items-center gap-4 text-left"
                          >
                            <div className="w-7 shrink-0 text-sm font-semibold text-gray-400">
                              {index + 1}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-gray-800">
                                {player.jerseyNumber != null
                                  ? `#${player.jerseyNumber} `
                                  : ""}
                                {player.name}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                {player.position} · G {metrics.games} · PA{" "}
                                {metrics.pa} · AVG {formatRate(metrics.avg)}
                              </p>

                              <p className="mt-1 text-xs text-gray-400">
                                OPS {formatRate(metrics.ops)} · HR {metrics.hr} ·
                                RBI {metrics.rbi}
                              </p>
                            </div>
                          </button>

                          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center">
                            <button
                              type="button"
                              onClick={() =>
                                setEditingPlayerId(isEditing ? null : player.id)
                              }
                              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
                            >
                              {isEditing ? "Close" : "Edit"}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                const confirmed = window.confirm(
                                  `Delete ${player.name}?`
                                )
                                if (!confirmed) return
                                onDeletePlayer(player.id)
                                if (editingPlayerId === player.id) {
                                  setEditingPlayerId(null)
                                }
                              }}
                              className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
                            >
                              Delete
                            </button>
                          </div>
                        </div>

                        {isEditing && editingPlayer && activeTeamId && (
                          <div className="mt-3">
                            <PlayerForm
                              teamId={activeTeamId}
                              seasonYear={editingPlayer.seasonYear}
                              mode="edit"
                              initialPlayer={editingPlayer}
                              onSave={(player) => {
                                onUpdatePlayer(player)
                                setEditingPlayerId(null)
                              }}
                              onCancel={() => setEditingPlayerId(null)}
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
