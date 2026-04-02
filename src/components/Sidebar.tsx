import type { Player, SetActiveIndex } from "../types"

type SidebarProps = {
  players: Player[]
  activeIndex: number
  setActiveIndex: SetActiveIndex
}

// Sidebar for switching between roster players during record / stats views.
// Player creation is handled separately in Team Setup.
export default function Sidebar({
  players,
  activeIndex,
  setActiveIndex,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-100 p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-600">Team Roster</h2>
          <p className="text-xs text-gray-400 mt-1">
            {players.length} player{players.length !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player, index) => (
          <button
            key={player.id}
            onClick={() => setActiveIndex(index)}
            className={`
              flex items-center justify-between gap-3 px-3 py-3 rounded-xl text-left transition
              ${
                index === activeIndex
                  ? "bg-green-900 text-white"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }
            `}
          >
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={`w-8 h-8 rounded-full shrink-0 ${
                  index === activeIndex ? "bg-white/20" : "bg-gray-300"
                }`}
              />

              <div className="min-w-0">
                <p className="text-sm font-medium truncate">
                  {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                  {player.name}
                </p>
                <p
                  className={`text-xs ${
                    index === activeIndex ? "text-white/70" : "text-gray-400"
                  }`}
                >
                  {player.isActive === false ? "Inactive" : "Available"}
                </p>
              </div>
            </div>

            <span className="text-sm shrink-0">{player.position}</span>
          </button>
        ))}
      </div>
    </aside>
  )
}