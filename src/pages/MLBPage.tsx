import { useEffect, useState } from "react"
import Header from "../components/Header"
import TopTabs from "../components/TopTabs"

const MLB_API = "https://statsapi.mlb.com/api/v1"
const SEASON = new Date().getFullYear()

// ── Types ──────────────────────────────────────────────────────────────

type MLBGame = {
  gamePk: number
  gameDate: string
  status: { detailedState: string; abstractGameState: string }
  teams: {
    away: { team: { id: number; name: string }; score?: number; isWinner?: boolean }
    home: { team: { id: number; name: string }; score?: number; isWinner?: boolean }
  }
}

type DivisionRecord = {
  name: string
  teamRecords: Array<{
    team: { id: number; name: string }
    wins: number
    losses: number
    gamesBack: string
    winningPercentage: string
  }>
}

type MLBTeam = {
  id: number
  name: string
  abbreviation: string
  sport?: { id: number }
}

type RosterPlayer = {
  person: { id: number; fullName: string }
  position: { abbreviation: string }
  jerseyNumber?: string
}

// ── API ──────────────────────────────────────────────────────────────

async function getTodayGames(date: string): Promise<MLBGame[]> {
  const res = await fetch(`${MLB_API}/schedule?sportId=1&date=${date}`)
  const json = await res.json()
  return json.dates?.[0]?.games ?? []
}

async function getStandings(): Promise<DivisionRecord[]> {
  const res = await fetch(`${MLB_API}/standings?leagueId=103,104&season=${SEASON}`)
  const json = await res.json()
  return json.records ?? []
}

async function getAllTeams(): Promise<MLBTeam[]> {
  const res = await fetch(`${MLB_API}/teams?sportId=1&activeStatus=Y&season=${SEASON}`)
  const json = await res.json()
  const teams: MLBTeam[] = (json.teams ?? []).filter(
    (t: MLBTeam) => t.sport?.id === 1
  )
  return teams.sort((a, b) => a.name.localeCompare(b.name))
}

async function getRoster(teamId: number): Promise<RosterPlayer[]> {
  const res = await fetch(`${MLB_API}/teams/${teamId}/roster?season=${SEASON}&rosterType=active`)
  const json = await res.json()
  return json.roster ?? []
}

async function getPlayerStats(playerId: number, group: "hitting" | "pitching") {
  const res = await fetch(
    `${MLB_API}/people/${playerId}/stats?stats=season&season=${SEASON}&group=${group}`
  )
  const json = await res.json()
  return json.stats?.[0]?.splits?.[0]?.stat ?? null
}

// ── Today's Games ─────────────────────────────────────────────────────

