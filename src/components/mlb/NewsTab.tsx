import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getTransactions, type MlbTransaction } from "../../api/mlb"

type Filter = "all" | "trades" | "freeagency" | "waivers"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "trades", label: "Trades" },
  { key: "freeagency", label: "Free agency" },
  { key: "waivers", label: "Waivers & DFA" },
]

// Status changes (injured list etc.) are routine bookkeeping, so they are left out.
const CATEGORY: Record<string, Exclude<Filter, "all">> = {
  Trade: "trades",
  "Signed as Free Agent": "freeagency",
  "Declared Free Agency": "freeagency",
  "Claimed Off Waivers": "waivers",
  "Designated for Assignment": "waivers",
  Outrighted: "waivers",
  Released: "waivers",
}

const TYPE_STYLE: Record<string, string> = {
  trades: "bg-amber-100 text-amber-800",
  freeagency: "bg-green-100 text-green-800",
  waivers: "bg-gray-100 text-gray-600",
}

const PAGE_SIZE = 40
const logo = (id: number) => `https://www.mlbstatic.com/team-logos/${id}.svg`

function isoDaysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date.toLocaleDateString("en-CA")
}

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  })
}

export default function NewsTab({ selectedTeamId }: { selectedTeamId?: number | null }) {
  const [days, setDays] = useState(14)
  const [filter, setFilter] = useState<Filter>("all")
  const [hideMinors, setHideMinors] = useState(true)
  const [items, setItems] = useState<MlbTransaction[] | null>(null)
  const [error, setError] = useState("")
  const [shown, setShown] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    setItems(null)
    setError("")
    getTransactions(isoDaysAgo(days), isoDaysAgo(0))
      .then((list) => !cancelled && setItems(list))
      .catch(() => !cancelled && setError("Failed to load the transactions."))
    return () => {
      cancelled = true
    }
  }, [days])

  useEffect(() => setShown(PAGE_SIZE), [days, filter, hideMinors, selectedTeamId])

  const visible = useMemo(() => {
    // A trade is listed once per team involved; keep one copy of each move.
    const seen = new Set<string>()
    return (items ?? [])
      .filter((t) => CATEGORY[t.type])
      .filter((t) => {
        const key = `${t.date}|${t.description}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .filter((t) => filter === "all" || CATEGORY[t.type] === filter)
      .filter((t) => !hideMinors || !/minor league/i.test(t.description))
      .filter((t) => !selectedTeamId || t.toTeamId === selectedTeamId || t.fromTeamId === selectedTeamId)
      .sort((a, b) => {
        if (a.date !== b.date) return b.date.localeCompare(a.date)
        // Trades first within a day.
        return Number(b.type === "Trade") - Number(a.type === "Trade")
      })
  }, [items, filter, hideMinors, selectedTeamId])

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">MLB Transactions</h2>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`rounded-full px-3 py-1 text-xs font-bold ${filter === key ? "bg-green-900 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-4 text-xs text-gray-600">
          <label className="flex items-center gap-2">
            Last
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-gray-200 bg-white px-2 py-1 font-semibold"
            >
              {[7, 14, 30, 60].map((d) => (
                <option key={d} value={d}>{d} days</option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={hideMinors} onChange={(e) => setHideMinors(e.target.checked)} />
            Hide minor league moves
          </label>
          {selectedTeamId ? <span className="text-gray-400">Showing the selected team only</span> : null}
        </div>
      </div>

      {error && <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>}
      {!error && !items && <div className="p-4 text-sm text-gray-500">Loading...</div>}
      {items && visible.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">No moves match these filters.</div>
      )}

      <div className="space-y-2">
        {visible.slice(0, shown).map((t) => {
          const category = CATEGORY[t.type]
          return (
            <article key={t.id} className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
              <div className="hidden shrink-0 flex-col gap-1 sm:flex">
                {[t.fromTeamId, t.toTeamId].filter((id): id is number => id !== null).map((id) => (
                  <Link key={id} to={`/mlb/teams/${id}`}>
                    <img src={logo(id)} alt="" className="h-8 w-8 object-contain" />
                  </Link>
                ))}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  <span className={`rounded px-1.5 py-0.5 ${TYPE_STYLE[category]}`}>{t.type}</span>
                  <span>{formatDate(t.date)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">{t.description}</p>
              </div>
            </article>
          )
        })}
      </div>

      {visible.length > shown && (
        <button
          onClick={() => setShown((n) => n + PAGE_SIZE)}
          className="w-full rounded-2xl bg-white py-3 text-sm font-bold text-green-900 shadow-sm hover:bg-gray-50"
        >
          Show more ({visible.length - shown} left)
        </button>
      )}
    </div>
  )
}
