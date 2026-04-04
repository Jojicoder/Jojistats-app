import type { Player } from "../types"

type SidebarProps = {
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
}

export default function Sidebar({
  players,
  activePlayerId,
  setActivePlayerId,
}: SidebarProps) {
  return (
    <aside className="w-[260px] shrink-0 rounded-2xl bg-gray-100 p-4">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-gray-700">Team Roster</h2>
        <p className="mt-1 text-xs text-gray-400">
          {players.length} player{players.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player) => {
          const isActive = player.id === activePlayerId

          return (
            <button
              key={player.id}
              onClick={() => setActivePlayerId(player.id)}
              className={`flex items-center justify-between gap-3 rounded-2xl px-3 py-4 text-left transition ${
                isActive
                  ? "bg-green-900 text-white"
                  : "bg-white text-gray-800 hover:bg-gray-50"
              }`}
            >
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`h-8 w-8 shrink-0 rounded-full ${
                    isActive ? "bg-white/20" : "bg-gray-300"
                  }`}
                />

                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {player.jerseyNumber != null ? `#${player.jerseyNumber} ` : ""}
                    {player.name}
                  </p>
                  <p
                    className={`mt-1 text-xs ${
                      isActive ? "text-white/75" : "text-gray-400"
                    }`}
                  >
                    {player.isActive === false ? "Inactive" : "Available"}
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-sm">{player.position}</span>
            </button>
          )
        })}
      </div>
    </aside>
  )
}