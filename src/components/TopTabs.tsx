type TopTabsProps = {
  activeView: "stats" | "record" | "team"
  onChangeView: (view: "stats" | "record" | "team") => void
}

export default function TopTabs({
  activeView,
  onChangeView,
}: TopTabsProps) {
  const tabs: { label: string; view: TopTabsProps["activeView"] }[] = [
    { label: "My Stats", view: "stats" },
    { label: "Record Game", view: "record" },
    { label: "Team Setup", view: "team" },
  ]

  return (
    <nav className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
      <div className="flex gap-1 overflow-x-auto rounded-lg bg-gray-100 p-1">
        {tabs.map((tab) => {
          const isActive = activeView === tab.view

          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => onChangeView(tab.view)}
              className={`shrink-0 rounded-md px-3 py-2 text-sm font-semibold transition ${
                isActive
                  ? "bg-white text-green-900 shadow-sm"
                  : "text-gray-600 hover:bg-white/70 hover:text-green-900"
              }`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
