import type { Player, SetActiveIndex } from "../types"
import AddPlayerForm from "./AddPlayerForm"

type RosterPageProps = {
  players: Player[]
  activeIndex: number
  setActiveIndex: SetActiveIndex
  onAddPlayer: (player: Player) => void
}

// Roster page is focused on team member management.
// It handles adding players and selecting the active player.
export default function RosterPage({
  players,
  activeIndex,
  setActiveIndex,
  onAddPlayer,
}: RosterPageProps) {
  const activePlayer = players[activeIndex]

  return (
    <main className="flex-1 p-6 bg-gray-50">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">Roster</p>
        <h1 className="text-2xl font-bold mt-2">Manage your players</h1>
        <p className="text-gray-600 mt-2">
          Add players here, then use them in Record Game and My Stats.
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

      <AddPlayerForm
        onAddPlayer={onAddPlayer}
        onClose={() => {}}
      />

      <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-semibold mb-4">Player List</h2>

        {players.length === 0 ? (
          <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 text-center">
            No players yet. Add your first player above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {players.map((player, index) => (
              <button
                key={player.id}
                onClick={() => setActiveIndex(index)}
                className={`rounded-xl border px-4 py-4 text-left transition ${
                  index === activeIndex
                    ? "border-green-900 bg-green-50"
                    : "border-gray-200 bg-white hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-800">
                    {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                    {player.name}
                  </p>

                  <span className="text-xs text-gray-500">
                    {player.position}
                  </span>
                </div>

                <p className="text-xs text-gray-400 mt-2">
                  {player.isActive === false ? "Inactive" : "Available"}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}