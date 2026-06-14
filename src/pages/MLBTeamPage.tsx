import { useEffect, useMemo, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import Header from "../components/Header"
import TopTabs from "../components/TopTabs"
import {
  getAllTeams,
  getRoster,
  getTeam,
  getTeamSchedule,
  getTeamStats,
  MLB_SEASON,
} from "../components/mlb/api"
import type {
  MLBGame,
  MLBTeam,
  MLBTeamStats,
  RosterPlayer,
} from "../components/mlb/types"
import { getStatColor } from "../components/mlb/playerStats"
import { getTeamThemeStyle } from "../components/mlb/teamTheme"

const POSITION_ORDER: Record<string, number> = {
  SP: 0, RP: 1, CL: 2, P: 3,
  C: 4, "1B": 5, "2B": 6, "3B": 7, SS: 8,
  LF: 9, CF: 10, RF: 11, OF: 12, DH: 13,
}

export default function MLBTeamPage() {
  const { teamId: teamIdParam } = useParams()
  const navigate = useNavigate()
  const teamId = Number(teamIdParam)

  const [team, setTeam] = useState<MLBTeam | null>(null)
  const [teams, setTeams] = useState<MLBTeam[]>([])
  const [roster, setRoster] = useState<RosterPlayer[]>([])
  const [stats, setStats] = useState<MLBTeamStats | null>(null)
  const [schedule, setSchedule] = useState<MLBGame[]>([])
  const [requestError, setRequestError] = useState<{ teamId: number; message: string } | null>(null)
  const isValidTeamId = Number.isInteger(teamId) && teamId > 0

  useEffect(() => {
    if (!isValidTeamId) return

    let cancelled = false

    Promise.all([
      getTeam(teamId),
      getAllTeams(),
      getRoster(teamId),
      getTeamStats(teamId),
      getTeamSchedule(teamId),
    ])
      .then(([teamData, allTeams, rosterData, statsData, scheduleData]) => {
        if (cancelled) return
        setTeam(teamData)
        setTeams([...allTeams].sort((a, b) => a.name.localeCompare(b.name)))
        setRoster(rosterData)
        setStats(statsData)
        setSchedule(scheduleData)
        setRequestError(null)
      })
      .catch(() => {
        if (!cancelled) {
          setRequestError({ teamId, message: "Failed to load this MLB team." })
        }
      })

    return () => {
      cancelled = true
    }
  }, [isValidTeamId, teamId])

  const sortedRoster = useMemo(
    () => [...roster].sort((a, b) => {
      const positionDifference =
        (POSITION_ORDER[a.position.abbreviation] ?? 99) -
        (POSITION_ORDER[b.position.abbreviation] ?? 99)
      if (positionDifference !== 0) return positionDifference
      return Number(a.jerseyNumber ?? 999) - Number(b.jerseyNumber ?? 999)
    }),
    [roster]
  )

  const completedGames = useMemo(
    () => schedule
      .filter((game) => game.status.abstractGameState === "Final")
      .sort((a, b) => b.gameDate.localeCompare(a.gameDate)),
    [schedule]
  )

  const wins = Number(stats?.pitching.wins ?? 0)
  const losses = Number(stats?.pitching.losses ?? 0)
  const gamesPlayed = Number(stats?.hitting.gamesPlayed ?? wins + losses)
  const winPercentage = gamesPlayed > 0 ? wins / gamesPlayed : Number.NaN
  const recordColor = getRecordColor(winPercentage)
  const error = !isValidTeamId
    ? "Invalid MLB team."
    : requestError?.teamId === teamId
    ? requestError.message
    : ""
  const loading = isValidTeamId && team?.id !== teamId && !error

  const handleChangeTeam = (name: string) => {
    const selected = teams.find((candidate) => candidate.name === name)
    if (selected) navigate(`/mlb/teams/${selected.id}`)
  }

  return (
    <div
      className="mlb-themed flex min-h-dvh flex-col bg-gray-50"
      style={getTeamThemeStyle(teamId)}
    >
      <Header
        teamName={team?.name ?? ""}
        teams={teams.map((candidate) => candidate.name)}
        onChangeTeam={handleChangeTeam}
        placeholder="Select an MLB team..."
      />

      <TopTabs
        activeView="team"
        onChangeView={() => {}}
        tabs={[
          { label: "Team Overview", view: "team" },
          { label: "Players", href: `/mlb?teamId=${teamId}&view=players` },
          { label: "Today's Games", href: `/mlb?teamId=${teamId}&view=today` },
          { label: "Standings", href: `/mlb?teamId=${teamId}&view=standings` },
          { label: "Back to Your Stats", href: "/stats" },
        ]}
      />

      <main className="mx-auto w-full max-w-screen-2xl flex-1 p-3 lg:p-4">
        {loading && (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
            Loading team...
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl bg-white p-6 text-sm text-red-500 shadow-sm">{error}</div>
        )}

        {!loading && !error && team && stats && (
          <div className="space-y-5">
            <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <img
                    src={`https://www.mlbstatic.com/team-logos/${team.id}.svg`}
                    alt={`${team.name} logo`}
                    className="h-14 w-14 shrink-0 object-contain sm:h-20 sm:w-20"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-green-700 sm:text-xs sm:tracking-widest">
                      {team.division?.name ?? team.league?.name ?? "MLB Team"}
                    </p>
                    <h1 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                      {team.name}
                    </h1>
                    <p className="mt-1 text-sm text-gray-400">
                      {team.venue?.name ?? ""}
                    </p>
                  </div>
                </div>
                <span className="rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold text-green-900">
                  {MLB_SEASON} Season
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
                <SummaryCard
                  label="Record"
                  value={`${wins}-${losses}`}
                  detail={`${gamesPlayed} games`}
                  color={recordColor}
                />
                <SummaryCard
                  label="Win PCT"
                  value={String(stats.pitching.winPercentage ?? "—")}
                  color={recordColor}
                />
                <SummaryCard label="Games" value={String(gamesPlayed)} />
                <SummaryCard label="Players" value={String(roster.length)} />
              </div>
            </section>

            <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1 space-y-5">
                <Card title="Roster">
                  <div className="mt-4 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                    {sortedRoster.map((player) => (
                      <Link
                        key={player.person.id}
                        to={`/mlb?teamId=${team.id}&view=players&playerId=${player.person.id}`}
                        className="flex items-center gap-3 rounded-xl bg-[#f7f8f3] px-3 py-2.5 transition hover:bg-[#eef0e9] hover:shadow-sm"
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-green-200 bg-green-50 text-xs font-bold text-green-900">
                          {player.jerseyNumber ?? "—"}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-gray-800">
                            {player.person.fullName}
                          </p>
                          <p className="text-xs text-gray-400">{player.position.abbreviation}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                </Card>

                <Card title="Team Batting">
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                    <StatTile label="AVG" value={String(stats.hitting.avg ?? "—")} />
                    <StatTile label="OBP" value={String(stats.hitting.obp ?? "—")} />
                    <StatTile label="OPS" value={String(stats.hitting.ops ?? "—")} />
                    <StatTile label="HR" value={String(stats.hitting.homeRuns ?? "—")} />
                    <StatTile label="RBI" value={String(stats.hitting.rbi ?? "—")} />
                  </div>
                </Card>

                <Card title="Team Pitching">
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 sm:gap-3">
                    <StatTile label="ERA" value={String(stats.pitching.era ?? "—")} />
                    <StatTile label="WHIP" value={String(stats.pitching.whip ?? "—")} />
                    <StatTile label="IP" value={String(stats.pitching.inningsPitched ?? "—")} />
                    <StatTile label="SO" value={String(stats.pitching.strikeOuts ?? "—")} />
                    <StatTile label="BB" value={String(stats.pitching.baseOnBalls ?? "—")} />
                  </div>
                </Card>
              </div>

              <aside className="shrink-0 lg:w-72">
                <div className="rounded-2xl bg-white p-5 shadow-sm lg:sticky lg:top-4">
                  <h2 className="text-base font-bold text-gray-900">Recent Results</h2>
                  <p className="mt-0.5 text-xs text-gray-400">
                    Last {Math.min(completedGames.length, 8)} completed games
                  </p>
                  <div className="mt-4 space-y-2">
                    {completedGames.slice(0, 8).map((game) => (
                      <GameResult key={game.gamePk} game={game} teamId={team.id} />
                    ))}
                  </div>
                </div>
              </aside>
            </div>

            <Link
              to="/mlb"
              className="inline-flex rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-green-900 shadow-sm hover:bg-gray-50"
            >
              Back to MLB
            </Link>
          </div>
        )}
      </main>
    </div>
  )
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {children}
    </section>
  )
}

