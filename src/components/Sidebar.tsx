import type { Player, SetActiveIndex } from "../types"

type SidebarProps = {
  players: Player[]
  activeIndex: number
  setActiveIndex: SetActiveIndex
}

export default function Sidebar({
  players,
  activeIndex,
  setActiveIndex,
}: SidebarProps) {
  return (
    <aside className="w-64 bg-gray-100 p-4 rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-600">
          Batting Order
        </h2>

        <button className="w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
          +
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {players.map((player, index) => (
          <div
            key={player.name}
            onClick={() => setActiveIndex(index)}
            className={`
              flex items-center justify-between gap-3 px-3 py-2 rounded-xl cursor-pointer
              ${index === activeIndex ? "bg-green-900 text-white" : "bg-white text-gray-800"}
            `}
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-300"></div>
              <span className="text-sm font-medium">{player.name}</span>
            </div>

            <span className="text-sm">{player.position}</span>
          </div>
        ))}
      </div>

      <button className="mt-4 w-full bg-green-900 text-white py-2 rounded-xl">
        + Add Player
      </button>
    </aside>
  )
}
