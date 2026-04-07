type TopTabsProps = {
  activeView: "stats" | "record" | "team"
  onChangeView: (view: "stats" | "record" | "team") => void
}

export default function TopTabs({
  activeView,
  onChangeView,
}: TopTabsProps) {
  return (
    <nav className="flex gap-6 border-b border-gray-200 bg-white px-6 py-3">
      <button
        type="button"
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
        type="button"
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
        type="button"
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