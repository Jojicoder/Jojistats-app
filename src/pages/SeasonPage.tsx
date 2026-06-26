import { useMemo, useState } from "react"
import {
  simulateSeason,
  DIVISIONS,
  DIVISION_NAMES,
  type SeasonResult,
  type TeamRecord,
  type PlayoffSeries,
  type PlayoffSeed,
} from "../sim/jblSeason"

// ── Colors (same palette as SimPage) ─────────────────────────────────────────

type TeamColors = { primary: string; secondary: string; accent: string }

const TEAM_COLORS: Record<string, TeamColors> = {
  "Newark Knights":         { primary: "#8b5cf6", secondary: "#1e1b4b", accent: "#c4b5fd" },
  "Queens Titans":          { primary: "#10b981", secondary: "#065f46", accent: "#ffffff" },
  "Brooklyn Hammers":       { primary: "#3b82f6", secondary: "#1e3a8a", accent: "#fbbf24" },
  "Bronx Wolves":           { primary: "#ef4444", secondary: "#1f2937", accent: "#94a3b8" },
  "Harlem Eagles":          { primary: "#f97316", secondary: "#1c1917", accent: "#fef3c7" },
  "Staten Island Foxes":    { primary: "#eab308", secondary: "#1e3a8a", accent: "#ffffff" },
  "Fishtown Ferals":        { primary: "#14b8a6", secondary: "#0f172a", accent: "#a3e635" },
  "Kensington Iron":        { primary: "#f59e0b", secondary: "#374151", accent: "#ffffff" },
  "Germantown Colonials":   { primary: "#a855f7", secondary: "#1e1b4b", accent: "#fbbf24" },
  "Manayunk Runners":       { primary: "#22c55e", secondary: "#14532d", accent: "#ffffff" },
  "Fairmount Rams":         { primary: "#ec4899", secondary: "#1f2937", accent: "#ffffff" },
  "South Philly Stallions": { primary: "#64748b", secondary: "#1f2937", accent: "#fbbf24" },
  "Georgetown Ravens":      { primary: "#06b6d4", secondary: "#0c4a6e", accent: "#ffffff" },
  "Capitol Hill Senators":  { primary: "#be123c", secondary: "#1e3a8a", accent: "#ffffff" },
  "Anacostia Kings":        { primary: "#84cc16", secondary: "#1f2937", accent: "#fbbf24" },
  "Alexandria Cannons":     { primary: "#6366f1", secondary: "#1e1b4b", accent: "#c7d2fe" },
  "Bethesda Blaze":         { primary: "#f43f5e", secondary: "#1f2937", accent: "#fb923c" },
  "Silver Spring Ghosts":   { primary: "#94a3b8", secondary: "#1e293b", accent: "#ffffff" },
}

function tc(name: string): TeamColors {
  return TEAM_COLORS[name] ?? { primary: "#6b7280", secondary: "#374151", accent: "#ffffff" }
}

function badge(name: string) {
  const c = tc(name)
  const abbr = name.split(" ").slice(-1)[0].slice(0, 3).toUpperCase()
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-black tracking-wide shrink-0"
      style={{
        background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
        color: c.accent,
        border: `1px solid ${c.primary}88`,
      }}
    >
      {abbr}
    </span>
  )
}

// ── Division standings table ───────────────────────────────────────────────