function SummaryCard({
  label,
  value,
  detail,
  color = NEUTRAL_STAT_COLOR,
}: {
  label: string
  value: string
  detail?: string
  color?: StatColor
}) {
  return (
    <div className={`rounded-xl p-3 sm:p-4 ${color.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>
        {label}
      </p>
      <p className={`mt-2 text-xl font-extrabold sm:text-2xl ${color.val}`}>
        {value}
      </p>
      {detail && <p className="mt-0.5 text-xs text-gray-400">{detail}</p>}
    </div>
  )
}

type StatColor = ReturnType<typeof getStatColor>

const NEUTRAL_STAT_COLOR: StatColor = {
  bg: "bg-[#f7f8f3]",
  lbl: "text-gray-400",
  val: "text-gray-900",
}

function getRecordColor(winPercentage: number): StatColor {
  if (!Number.isFinite(winPercentage)) return NEUTRAL_STAT_COLOR
  if (winPercentage >= 0.55) {
    return { bg: "bg-emerald-50", lbl: "text-emerald-700", val: "text-emerald-900" }
  }
  if (winPercentage <= 0.45) {
    return { bg: "bg-rose-50", lbl: "text-rose-600", val: "text-rose-900" }
  }
  return NEUTRAL_STAT_COLOR
}

function StatTile({ label, value }: { label: string; value: string }) {
  const color = getStatColor(label, value)

  return (
    <div className={`rounded-xl p-3 text-center ${color.bg}`}>
      <p className={`text-xs font-bold uppercase tracking-widest ${color.lbl}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-xl font-extrabold ${color.val}`}>
        {value}
      </p>
    </div>
  )
}

function GameResult({ game, teamId }: { game: MLBGame; teamId: number }) {
  const teamSide = game.teams.home.team.id === teamId ? game.teams.home : game.teams.away
  const opponent = game.teams.home.team.id === teamId ? game.teams.away : game.teams.home
  const result = teamSide.score === opponent.score ? "T" : teamSide.isWinner ? "W" : "L"

  return (
    <div className="rounded-xl bg-[#f7f8f3] px-3 py-3">
      <div className="flex items-center gap-3">
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-extrabold ${
          result === "W"
            ? "bg-emerald-100 text-emerald-800"
            : result === "L"
            ? "bg-red-100 text-red-700"
            : "bg-gray-100 text-gray-500"
        }`}>
          {result}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-gray-900">
            vs {opponent.team.name}
          </p>
          <p className="text-xs text-gray-400">
            {new Date(game.gameDate).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </p>
        </div>
        <span className="text-sm font-extrabold tabular-nums text-gray-700">
          {teamSide.score ?? 0}-{opponent.score ?? 0}
        </span>
      </div>
    </div>
  )
}
