import { useState } from "react"
import type { Player } from "../types"
import PlayerForm from "./PlayerForm"

type RosterPageProps = {
  teamName: string
  seasonYear: number
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
  activeTeamId: string
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
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: RosterPageProps) {
  const activePlayer =
    players.find((player) => player.id === activePlayerId) ?? null

  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null)

  const editingPlayer =
    players.find((player) => player.id === editingPlayerId) ?? null

  return (
    <main className="w-full">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
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

        {/* Add form */}
        <div className="mt-6 max-w-3xl">
          <PlayerForm
            teamId={activeTeamId}
            mode="add"
            onSave={onAddPlayer}
          />
        </div>

        {/* Edit form */}
        {editingPlayer && (
          <div className="mt-6 max-w-3xl">
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
        )}

        {/* Vertical player list */}
        <div className="mt-6 flex justify-start">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">Player List</h2>

            {players.length === 0 ? (
              <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
                No players yet. Add your first player above.
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
                              {player.isActive === false ? "Inactive" : "Available"}
                            </p>
                          </div>

                          <div className="shrink-0 text-sm text-gray-600">
                            {player.position}
                          </div>
                        </button>

                        <div className="shrink-0 flex items-center gap-2">
                          <button
                            onClick={() =>
                              setEditingPlayerId(isEditing ? null : player.id)
                            }
                            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700"
                          >
                            {isEditing ? "Close" : "Edit"}
                          </button>

                          <button
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