import { useMemo, useState } from "react"
import type { Player, SavedBattingGameEntry } from "../types"
import PlayerForm from "./PlayerForm"

type RosterSortKey = "jersey" | "name" | "position" | "games"

type RosterPageProps = {
  teamName: string
  seasonYear: number
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
  activeTeamId: string
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  onAddPlayer: (player: Player) => void
  onUpdatePlayer: (player: Player) => void
  onDeletePlayer: (playerId: string) => void
}

export default function RosterPage({
  teamName,
  seasonYear,
  players,
  activePlayerId,
  setActivePlayerId,
  activeTeamId,
  savedEntriesByPlayer,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: RosterPageProps) {
  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? null

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<RosterSortKey>("jersey")

  const editingPlayer =
    players.find((player) => player.id === editingPlayerId) ?? null

  const sortedPlayers = useMemo(() => {
    const nextPlayers = [...players]

    nextPlayers.sort((a, b) => {
      if (sortBy === "name") {
        return a.name.localeCompare(b.name)
      }

      if (sortBy === "position") {
        const positionCompare = a.position.localeCompare(b.position)
        if (positionCompare !== 0) return positionCompare
        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      if (sortBy === "games") {
        const aGames = savedEntriesByPlayer[a.id]?.length ?? 0
        const bGames = savedEntriesByPlayer[b.id]?.length ?? 0

        if (bGames !== aGames) {
          return bGames - aGames
        }

        return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
      }

      return (a.jerseyNumber ?? 999) - (b.jerseyNumber ?? 999)
    })

    return nextPlayers
  }, [players, savedEntriesByPlayer, sortBy])

  return (
    <main className="w-full">
      <div className="max-w-6xl">
        <div className="max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">Roster</p>
          <h1 className="mt-2 text-2xl font-bold">{teamName}</h1>
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

        <div className="mt-6 max-w-3xl">
          <PlayerForm
            key={`add-${activeTeamId}`}
            teamId={activeTeamId}
            mode="add"
            onSave={onAddPlayer}
          />
        </div>

        {editingPlayer && (
          <div className="mt-6 max-w-3xl">
            <PlayerForm
              key={`edit-${editingPlayer.id}`}
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
        )}

        <div className="mt-6 flex justify-start">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
            <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold">Player List</h2>

              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-500">
                  Sort by
                </label>
                <select
                  value={sortBy}
                  onChange={(e) =>
                    setSortBy(e.target.value as RosterSortKey)
                  }
                  className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="jersey">Jersey Number</option>
                  <option value="name">Name</option>
                  <option value="position">Position</option>
                  <option value="games">Games Played</option>
                </select>
              </div>
            </div>

            {sortedPlayers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                No players yet. Add your first player above.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {sortedPlayers.map((player, index) => {
                  const isActive = player.id === activePlayerId
                  const isEditing = player.id === editingPlayerId
                  const gamesPlayed = savedEntriesByPlayer[player.id]?.length ?? 0

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
                              {player.position} · Games {gamesPlayed} ·{" "}
                              {player.isActive === false ? "Inactive" : "Available"}
                            </p>
                          </div>
                        </button>

                        <div className="shrink-0 flex items-center gap-2">
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
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}