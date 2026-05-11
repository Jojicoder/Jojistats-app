import { Link } from "react-router-dom"

export type TabItem =
  | { label: string; view: string }
  | { label: string; href: string }

type TopTabsProps = {
  activeView: string
  onChangeView: (view: string) => void
  tabs: TabItem[]
}

export default function TopTabs({ activeView, onChangeView, tabs }: TopTabsProps) {
  const baseClass = "shrink-0 rounded-lg px-3 py-2 text-sm font-semibold transition"
  const inactiveClass = "text-gray-500 hover:bg-white hover:text-green-900"
  const activeClass = "bg-white text-green-900 shadow-sm"

  return (
    <nav className="shrink-0 border-b border-gray-200 bg-white px-3 py-2">
      <div className="mx-auto max-w-screen-2xl">
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-[#f7f8f3] p-1">
        {tabs.map((tab) => {
          if ("href" in tab) {
            return (
              <Link
                key={tab.href}
                to={tab.href}
                className={`${baseClass} ${inactiveClass}`}
              >
                {tab.label}
              </Link>
            )
          }
          return (
            <button
              key={tab.view}
              type="button"
              onClick={() => onChangeView(tab.view)}
              className={`${baseClass} ${activeView === tab.view ? activeClass : inactiveClass}`}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      </div>
    </nav>
  )
}
