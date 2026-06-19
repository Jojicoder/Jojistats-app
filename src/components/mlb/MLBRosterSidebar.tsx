import type { RosterPlayer } from "./types"

type PitchingRole = "starter" | "reliever" | "closer"
type RosterSort = "az" | "pos" | "num"

function formatPitchingRole(role: PitchingRole | null) {
  if (role === "starter") return "SP"
  if (role === "reliever") return "RP"
  if (role === "closer") return "CL"
  return null
}

function formatRosterPosition(player: RosterPlayer, role?: PitchingRole | null) {
  if (player.position.abbreviation === "P") return `P / ${formatPitchingRole(role ?? null) ?? "RP"}`
  return formatPitchingRole(role ?? null) ?? player.position.abbreviation
}

type Props = {
  selectedTeamId: number | null
  roster: RosterPlayer[]
  rosterLoading: boolean
  rosterSort: RosterSort
  sortedRoster: RosterPlayer[]
  selectedPlayer: RosterPlayer | null
  pitchingRole: PitchingRole | null
  rosterPitchingRoles: Record<number, PitchingRole>
  onSortChange: (sort: RosterSort) => void
  onSelectPlayer: (player: RosterPlayer) => void
}

export default function MLBRosterSidebar({
  selectedTeamId,
  roster,
  rosterLoading,
  rosterSort,
  sortedRoster,
  selectedPlayer,
  pitchingRole,
  rosterPitchingRoles,
  onSortChange,
  onSelectPlayer,
}: Props) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm">
      {!selectedTeamId ? (
        <p className="text-sm text-gray-400">Select a team from the dropdown above.</p>
      ) : (
        <>
          <h2 className="text-base font-bold text-gray-900">Team Roster</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {rosterLoading ? "Loading..." : `${roster.length} players`}
          </p>
          {!rosterLoading && roster.length > 0 && (
            <>
              <p className="mt-3 text-xs font-bold uppercase tracking-widest text-gray-400">Sort by</p>
              <select
                value={rosterSort}
                onChange={(e) => onSortChange(e.target.value as RosterSort)}
                className="mt-1 mb-3 w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 shadow-sm"
              >
                <option value="az">Name (A–Z)</option>
                <option value="pos">Position</option>
                <option value="num">Jersey Number</option>
              </select>
              <div className="max-h-80 space-y-2 overflow-y-auto lg:max-h-[60vh]">
                {sortedRoster.map((player) => {
                  const isSelected = selectedPlayer?.person.id === player.person.id
                  const rosterPitchingRole = isSelected
                    ? pitchingRole
                    : rosterPitchingRoles[player.person.id] ?? null
                  return (
                    <button
                      key={player.person.id}
                      type="button"
                      onClick={() => onSelectPlayer(player)}
                      className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition ${
                        isSelected ? "bg-green-900" : "bg-[#f7f8f3] hover:bg-[#eef0e9]"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
                        isSelected ? "bg-green-700 text-white" : "border-2 border-green-700 bg-white text-green-800"
                      }`}>
                        {player.jerseyNumber ?? "—"}
                      </span>
                      <span className="min-w-0">
                        <span className={`block truncate text-sm font-bold ${isSelected ? "text-white" : "text-gray-900"}`}>
                          {player.person.fullName}
                        </span>
                        <span className={`text-xs ${isSelected ? "text-green-300" : "text-gray-400"}`}>
                          {formatRosterPosition(player, rosterPitchingRole)}
                        </span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
          {rosterLoading && <p className="mt-3 text-xs text-gray-400">Loading roster...</p>}
        </>
      )}
    </div>
  )
}
