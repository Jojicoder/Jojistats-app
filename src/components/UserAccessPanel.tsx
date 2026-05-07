import { useEffect, useMemo, useState } from "react"
import type { Player, Team, UserAccess } from "../types"

const roleOptions: { value: UserAccess["role"]; label: string }[] = [
  { value: "player", label: "Player Stats" },
  { value: "recorder", label: "Game Recorder" },
  { value: "manager", label: "Team Manager" },
  { value: "admin", label: "Admin" },
]

type UserAccessPanelProps = {
  teams: Team[]
  players: Player[]
  userAccesses: UserAccess[]
  onSaveAccess: (access: Omit<UserAccess, "id">) => Promise<void>
  onSetAccessActive: (accessId: string, isActive: boolean) => Promise<void>
}

export default function UserAccessPanel({
  teams,
  players,
  userAccesses,
  onSaveAccess,
  onSetAccessActive,
}: UserAccessPanelProps) {
  const [email, setEmail] = useState("")
  const [teamId, setTeamId] = useState(teams[0]?.id ?? "")
  const [playerId, setPlayerId] = useState("")
  const [role, setRole] = useState<UserAccess["role"]>("player")
  const [editingAccessId, setEditingAccessId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!teamId && teams[0]) {
      setTeamId(teams[0].id)
    }
  }, [teamId, teams])

  const selectedTeam = teams.find((team) => team.id === teamId) ?? null
  const teamPlayers = useMemo(
    () =>
      players.filter(
        (player) =>
          player.teamId === teamId &&
          !player.isArchived &&
          player.seasonYear === selectedTeam?.currentSeasonYear
      ),
    [players, selectedTeam?.currentSeasonYear, teamId]
  )

  const playerOptions = teamPlayers
  const selectedPlayerId = playerId || playerOptions[0]?.id || ""

  const teamNameById = new Map(teams.map((team) => [team.id, team.name]))
  const playerNameById = new Map(
    players.map((player) => [
      player.id,
      player.jerseyNumber != null
        ? `#${player.jerseyNumber} ${player.name}`
        : player.name,
    ])
  )

  const handleSave = async () => {
    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail || !teamId || !selectedPlayerId) return

    try {
      setIsSaving(true)
      await onSaveAccess({
        email: normalizedEmail,
        teamId,
        playerId: selectedPlayerId,
        role,
        isActive: true,
      })
      setEmail("")
      setPlayerId("")
      setRole("player")
      setEditingAccessId(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (access: UserAccess) => {
    setEditingAccessId(access.id)
    setEmail(access.email)
    setTeamId(access.teamId)
    setPlayerId(access.playerId)
    setRole(access.role)
  }

  const handleCancelEdit = () => {
    setEditingAccessId(null)
    setEmail("")
    setPlayerId("")
    setRole("player")
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <p className="text-sm font-medium text-green-900">User Access</p>
      <h2 className="mt-2 text-xl font-bold">Assign GameRecord login</h2>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[1fr_180px_220px_180px_auto]">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="player@example.com"
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm"
        />

        <select
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value)
            setPlayerId("")
          }}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>

        <select
          value={selectedPlayerId}
          onChange={(event) => setPlayerId(event.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {playerOptions.map((player) => (
            <option key={player.id} value={player.id}>
              {playerNameById.get(player.id)}
            </option>
          ))}
        </select>

        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserAccess["role"])}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
        >
          {roleOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !email.trim() || !teamId || !selectedPlayerId}
          className="rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-400"
        >
          {isSaving ? "Saving..." : editingAccessId ? "Update" : "Save"}
        </button>
      </div>

      {editingAccessId && (
        <button
          type="button"
          onClick={handleCancelEdit}
          className="mt-3 rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          Cancel Edit
        </button>
      )}

      <div className="mt-5 space-y-2">
        {userAccesses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
            No user access yet.
          </div>
        ) : (
          userAccesses.map((access) => (
            <div
              key={access.id}
              className="flex flex-col gap-3 rounded-xl border border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-gray-800">
                  {access.email}
                </p>
                <p className="mt-1 text-xs text-gray-500">
                  {teamNameById.get(access.teamId) ?? "Unknown team"} ·{" "}
                  {playerNameById.get(access.playerId) ?? "Unknown player"} ·{" "}
                  {roleOptions.find((option) => option.value === access.role)
                    ?.label ?? access.role}
                </p>
              </div>

              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(access)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => onSetAccessActive(access.id, !access.isActive)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                    access.isActive
                      ? "bg-red-600 text-white"
                      : "bg-green-900 text-white"
                  }`}
                >
                  {access.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
