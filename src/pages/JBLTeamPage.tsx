import { useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import PageShell from "../components/PageShell"
import { getJblData, getJblVisibleGames, type JblTeam } from "../api/jbl"
import { battingFromGames, pitchingFromGames } from "../components/jbl/stats"
import { jblThemeStyle, teamColors } from "../components/jbl/teamTheme"
import type { SimBatter, SimPitcher } from "../components/jbl/types"

function StatTile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-xl bg-[#f7f8f3] p-3 text-center">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-xl font-extrabold text-gray-900">{value}</p>
      {detail && <p className="mt-0.5 text-xs text-gray-400">{detail}</p>}
    </div>
  )
}

export default function JBLTeamPage() {
  const { teamId } = useParams()
  const navigate = useNavigate()

  const [teams, setTeams] = useState<JblTeam[]>([])
  const [batters, setBatters] = useState<SimBatter[]>([])
  const [pitchers, setPitchers] = useState<SimPitcher[]>([])
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      try {
        const { teams, visibleThrough } = await getJblData()
        const games = await getJblVisibleGames(visibleThrough)
        if (cancelled) return
        setTeams([...teams].sort((a, b) => a.name.localeCompare(b.name)))
        setBatters(battingFromGames(games))
        setPitchers(pitchingFromGames(games))
      } catch {
        if (!cancelled) setError("Failed to load this JBL team.")
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  const team = teams.find((candidate) => candidate.id === teamId) ?? null
  const handleChangeTeam = (name: string) => {
    const selected = teams.find((candidate) => candidate.name === name)
    if (selected) navigate(`/jbl/teams/${selected.id}`)
  }

  return (
    <PageShell
      variant="mlb"
      style={jblThemeStyle(team?.name ?? "")}
      headerProps={{
        teamName: team?.name ?? "",
        teams: teams.map((candidate) => candidate.name),
        onChangeTeam: handleChangeTeam,
        placeholder: "Select a JBL team...",
      }}
      activeView="team"
      onChangeView={() => {}}
      tabs={[
        { label: "Team Overview", view: "team" },
        { label: "Players", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=players` },
        { label: "Today's Games", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=today` },
        { label: "Standings", href: `/jbl?team=${encodeURIComponent(team?.name ?? "")}&view=standings` },
        { label: "Back to Your Stats", href: "/stats" },
      ]}
    >
      {loading && (
        <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
          Loading team...
        </div>
      )}

      {!loading && (error || !team) && (
        <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">
          {error || "Team not found."}
        </div>
      )}

      {!loading && team && (
        <div className="space-y-5">
          {(() => {
            const c = teamColors(team.name)
            const teamBatters = batters.filter((p) => p.team === team.name).slice(0, 5)
            const teamPitchers = pitchers.filter((p) => p.team === team.name).slice(0, 5)
            const abbr = team.name.split(" ").slice(-1)[0].slice(0, 3).toUpperCase()

            return (
              <>
                <section className="rounded-2xl overflow-hidden shadow-sm">
                  <div
                    className="px-5 pt-5 pb-4"
                    style={{ background: `linear-gradient(135deg, ${c.secondary} 0%, ${c.primary}cc 60%, ${c.primary}55 100%)` }}
                  >
                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.28em]" style={{ color: `${c.accent}99` }}>
                          Team Overview
                        </p>
                        <h1 className="mt-1 text-3xl font-black tracking-tight" style={{ color: c.accent }}>
                          {team.name}
                        </h1>
                      </div>
                      <span
                        className="text-5xl font-black tracking-tight select-none leading-none"
                        style={{ color: `${c.accent}25` }}
                      >
                        {abbr}
                      </span>
                    </div>
                  </div>
                  <div className="h-1" style={{ background: `linear-gradient(90deg, ${c.accent}66, ${c.primary}, ${c.accent}33)` }} />
                  <div className="bg-white p-5">
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                      <StatTile label="W-L" value={`${team.wins}-${team.losses}`} />
                      <StatTile label="PCT" value={team.pct.toFixed(3)} />
                      <StatTile label="RS/G" value={team.rsPerGame.toFixed(2)} />
                      <StatTile label="RA/G" value={team.raPerGame.toFixed(2)} />
                      <StatTile label="DIFF" value={(team.rsPerGame - team.raPerGame).toFixed(2)} detail="runs/game" />
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 lg:grid-cols-2">
                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold" style={{ color: c.primary }}>Top Batters</h2>
                    <div className="mt-4 space-y-2">
                      {teamBatters.map((p) => (
                        <div
                          key={p.name}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: `${c.primary}0d`, borderLeft: `3px solid ${c.primary}66` }}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">OPS {p.ops.toFixed(3)} · HR {p.hr}</p>
                          </div>
                          <span className="font-mono text-sm font-black" style={{ color: c.primary }}>{p.avg.toFixed(3)}</span>
                        </div>
                      ))}
                    </div>
                  </section>

                  <section className="rounded-2xl bg-white p-5 shadow-sm">
                    <h2 className="text-base font-bold" style={{ color: c.primary }}>Top Pitchers</h2>
                    <div className="mt-4 space-y-2">
                      {teamPitchers.map((p) => (
                        <div
                          key={p.name}
                          className="flex items-center justify-between rounded-xl px-3 py-2.5"
                          style={{ background: `${c.primary}0d`, borderLeft: `3px solid ${c.primary}66` }}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-400">WHIP {p.whip.toFixed(2)} · K/9 {p.k9.toFixed(1)}</p>
                          </div>
                          <span className="font-mono text-sm font-black" style={{ color: c.primary }}>{p.era.toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </>
            )
          })()}
        </div>
      )}
    </PageShell>
  )
}
