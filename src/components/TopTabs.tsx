type TopTabsProps = {
  activeView: "stats" | "record" | "team"
  onChangeView: (view: "stats" | "record" | "team") => void
}

export default function TopTabs({
  activeView,
  onChangeView,
}: TopTabsProps) {
  return (
    <nav className="flex gap-3 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 sm:gap-6 sm:px-4">
      <button
        type="button"
        onClick={() => onChangeView("stats")}
        className={`shrink-0 rounded-lg px-2 py-1 text-sm ${
          activeView === "stats"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        My Stats
      </button>

      <button
        type="button"
        onClick={() => onChangeView("record")}
        className={`shrink-0 rounded-lg px-2 py-1 text-sm ${
          activeView === "record"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        Record Game
      </button>

      <button
        type="button"
        onClick={() => onChangeView("team")}
        className={`shrink-0 rounded-lg px-2 py-1 text-sm ${
          activeView === "team"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        Team Setup
      </button>
    </nav>
  )
}
