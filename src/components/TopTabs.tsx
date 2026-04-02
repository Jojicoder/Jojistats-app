type TopTabsProps = {
  activeView: "stats" | "record" | "roster" | "team"
  onChangeView: (view: "stats" | "record" | "roster" | "team") => void
}

export default function TopTabs({
  activeView,
  onChangeView,
}: TopTabsProps) {
  return (
    <nav className="flex gap-6 px-6 py-3 bg-white border-b border-gray-200">
      <button
        onClick={() => onChangeView("stats")}
        className={`text-sm ${
          activeView === "stats"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        My Stats
      </button>

      <button
        onClick={() => onChangeView("record")}
        className={`text-sm ${
          activeView === "record"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        Record Game
      </button>

      <button
        onClick={() => onChangeView("roster")}
        className={`text-sm ${
          activeView === "roster"
            ? "font-semibold text-green-900"
            : "text-gray-600 hover:text-green-900"
        }`}
      >
        Roster
      </button>

      <button
        onClick={() => onChangeView("team")}
        className={`text-sm ${
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