function TodayTab() {
  const [games, setGames] = useState<MLBGame[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0]
    getTodayGames(today)
      .then(setGames)
      .catch(() => setError("Failed to load today's games."))
  }, [])

  if (!games && !error) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>
  if (games!.length === 0) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-500">
        No games scheduled today.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-widest text-green-700">
        {new Date().toLocaleDateString("en-US", {
          weekday: "long",
          month: "long",
          day: "numeric",
          year: "numeric",
        })}
      </p>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {games!.map((game) => {
          const isFinal = game.status.abstractGameState === "Final"
          const isLive = game.status.abstractGameState === "Live"
          const gameTime = new Date(game.gameDate).toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            timeZoneName: "short",
          })
          return (
            <div key={game.gamePk} className="rounded-2xl bg-white p-4 shadow-sm">
              <span
                className={`mb-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                  isLive
                    ? "bg-green-100 text-green-700"
                    : isFinal
                    ? "bg-gray-100 text-gray-500"
                    : "bg-[#f7f8f3] text-gray-500"
                }`}
              >
                {isLive ? "● Live" : isFinal ? "Final" : gameTime}
              </span>
              <div className="space-y-2">
                {([game.teams.away, game.teams.home] as const).map((side, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <span
                      className={`text-sm font-semibold ${
                        side.isWinner ? "text-green-900" : "text-gray-700"
                      }`}
                    >
                      {side.team.name}
                    </span>
                    {(isFinal || isLive) && side.score !== undefined && (
                      <span
                        className={`text-xl font-extrabold tabular-nums ${
                          side.isWinner ? "text-green-900" : "text-gray-400"
                        }`}
                      >
                        {side.score}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Standings ─────────────────────────────────────────────────────────

const DIVISION_ORDER = [
  "AL East", "AL Central", "AL West",
  "NL East", "NL Central", "NL West",
]

function StandingsTab() {
  const [divisions, setDivisions] = useState<DivisionRecord[] | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    getStandings()
      .then(setDivisions)
      .catch(() => setError("Failed to load standings."))
  }, [])

  if (!divisions && !error) return <div className="p-4 text-sm text-gray-500">Loading...</div>
  if (error) return <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-red-500">{error}</div>

  const sorted = [...(divisions ?? [])].sort(
    (a, b) => DIVISION_ORDER.indexOf(a.name) - DIVISION_ORDER.indexOf(b.name)
  )

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {sorted.map((div) => (
        <div key={div.name} className="rounded-2xl bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-green-700">
            {div.name}
          </p>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400">
                <th className="pb-1.5 text-left font-semibold">Team</th>
                <th className="pb-1.5 text-right font-semibold w-8">W</th>
                <th className="pb-1.5 text-right font-semibold w-8">L</th>
                <th className="pb-1.5 text-right font-semibold w-12">PCT</th>
                <th className="pb-1.5 text-right font-semibold w-10">GB</th>
              </tr>
            </thead>
            <tbody>
              {div.teamRecords.map((row, i) => (
                <tr key={row.team.id} className="border-b border-gray-50 last:border-0">
                  <td
                    className={`py-1.5 pr-2 font-medium ${
                      i === 0 ? "text-green-900" : "text-gray-700"
                    }`}
                  >
                    {row.team.name}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-700">{row.wins}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-700">{row.losses}</td>
                  <td className="py-1.5 text-right tabular-nums text-gray-500">
                    {row.winningPercentage}
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-gray-400">
                    {i === 0 ? "—" : row.gamesBack}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  )
}

// ── Players ───────────────────────────────────────────────────────────

const HITTING_CARDS = [
  { key: "avg",         label: "AVG", desc: "Batting Average" },
  { key: "obp",         label: "OBP", desc: "On-base Percentage" },
  { key: "ops",         label: "OPS", desc: "OBP + SLG" },
  { key: "homeRuns",    label: "HR",  desc: "Home Runs" },
  { key: "rbi",         label: "RBI", desc: "Runs Batted In" },
  { key: "stolenBases", label: "SB",  desc: "Stolen Bases" },
]

const PITCHING_CARDS = [
  { key: "era",           label: "ERA",  desc: "Earned Run Average" },
  { key: "whip",          label: "WHIP", desc: "Walks + Hits / IP" },
  { key: "inningsPitched",label: "IP",   desc: "Innings Pitched" },
  { key: "wins",          label: "W",    desc: "Wins" },
  { key: "strikeOuts",    label: "K",    desc: "Strikeouts" },
  { key: "saves",         label: "SV",   desc: "Saves" },
]

function getStatColor(label: string, value: string) {
  const num = parseFloat(value)
  if (isNaN(num)) return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }

  const cfg: Record<string, { hi: number; lo: number; lowerBetter?: boolean }> = {
    AVG:  { hi: 0.30, lo: 0.24 },
    OBP:  { hi: 0.37, lo: 0.30 },
    OPS:  { hi: 0.85, lo: 0.65 },
    ERA:  { hi: 3.0,  lo: 4.5,  lowerBetter: true },
    WHIP: { hi: 1.10, lo: 1.35, lowerBetter: true },
  }

  const c = cfg[label]
  if (!c) return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }

  const good = c.lowerBetter ? num <= c.hi : num >= c.hi
  const bad  = c.lowerBetter ? num >= c.lo : num <= c.lo

  if (good) return { bg: "bg-emerald-50", lbl: "text-emerald-700", val: "text-emerald-900" }
  if (bad)  return { bg: "bg-rose-50",    lbl: "text-rose-600",    val: "text-rose-900"   }
  return { bg: "bg-[#f7f8f3]", lbl: "text-gray-400", val: "text-green-950" }
}

function PlayersTab() {
  const [teams, setTeams] = useState<MLBTeam[]>([])
  const [teamsError, setTeamsError] = useState("")
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null)
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [rosterLoading, setRosterLoading] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<RosterPlayer | null>(null)
  const [statsMode, setStatsMode] = useState<"hitting" | "pitching">("hitting")
  const [stats, setStats] = useState<Record<string, unknown> | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  useEffect(() => {
    getAllTeams()
      .then(setTeams)
      .catch(() => setTeamsError("Failed to load teams."))
  }, [])

  const handleSelectTeam = async (teamId: number) => {
    setSelectedTeamId(teamId)
    setSelectedPlayer(null)
    setStats(null)
    setRosterLoading(true)
    try {
      const data = await getRoster(teamId)
      setRoster(
        data.sort((a, b) => a.person.fullName.localeCompare(b.person.fullName))
      )
    } finally {
      setRosterLoading(false)
    }
  }

  const handleSelectPlayer = async (player: RosterPlayer, mode: "hitting" | "pitching") => {
    setSelectedPlayer(player)
    setStatsLoading(true)
    setStats(null)
    try {
      setStats(await getPlayerStats(player.person.id, mode))
    } finally {
      setStatsLoading(false)
    }
  }

  const handleModeChange = (mode: "hitting" | "pitching") => {
    setStatsMode(mode)
    if (selectedPlayer) handleSelectPlayer(selectedPlayer, mode)
  }

  const cards = statsMode === "hitting" ? HITTING_CARDS : PITCHING_CARDS
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      {/* Sidebar: team select + roster */}
      <div className="w-full space-y-3 lg:w-64 lg:shrink-0">
        {teamsError ? (
          <p className="text-sm text-red-500">{teamsError}</p>
        ) : (
          <div className="rounded-2xl bg-white p-4 shadow-sm">
            <p className="mb-2 text-xs font-bold uppercase tracking-widest text-green-700">Team</p>
            <select
              value={selectedTeamId ?? ""}
              onChange={(e) => handleSelectTeam(Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 bg-[#f7f8f3] px-3 py-2 text-sm text-gray-700"
            >
              <option value="">Select a team...</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>

            {rosterLoading && (
              <p className="mt-3 text-xs text-gray-400">Loading roster...</p>
            )}

            {!rosterLoading && roster.length > 0 && (
              <div className="mt-3 max-h-[60vh] space-y-0.5 overflow-y-auto">
                <p className="mb-1.5 text-xs font-bold uppercase tracking-widest text-gray-400">
                  Active Roster
                </p>
                {roster.map((player) => (
                  <button
                    key={player.person.id}
                    type="button"
                    onClick={() => handleSelectPlayer(player, statsMode)}
                    className={`w-full rounded-lg px-3 py-1.5 text-left text-sm transition ${
                      selectedPlayer?.person.id === player.person.id
                        ? "bg-green-900 font-semibold text-white"
                        : "text-gray-700 hover:bg-[#f7f8f3]"
                    }`}
                  >
                    {player.jerseyNumber && (
                      <span
                        className={`mr-1.5 text-xs ${
                          selectedPlayer?.person.id === player.person.id
                            ? "text-green-300"
                            : "text-gray-400"
                        }`}
                      >
                        #{player.jerseyNumber}
                      </span>
                    )}
                    {player.person.fullName}
                    <span
                      className={`ml-1 text-xs ${
                        selectedPlayer?.person.id === player.person.id
                          ? "text-green-300"
                          : "text-gray-400"
                      }`}
                    >
                      {player.position.abbreviation}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main: player stats */}
      <div className="min-w-0 flex-1">
        {!selectedPlayer ? (
          <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
            {selectedTeam ? "Select a player to view their stats." : "Select a team and a player."}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-green-700">
                    {selectedTeam?.name} · {SEASON}
                  </p>
                  <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">
                    {selectedPlayer.jerseyNumber && (
                      <span className="mr-1 text-gray-400">#{selectedPlayer.jerseyNumber}</span>
                    )}
                    {selectedPlayer.person.fullName}
                  </h1>
                  <p className="mt-0.5 text-sm text-gray-400">
                    {selectedPlayer.position.abbreviation}
                  </p>
                </div>
                <div className="inline-flex shrink-0 rounded-xl border border-gray-200 bg-[#f7f8f3] p-1">
                  {(["hitting", "pitching"] as const).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => handleModeChange(m)}
                      className={`rounded-lg px-4 py-2 text-sm font-semibold capitalize transition ${
                        statsMode === m
                          ? "bg-green-900 text-white shadow-sm"
                          : "text-gray-600 hover:text-green-900"
                      }`}
                    >
                      {m === "hitting" ? "Batting" : "Pitching"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {statsLoading ? (
              <div className="p-4 text-sm text-gray-400">Loading stats...</div>
            ) : !stats ? (
              <div className="rounded-2xl bg-white p-6 shadow-sm text-sm text-gray-400">
                No {statsMode} stats available for this season.
              </div>
            ) : (
              <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cards.map(({ key, label, desc }) => {
                  const raw = stats[key]
                  const value = raw !== undefined && raw !== null ? String(raw) : "—"
                  const color = getStatColor(label, value)
                  return (
                    <div key={label} className={`rounded-2xl p-4 shadow-sm ${color.bg}`}>
                      <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>
                        {label}
                      </p>
                      <p className="mt-0.5 text-xs text-gray-400">{desc}</p>
                      <p className={`mt-3 text-3xl font-extrabold tracking-tight ${color.val}`}>
                        {value}
                      </p>
                    </div>
                  )
                })}
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────

type MLBView = "today" | "standings" | "players"

export default function MLBPage() {
  const [activeView, setActiveView] = useState<MLBView>("today")

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <Header teamName="MLB" teams={[]} onChangeTeam={() => {}} />

      <TopTabs
        activeView={activeView}
        onChangeView={(v) => setActiveView(v as MLBView)}
        tabs={[
          { label: "Players",       view: "players" },
          { label: "Today's Games", view: "today" },
          { label: "Standings",     view: "standings" },
          { label: "← Stats",       href: "/stats" },
        ]}
      />

      <div className="mx-auto w-full max-w-screen-2xl flex-1 p-3 lg:p-4">
        {activeView === "today"     && <TodayTab />}
        {activeView === "standings" && <StandingsTab />}
        {activeView === "players"   && <PlayersTab />}
      </div>
    </div>
  )
}