function DivisionTable({
  divKey,
  teams,
  playoffSeeds,
}: {
  divKey: string
  teams: TeamRecord[]
  playoffSeeds: PlayoffSeed[]
}) {
  const getSeedNum = (name: string) => playoffSeeds.find((s) => s.team === name)?.seed

  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">
          {DIVISION_NAMES[divKey]}
        </h3>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
            <th className="py-2 pl-1 w-1" />
            <th className="py-2 pl-3 pr-2 text-left">Team</th>
            <th className="py-2 px-2 text-right">W</th>
            <th className="py-2 px-2 text-right">L</th>
            <th className="py-2 px-2 text-right">PCT</th>
            <th className="py-2 px-2 text-right">GB</th>
            <th className="py-2 px-2 text-right">L10</th>
            <th className="py-2 px-2 text-right">Str</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">H</th>
            <th className="py-2 px-3 text-right hidden sm:table-cell">A</th>
            <th className="py-2 px-3 text-right hidden md:table-cell">Div</th>
            <th className="py-2 px-3 text-right hidden md:table-cell">RS</th>
            <th className="py-2 px-3 text-right hidden md:table-cell">RA</th>
          </tr>
        </thead>
        <tbody>
          {teams.map((t, i) => {
            const c = tc(t.name)
            const gb = i === 0 ? "—" : t.gb.toFixed(1)
            const isLeader = i === 0
            const seedNum = getSeedNum(t.name)
            const streakStr = t.streak > 0 ? `W${t.streak}` : `L${Math.abs(t.streak)}`
            const rsPG = (t.rs / (t.wins + t.losses)).toFixed(2)
            const raPG = (t.ra / (t.wins + t.losses)).toFixed(2)
            return (
              <tr
                key={t.name}
                className="border-b border-gray-50 last:border-0"
                style={{ background: isLeader ? `${c.primary}0d` : undefined }}
              >
                <td className="py-0 pl-0 pr-0 w-1">
                  <div
                    className="h-full w-1 min-h-[38px]"
                    style={{ background: `linear-gradient(to bottom, ${c.primary}, ${c.secondary})` }}
                  />
                </td>
                <td className="py-2 pl-3 pr-2">
                  <div className="flex items-center gap-1.5">
                    {badge(t.name)}
                    <span className="font-semibold text-[13px]" style={{ color: c.primary }}>
                      {t.name}
                    </span>
                    {seedNum && (
                      <span className="ml-1 text-[9px] font-bold px-1 py-0.5 rounded bg-gray-100 text-gray-500">
                        #{seedNum} {seedNum <= 3 ? "🏆" : "🃏"}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2 px-2 text-right font-mono font-bold text-gray-800 text-[13px]">{t.wins}</td>
                <td className="py-2 px-2 text-right font-mono text-gray-500 text-[13px]">{t.losses}</td>
                <td className="py-2 px-2 text-right font-mono font-semibold text-[13px]" style={{ color: c.primary }}>
                  {t.pct.toFixed(3)}
                </td>
                <td className="py-2 px-2 text-right font-mono text-gray-400 text-[13px]">{gb}</td>
                <td className="py-2 px-2 text-right font-mono text-[12px] text-gray-600">
                  {t.last10W}-{t.last10L}
                </td>
                <td
                  className="py-2 px-2 text-right font-mono text-[12px] font-semibold"
                  style={{ color: t.streak > 0 ? "#16a34a" : "#dc2626" }}
                >
                  {streakStr}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden sm:table-cell">
                  {t.homeWins}-{t.homeLosses}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden sm:table-cell">
                  {t.awayWins}-{t.awayLosses}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[12px] text-gray-500 hidden md:table-cell">
                  {t.divWins}-{t.divLosses}
                </td>
                <td className="py-2 px-3 text-right font-mono text-[12px] text-green-700 hidden md:table-cell">{rsPG}</td>
                <td className="py-2 px-3 text-right font-mono text-[12px] text-red-600 hidden md:table-cell">{raPG}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Playoff bracket ───────────────────────────────────────────────────────────

function SeriesCard({ series, label }: { series: PlayoffSeries; label: string }) {
  const ch = tc(series.higher)
  const cl = tc(series.lower)
  const winner = series.winner

  return (
    <div className="rounded-xl bg-white shadow-sm overflow-hidden border border-gray-100">
      <div className="px-3 py-1.5 bg-gray-50 border-b border-gray-100">
        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</span>
        <span className="ml-2 text-[10px] text-gray-400">Best-of-{series.format}</span>
      </div>
      {[{ team: series.higher, wins: series.higherWins, c: ch }, { team: series.lower, wins: series.lowerWins, c: cl }].map(({ team, wins, c }) => (
        <div
          key={team}
          className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 last:border-0"
          style={{ background: winner === team ? `${c.primary}10` : undefined }}
        >
          {badge(team)}
          <span className="flex-1 text-sm font-semibold truncate" style={{ color: c.primary }}>
            {team}
          </span>
          <span className="font-mono text-lg font-extrabold" style={{ color: winner === team ? c.primary : "#9ca3af" }}>
            {wins}
          </span>
          {winner === team && <span className="text-xs">✓</span>}
        </div>
      ))}
    </div>
  )
}

function PlayoffView({ bracket }: { bracket: SeasonResult["playoffs"] }) {
  const { wildCardRound, semifinal, final, champion, seeds } = bracket

  return (
    <div className="space-y-6">
      {/* Seeds */}
      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100">
          <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">プレーオフ出場チーム</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-0">
          {seeds.map((s) => {
            const c = tc(s.team)
            return (
              <div
                key={s.team}
                className="flex items-center gap-3 px-4 py-3 border-b border-r border-gray-50"
              >
                <span className="text-2xl font-extrabold font-mono" style={{ color: c.primary }}>
                  #{s.seed}
                </span>
                <div>
                  <div className="flex items-center gap-1.5">
                    {badge(s.team)}
                    <span className="text-xs font-bold" style={{ color: c.primary }}>{s.team}</span>
                  </div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-gray-400 font-mono">{s.record}</span>
                    <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 text-gray-400 font-bold">
                      {s.qualifier === "div" ? "地区優勝" : "ワイルドカード"}
                    </span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Rounds */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 px-1">
            ワイルドカードラウンド (Best-of-3)
          </p>
          {wildCardRound.map((s, i) => (
            <SeriesCard key={i} series={s} label={`WC${i + 1}`} />
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 px-1">
            準決勝 (Best-of-5)
          </p>
          {semifinal.map((s, i) => (
            <SeriesCard key={i} series={s} label={`SF${i + 1}`} />
          ))}
        </div>

        <div className="space-y-3">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-gray-400 px-1">
            JBL 日本シリーズ (Best-of-7)
          </p>
          {final && <SeriesCard series={final} label="FINAL" />}
          {champion && (
            <div className="rounded-xl overflow-hidden shadow-md">
              <div
                className="px-4 py-3 text-center"
                style={{
                  background: `linear-gradient(135deg, ${tc(champion).primary}, ${tc(champion).secondary})`,
                  color: tc(champion).accent,
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">🏆 JBL チャンピオン</p>
                <p className="text-lg font-extrabold mt-1">{champion}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Schedule / Results table ──────────────────────────────────────────────────

function ScheduleView({ season }: { season: SeasonResult }) {
  const [selectedTeam, setSelectedTeam] = useState<string>("all")
  const [dateFilter, setDateFilter] = useState<string>("")

  const filtered = useMemo(() => {
    return season.results
      .filter((r) => selectedTeam === "all" || r.away === selectedTeam || r.home === selectedTeam)
      .filter((r) => !dateFilter || r.date.startsWith(dateFilter))
      .slice(0, 200)
  }, [season.results, selectedTeam, dateFilter])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <select
          className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white"
          value={selectedTeam}
          onChange={(e) => setSelectedTeam(e.target.value)}
        >
          <option value="all">全チーム</option>
          {Object.entries(DIVISIONS).map(([divKey, teams]) => (
            <optgroup key={divKey} label={DIVISION_NAMES[divKey]}>
              {teams.map((t) => <option key={t} value={t}>{t}</option>)}
            </optgroup>
          ))}
        </select>
        <input
          type="month"
          className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          placeholder="月でフィルター"
        />
        <button
          onClick={() => { setSelectedTeam("all"); setDateFilter("") }}
          className="rounded-lg border border-gray-200 text-sm px-3 py-2 bg-white text-gray-500 hover:bg-gray-50"
        >
          リセット
        </button>
        <span className="text-sm text-gray-400 self-center">{filtered.length} 試合表示中</span>
      </div>

      <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] font-bold uppercase tracking-wider text-gray-400 border-b border-gray-100">
                <th className="py-2 px-4 text-left">日付</th>
                <th className="py-2 px-3 text-right">Away</th>
                <th className="py-2 px-2 text-center">スコア</th>
                <th className="py-2 px-3 text-left">Home</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, i) => {
                const awayWon = r.awayRuns > r.homeRuns
                const ca = tc(r.away)
                const ch = tc(r.home)
                return (
                  <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    <td className="py-2 px-4 font-mono text-[12px] text-gray-400">{r.date}</td>
                    <td className="py-2 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: awayWon ? ca.primary : "#9ca3af" }}
                        >
                          {r.away}
                        </span>
                        {badge(r.away)}
                      </div>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <span className="font-mono font-extrabold text-gray-800 text-[15px]">
                        {r.awayRuns}
                        <span className="text-gray-300 mx-1">-</span>
                        {r.homeRuns}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <div className="flex items-center gap-1.5">
                        {badge(r.home)}
                        <span
                          className="text-[13px] font-semibold"
                          style={{ color: !awayWon ? ch.primary : "#9ca3af" }}
                        >
                          {r.home}
                        </span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

// ── Overall standings ─────────────────────────────────────────────────────────

function OverallStandings({ records }: { records: TeamRecord[] }) {
  const leader = records[0]
  return (
    <div className="rounded-2xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h3 className="text-sm font-extrabold uppercase tracking-widest text-gray-500">総合順位</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] font-bold uppercase tracking-widest text-gray-400 border-b border-gray-100">
              <th className="py-2 pl-1 w-1" />
              <th className="py-2 pl-3 pr-2 text-left w-8">#</th>
              <th className="py-2 px-2 text-left">Team</th>
              <th className="py-2 px-2 text-right">W</th>
              <th className="py-2 px-2 text-right">L</th>
              <th className="py-2 px-2 text-right">PCT</th>
              <th className="py-2 px-2 text-right">GB</th>
              <th className="py-2 px-3 text-right hidden sm:table-cell">RS/G</th>
              <th className="py-2 px-3 text-right hidden sm:table-cell">RA/G</th>
            </tr>
          </thead>
          <tbody>
            {records.map((t, i) => {
              const c = tc(t.name)
              const gb = i === 0 ? "—" : (((leader.wins - t.wins) + (t.losses - leader.losses)) / 2).toFixed(1)
              const rsPG = (t.rs / (t.wins + t.losses)).toFixed(2)
              const raPG = (t.ra / (t.wins + t.losses)).toFixed(2)
              return (
                <tr key={t.name} className="border-b border-gray-50 last:border-0" style={{ background: i < 3 ? `${c.primary}08` : undefined }}>
                  <td className="py-0 w-1">
                    <div className="h-full w-1 min-h-[36px]" style={{ background: `linear-gradient(to bottom, ${c.primary}, ${c.secondary})` }} />
                  </td>
                  <td className="py-2 pl-3 pr-2 text-gray-400 font-mono text-xs">{i + 1}</td>
                  <td className="py-2 px-2">
                    <div className="flex items-center gap-2">
                      {badge(t.name)}
                      <span className="font-semibold text-[13px]" style={{ color: c.primary }}>{t.name}</span>
                      <span className="text-[10px] text-gray-400">{DIVISION_NAMES[t.division].replace(" Division", "")}</span>
                    </div>
                  </td>
                  <td className="py-2 px-2 text-right font-mono font-bold text-gray-800 text-[13px]">{t.wins}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-500 text-[13px]">{t.losses}</td>
                  <td className="py-2 px-2 text-right font-mono font-semibold text-[13px]" style={{ color: c.primary }}>{t.pct.toFixed(3)}</td>
                  <td className="py-2 px-2 text-right font-mono text-gray-400 text-[13px]">{gb}</td>
                  <td className="py-2 px-3 text-right font-mono text-[12px] text-green-700 hidden sm:table-cell">{rsPG}</td>
                  <td className="py-2 px-3 text-right font-mono text-[12px] text-red-600 hidden sm:table-cell">{raPG}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

type SeasonView = "divisions" | "overall" | "schedule" | "playoffs"

export default function SeasonPage() {
  const [season, setSeason] = useState<SeasonResult | null>(null)
  const [view, setView] = useState<SeasonView>("divisions")
  const [running, setRunning] = useState(false)
  const [seedInput, setSeedInput] = useState("")

  function run(seed?: number) {
    setRunning(true)
    // defer to next tick so the button shows spinner before the sync computation
    setTimeout(() => {
      const result = simulateSeason(seed, 2026)
      setSeason(result)
      setRunning(false)
    }, 10)
  }

  const tabs: { key: SeasonView; label: string }[] = [
    { key: "divisions", label: "地区別" },
    { key: "overall",   label: "総合" },
    { key: "schedule",  label: "スケジュール" },
    { key: "playoffs",  label: "プレーオフ" },
  ]

  return (
    <div className="flex flex-1 flex-col bg-gray-50">
      <div className="max-w-7xl mx-auto w-full px-4 py-6 space-y-6">

        {/* Header controls */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">JBL 2026 シーズン</h1>
            {season && (
              <p className="text-sm text-gray-400 mt-0.5">
                {season.results.length} 試合 · Seed: {season.seed.toString(16).toUpperCase()}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              className="rounded-lg border border-gray-200 text-sm px-3 py-2 w-32 font-mono"
              placeholder="Seed (任意)"
              value={seedInput}
              onChange={(e) => setSeedInput(e.target.value)}
            />
            <button
              onClick={() => run(seedInput ? Number.parseInt(seedInput, 16) || Number(seedInput) : undefined)}
              disabled={running}
              className="rounded-lg px-5 py-2 text-sm font-bold text-white transition-opacity disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #6366f1)" }}
            >
              {running ? "シミュレート中…" : season ? "再シミュレート" : "シーズンをシミュレート"}
            </button>
          </div>
        </div>

        {/* No season yet */}
        {!season && !running && (
          <div className="rounded-2xl bg-white shadow-sm p-12 text-center">
            <p className="text-4xl mb-4">⚾</p>
            <p className="text-gray-500 font-semibold">「シーズンをシミュレート」ボタンで JBL 2026 レギュラーシーズン（162試合×18チーム）をシミュレートします</p>
            <p className="text-sm text-gray-400 mt-2">ブラウザ内で完結・即時実行</p>
          </div>
        )}

        {running && (
          <div className="rounded-2xl bg-white shadow-sm p-12 text-center">
            <p className="text-gray-400 text-sm animate-pulse">2926 試合をシミュレート中…</p>
          </div>
        )}

        {season && !running && (
          <>
            {/* Summary bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "総試合数", value: season.results.length.toLocaleString() },
                { label: "1位 (全体)", value: season.records[0].name.split(" ").slice(-1)[0], sub: `${season.records[0].wins}-${season.records[0].losses}` },
                { label: "チャンピオン", value: season.playoffs.champion?.split(" ").slice(-1)[0] ?? "—" },
                { label: "最多勝", value: `${season.records[0].wins}勝`, sub: season.records[0].name },
              ].map((item) => (
                <div key={item.label} className="rounded-xl bg-white shadow-sm p-4 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{item.label}</p>
                  <p className="mt-1 text-xl font-extrabold text-gray-900 leading-tight">{item.value}</p>
                  {item.sub && <p className="text-[10px] text-gray-400 mt-0.5">{item.sub}</p>}
                </div>
              ))}
            </div>

            {/* Tab nav */}
            <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setView(t.key)}
                  className="flex-1 rounded-lg py-2 text-sm font-semibold transition-all"
                  style={
                    view === t.key
                      ? { background: "white", color: "#8b5cf6", boxShadow: "0 1px 3px rgba(0,0,0,.1)" }
                      : { color: "#6b7280" }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Division standings */}
            {view === "divisions" && (
              <div className="space-y-5">
                {Object.keys(DIVISIONS).map((divKey) => (
                  <DivisionTable
                    key={divKey}
                    divKey={divKey}
                    teams={season.divisionStandings[divKey]}
                    playoffSeeds={season.playoffs.seeds}
                  />
                ))}
              </div>
            )}

            {/* Overall */}
            {view === "overall" && <OverallStandings records={season.records} />}

            {/* Schedule */}
            {view === "schedule" && <ScheduleView season={season} />}

            {/* Playoffs */}
            {view === "playoffs" && <PlayoffView bracket={season.playoffs} />}
          </>
        )}
      </div>
    </div>
  )
}
