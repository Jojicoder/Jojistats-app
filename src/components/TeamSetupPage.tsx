import { useState } from "react"
import type { Team } from "../types"

type TeamSetupPageProps = {
  teams: Team[]
  activeTeamId: string | null
  setActiveTeamId: (teamId: string) => void
  onAddTeam: (name: string) => void
  onUpdateTeamName: (teamId: string, name: string) => void
  onArchiveTeam: (teamId: string) => void
}

export default function TeamSetupPage({
  teams,
  activeTeamId,
  setActiveTeamId,
  onAddTeam,
  onUpdateTeamName,
  onArchiveTeam,
}: TeamSetupPageProps) {
  const activeTeam = teams.find((team) => team.id === activeTeamId) ?? null
  const [newTeamName, setNewTeamName] = useState("")

  return (
    <main className="w-full">
      <div className="max-w-6xl">
        {/* Header */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">Team Setup</p>
          <h1 className="mt-2 text-2xl font-bold">Manage teams</h1>
          <p className="mt-2 text-gray-600">
            Create teams here. Season year is handled in Record Game.
          </p>
        </div>

        {/* Add team */}
        <div className="mt-6 max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold">Add Team</h2>

          <div className="flex gap-2">
            <input
              type="text"
              value={newTeamName}
              onChange={(e) => setNewTeamName(e.target.value)}
              placeholder="e.g. Brooklyn Waves"
              className="flex-1 rounded-lg border border-gray-200 px-3 py-2"
            />
            <button
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

        {/* Team list */}
        <div className="mt-6 flex justify-start">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-sm">
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

            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                Current Team: {activeTeam?.name ?? "None"}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}