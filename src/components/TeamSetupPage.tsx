import { useState } from "react"
import type { Team, Player } from "../types"
import PlayerForm from "./PlayerForm"

type TeamSetupPageProps = {
  teams: Team[]
  activeTeamId: string | null
  setActiveTeamId: (teamId: string) => void
  onAddTeam: (name: string) => void
  onUpdateTeamName: (teamId: string, name: string) => void
  onArchiveTeam: (teamId: string) => void
  teamName: string
  seasonYear: number
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
  onAddPlayer: (player: Player) => void
  onUpdatePlayer: (player: Player) => void
  onDeletePlayer: (playerId: string) => void
}

export default function TeamSetupPage({
  teams,
  activeTeamId,
  setActiveTeamId,
  onAddTeam,
  onUpdateTeamName,
  onArchiveTeam,
  teamName,
  seasonYear,
  players,
  activePlayerId,
  setActivePlayerId,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: TeamSetupPageProps) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null
  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? null

  const [newTeamName, setNewTeamName] = useState("")
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

  const editingPlayer =
    players.find((player) => player.id === editingPlayerId) ?? null

  return (
    <main className="w-full">
      <div className="max-w-7xl space-y-6">
        {/* Page header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">Team Setup</p>
          <h1 className="mt-2 text-2xl font-bold">Manage team and roster</h1>
          <p className="mt-2 text-gray-600">
            Team management is on the left. Roster management is on the right.
          </p>
        </div>

        {/* Main two-column layout */}
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          {/* LEFT COLUMN: Team Setup */}
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold">Add Team</h2>

              <div className="mt-4 flex gap-2">
                <input
                  type="text"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="e.g. Brooklyn Waves"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2"
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

            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Team List</h2>

              {teams.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                  No teams yet.
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  {teams.map((team, index) => {
                    const isActive = team.id === activeTeamId

                    return (
                      <div
                        key={team.id}
                        className={`rounded-xl border px-4 py-3 ${
                          isActive
                            ? "border-green-900 bg-green-50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => setActiveTeamId(team.id)}
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
                                {isActive ? "Selected Team" : "Click to select"}
                              </p>
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => onArchiveTeam(team.id)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-sm text-white"
                          >
                            Archive
                          </button>
                        </div>

                        {isActive && (
                          <div className="mt-4">
                            <label className="text-xs font-medium text-gray-500">
                              Edit Team Name
                            </label>
                            <input
                              type="text"
                              value={team.name}
                              onChange={(e) =>
                                onUpdateTeamName(team.id, e.target.value)
                              }
                              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="mt-6">
                <div className="inline-block rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                  Current Team: {activeTeam?.name ?? "None"}
                </div>
              </div>
            </div>
          </section>

          {/* RIGHT COLUMN: Roster */}
          <section className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm">
              <p className="text-sm font-medium text-green-900">Roster</p>
              <h2 className="mt-2 text-2xl font-bold">{teamName}</h2>
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

            {/* NEW: roster inner two-column layout */}
            <div className="grid grid-cols-1 gap-6 2xl:grid-cols-[minmax(0,1fr)_360px]">
              {/* LEFT SIDE INSIDE ROSTER: forms */}
              <div className="space-y-6">
                {activeTeamId ? (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold">Add Player</h3>

                    <div className="mt-4">
                      <PlayerForm
                        teamId={activeTeamId}
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

                {editingPlayer && activeTeamId && (
                  <div className="rounded-2xl bg-white p-6 shadow-sm">
                    <h3 className="text-lg font-semibold">Edit Player</h3>

                    <div className="mt-4">
                      <PlayerForm
                        teamId={activeTeamId}
                        mode="edit"
                        initialPlayer={editingPlayer}
                        onSave={(player) => {
                          onUpdatePlayer(player)
                          setEditingPlayerId(null)
                        }}
                        onCancel={() => setEditingPlayerId(null)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE INSIDE ROSTER: player list */}
              <div className="self-start">
                <div className="rounded-2xl bg-white p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold">Player List</h3>

                  {players.length === 0 ? (
                    <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                      No players yet. Add your first player on the left.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {players.map((player, index) => {
                        const isActive = player.id === activePlayerId
                        const isEditing = player.id === editingPlayerId

                        return (
                          <div
                            key={player.id}
                            className={`rounded-xl border px-4 py-3 transition ${
                              isActive
                                ? "border-green-900 bg-green-50"
                                : "border-gray-200 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-4">
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
                                    {player.isActive === false
                                      ? "Inactive"
                                      : "Available"}
                                  </p>
                                </div>

                                <div className="shrink-0 text-sm text-gray-600">
                                  {player.position}
                                </div>
                              </button>

                              <div className="flex shrink-0 items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingPlayerId(
                                      isEditing ? null : player.id
                                    )
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
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}