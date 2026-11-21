import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getJblData, getJblDraft, getJblPlayoffs, jblTeamSlug } from "../../api/jbl"
import { DIVISIONS, DIVISION_NAMES } from "../../sim/jblSeason"
import { buildDraftNews, buildNews, NEWS_CATEGORY_LABELS, type NewsCategory, type NewsItem } from "./news"
import type { PlayoffsJson } from "./playoffs"
import { teamBadge, teamColors } from "./teamTheme"

const PAGE_SIZE = 30
const CATEGORY_ORDER: (NewsCategory | "all")[] = ["all", "offseason", "playoffs", "season", "standings", "streaks", "milestones", "games"]

const IMPORTANCE_LABEL = { 3: "Top story", 2: "", 1: "" } as const

function formatDate(date: string) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })
}

function NewsCard({ item }: { item: NewsItem }) {
  const lead = item.teams[0]
  const color = lead ? teamColors(lead).primary : "#6b7280"
  return (
    <article
      className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5"
      style={{ borderLeft: `4px solid ${color}` }}
    >
      <div className="flex gap-4 p-4">
        <div className="hidden shrink-0 flex-col gap-2 sm:flex">
          {item.teams.slice(0, 2).map((team) => (
            <span key={team}>{teamBadge(team, "xl")}</span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
            <span>{NEWS_CATEGORY_LABELS[item.category]}</span>
            {item.importance === 3 && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-amber-700">{IMPORTANCE_LABEL[3]}</span>
            )}
          </div>
          <h3 className="mt-1 text-base font-black leading-snug text-gray-900">{item.headline}</h3>
          <p className="mt-1 text-sm leading-relaxed text-gray-600">{item.body}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {item.gameId && (
              <Link
                to={`/jbl/games/${item.gameId}`}
                className="rounded-full bg-green-900 px-3 py-1 text-xs font-bold text-white hover:bg-green-800"
              >
                Watch the game
              </Link>
            )}
            {item.teams.slice(0, 3).map((team) => (
              <Link
                key={team}
                to={`/jbl/teams/${jblTeamSlug(team)}`}
                className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600 hover:bg-gray-200"
              >
                {team}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </article>
  )
}

export default function NewsTab({ selectedTeamName }: { selectedTeamName?: string }) {
  const [news, setNews] = useState<NewsItem[] | null>(null)
  const [error, setError] = useState("")
  const [category, setCategory] = useState<NewsCategory | "all">("all")
  const [topOnly, setTopOnly] = useState(false)
  const [teamOnly, setTeamOnly] = useState(true)
  const [visible, setVisible] = useState(PAGE_SIZE)

  useEffect(() => {
    let cancelled = false
    Promise.all([getJblData(), getJblPlayoffs(), getJblDraft().catch(() => null)])
      .then(([data, playoffs, draft]) => {
        if (cancelled) return
        const items = buildNews(data.season, playoffs as PlayoffsJson | null, DIVISIONS, DIVISION_NAMES)
        if (draft) items.push(...buildDraftNews(draft))
        setNews(items.sort((a, b) => b.date.localeCompare(a.date) || b.importance - a.importance))
      })
      .catch(() => {
        if (!cancelled) setError("Failed to load JBL news.")
      })
    return () => {
      cancelled = true
    }
  }, [])

  const filtered = useMemo(() => {
    if (!news) return []
    return news.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (!topOnly || item.importance === 3) &&
        (!selectedTeamName || !teamOnly || item.teams.includes(selectedTeamName)),
    )
  }, [news, category, topOnly, teamOnly, selectedTeamName])

  const counts = useMemo(() => {
    const result: Record<string, number> = { all: 0 }
    for (const item of news ?? []) {
      if (selectedTeamName && teamOnly && !item.teams.includes(selectedTeamName)) continue
      if (topOnly && item.importance !== 3) continue
      result.all += 1
      result[item.category] = (result[item.category] ?? 0) + 1
    }
    return result
  }, [news, selectedTeamName, teamOnly, topOnly])

  if (error) return <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
  if (!news) return <div className="p-4 text-sm text-gray-500">Loading...</div>

  const shown = filtered.slice(0, visible)
  const groups: { date: string; items: NewsItem[] }[] = []
  for (const item of shown) {
    const last = groups[groups.length - 1]
    if (last && last.date === item.date) last.items.push(item)
    else groups.push({ date: item.date, items: [item] })
  }

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold transition ${
      active ? "bg-green-900 text-white" : "bg-white text-gray-600 ring-1 ring-black/10 hover:bg-gray-50"
    }`

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <h2 className="text-xs font-black uppercase tracking-widest text-green-900">JBL News</h2>
        <p className="mt-1 text-sm text-gray-500">
          Streaks, milestones, division races and the postseason, written from the season data.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {CATEGORY_ORDER.map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => {
                setCategory(key)
                setVisible(PAGE_SIZE)
              }}
              className={chip(category === key)}
            >
              {NEWS_CATEGORY_LABELS[key]} <span className="opacity-60">{counts[key] ?? 0}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
          <label className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={topOnly}
              onChange={(event) => {
                setTopOnly(event.target.checked)
                setVisible(PAGE_SIZE)
              }}
            />
            Top stories only
          </label>
          {selectedTeamName && (
            <label className="flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                checked={teamOnly}
                onChange={(event) => {
                  setTeamOnly(event.target.checked)
                  setVisible(PAGE_SIZE)
                }}
              />
              Only {selectedTeamName}
            </label>
          )}
        </div>
      </div>

      {groups.length === 0 && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">No stories match these filters.</div>
      )}

      {groups.map((group) => (
        <section key={group.date} className="space-y-3">
          <h3 className="text-xs font-black uppercase tracking-widest text-gray-500">{formatDate(group.date)}</h3>
          {group.items.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </section>
      ))}

      {filtered.length > visible && (
        <div className="text-center">
          <button
            type="button"
            onClick={() => setVisible((n) => n + PAGE_SIZE)}
            className="rounded-full bg-green-900 px-5 py-2 text-sm font-bold text-white hover:bg-green-800"
          >
            Show more ({filtered.length - visible} left)
          </button>
        </div>
      )}
    </div>
  )
}
