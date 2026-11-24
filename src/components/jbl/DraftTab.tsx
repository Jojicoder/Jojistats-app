import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { getJblDraft, jblTeamSlug } from "../../api/jbl"
import { teamBadge, teamColors } from "./teamTheme"

type Pick = { round: number; pickInRound: number; overall: number; team: string; prospectId: number }
type Prospect = {
  id: number
  name: string
  age: number
  position: string
  role: string
  potential: number
  readiness: number
  overall: number
  throws?: string
  bats?: string
  drafted: { team: string; round: number; overall: number } | null
}
type Change = {
  team: string
  type: "promoted" | "released" | "minors"
  player: string
  prospectId: number | null
  slot: string | null
  replaced: string | null
  overall: number
}
type Retirement = {
  team: string
  player: string
  pitcher: boolean
  age: number
  overall: number
  slot: string
  replacement: string
}
type DraftData = {
  season: number
  seed: number
  rounds: number
  picks: Pick[]
  prospects: Map<number, Prospect>
  changes: Change[]
  retirements: Retirement[]
}

const ROLE_LABEL: Record<string, string> = {
  PowerHitter: "Power hitter",
  ContactHitter: "Contact hitter",
}
const roleLabel = (role: string) => ROLE_LABEL[role] ?? role.replace(/([a-z])([A-Z])/g, "$1 $2")

function Overall({ value }: { value: number }) {
  const color = value >= 66 ? "text-green-700" : value >= 58 ? "text-gray-800" : "text-gray-400"
  return <span className={`font-black tabular-nums ${color}`}>{value}</span>
}

function PickRow({ pick, prospect, promoted }: { pick: Pick; prospect?: Prospect; promoted: boolean }) {
  return (
    <tr className="border-t border-gray-100">
      <td className="px-3 py-2 text-xs font-bold tabular-nums text-gray-400">{pick.overall}</td>
      <td className="px-3 py-2">
        <Link to={`/jbl/teams/${jblTeamSlug(pick.team)}`} className="flex items-center gap-2 text-sm font-semibold text-gray-800 hover:underline">
          {teamBadge(pick.team, "md")}
          <span className="hidden sm:inline">{pick.team}</span>
        </Link>
      </td>
      <td className="px-3 py-2 text-sm font-bold text-gray-900">
        {prospect?.name ?? `#${pick.prospectId}`}
        {promoted && (
          <span className="ml-2 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-green-800">
            Makes roster
          </span>
        )}
      </td>
      <td className="px-3 py-2 text-xs text-gray-500">{prospect?.position}</td>
      <td className="hidden px-3 py-2 text-xs text-gray-500 sm:table-cell">{prospect && roleLabel(prospect.role)}</td>
      <td className="hidden px-3 py-2 text-xs tabular-nums text-gray-500 sm:table-cell">{prospect?.age}</td>
      <td className="px-3 py-2 text-right text-sm">{prospect && <Overall value={prospect.overall} />}</td>
      <td className="hidden px-3 py-2 text-right text-sm tabular-nums text-gray-500 sm:table-cell">{prospect?.potential}</td>
    </tr>
  )
}

export default function DraftTab({ selectedTeamName }: { selectedTeamName?: string }) {
  const [data, setData] = useState<DraftData | null>(null)
  const [loading, setLoading] = useState(true)
  const [teamFilter, setTeamFilter] = useState(selectedTeamName ?? "")
  const [round, setRound] = useState(0)

  useEffect(() => {
    let cancelled = false
    getJblDraft()
      .then((files) => {
        if (cancelled || !files) return
        const draft = files.draft as { season: number; seed: number; rounds: number; picks: Pick[] }
        const prospects = (files.prospects as { prospects: Prospect[] }).prospects
        const changes = (files.changes as { changes: Change[] }).changes
        setData({
          season: draft.season,
          seed: draft.seed,
          rounds: draft.rounds,
          picks: draft.picks,
          prospects: new Map(prospects.map((p) => [p.id, p])),
          changes,
          retirements: (files.progression as { retirements?: Retirement[] } | null)?.retirements ?? [],
        })
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false))
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setTeamFilter(selectedTeamName ?? "")
  }, [selectedTeamName])

  const promotedIds = useMemo(
    () => new Set((data?.changes ?? []).filter((c) => c.type === "promoted").map((c) => c.prospectId)),
    [data],
  )
  const teams = useMemo(() => [...new Set((data?.picks ?? []).map((p) => p.team))].sort(), [data])

  if (loading) return <div className="rounded-2xl bg-white p-8 text-center text-sm text-gray-500 shadow-sm">Loading draft…</div>
  if (!data) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-bold text-gray-700">No draft yet</p>
        <p className="mt-1 text-sm text-gray-500">The draft results appear here once the next season's draft has been run.</p>
      </div>
    )
  }

  const picks = data.picks.filter((p) => (!teamFilter || p.team === teamFilter) && (!round || p.round === round))
  const moves = data.changes.filter((c) => c.type !== "minors" && (!teamFilter || c.team === teamFilter))
  const retirements = data.retirements.filter((r) => !teamFilter || r.team === teamFilter)
  const promoted = data.changes.filter((c) => c.type === "promoted").length

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h2 className="text-lg font-black text-gray-900">{data.season} JBL Draft</h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {[
            ["Rounds", data.rounds],
            ["Picks", data.picks.length],
            ["Make a roster", promoted],
            ["Retirements", data.retirements.length],
            ["Prospects", data.prospects.size],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl bg-gray-50 p-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</p>
              <p className="text-xl font-black text-gray-900">{value}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Rookies take a bench or bullpen spot only if they clearly beat the current player; the rest start in the minors.
          OVR is the current rating, POT the ceiling.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={teamFilter}
          onChange={(e) => setTeamFilter(e.target.value)}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
          aria-label="Filter by team"
        >
          <option value="">All teams</option>
          {teams.map((team) => (
            <option key={team} value={team}>{team}</option>
          ))}
        </select>
        <select
          value={round}
          onChange={(e) => setRound(Number(e.target.value))}
          className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
          aria-label="Filter by round"
        >
          <option value={0}>All rounds</option>
          {Array.from({ length: data.rounds }, (_, i) => i + 1).map((r) => (
            <option key={r} value={r}>Round {r}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              <th className="px-3 py-2">#</th>
              <th className="px-3 py-2">Team</th>
              <th className="px-3 py-2">Player</th>
              <th className="px-3 py-2">Pos</th>
              <th className="hidden px-3 py-2 sm:table-cell">Type</th>
              <th className="hidden px-3 py-2 sm:table-cell">Age</th>
              <th className="px-3 py-2 text-right">OVR</th>
              <th className="hidden px-3 py-2 text-right sm:table-cell">POT</th>
            </tr>
          </thead>
          <tbody>
            {picks.map((pick) => (
              <PickRow
                key={pick.overall}
                pick={pick}
                prospect={data.prospects.get(pick.prospectId)}
                promoted={promotedIds.has(pick.prospectId)}
              />
            ))}
          </tbody>
        </table>
        {picks.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No picks match.</p>}
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
        <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Roster moves</h3>
        {moves.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500">No roster moves.</p>
        ) : (
          <ul className="mt-3 divide-y divide-gray-100">
            {moves.map((move, index) => (
              <li key={index} className="flex items-center gap-3 py-2 text-sm">
                <span style={{ color: teamColors(move.team).primary }}>{teamBadge(move.team, "md")}</span>
                <span
                  className={`w-20 shrink-0 rounded px-2 py-0.5 text-center text-[10px] font-black uppercase tracking-wider ${
                    move.type === "promoted" ? "bg-green-100 text-green-800" : "bg-red-50 text-red-700"
                  }`}
                >
                  {move.type === "promoted" ? "Promoted" : "Released"}
                </span>
                <span className="min-w-0 flex-1 text-gray-800">
                  <span className="font-bold">{move.player}</span>
                  <span className="text-gray-400"> · {move.slot}</span>
                  {move.replaced && <span className="text-gray-500"> (replaces {move.replaced})</span>}
                </span>
                <Overall value={move.overall} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {data.retirements.length > 0 && (
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-black/5">
          <h3 className="text-sm font-black uppercase tracking-widest text-gray-500">Retirements</h3>
          <p className="mt-1 text-xs text-gray-500">
            Veterans retire from age 34 on. The best backup takes over the job and a drafted prospect fills the open spot.
          </p>
          {retirements.length === 0 ? (
            <p className="mt-3 text-sm text-gray-500">No retirements for this team.</p>
          ) : (
            <ul className="mt-3 divide-y divide-gray-100">
              {retirements.map((r, index) => (
                <li key={index} className="flex items-center gap-3 py-2 text-sm">
                  <span style={{ color: teamColors(r.team).primary }}>{teamBadge(r.team, "md")}</span>
                  <span className="w-20 shrink-0 rounded bg-gray-100 px-2 py-0.5 text-center text-[10px] font-black uppercase tracking-wider text-gray-600">
                    Retired
                  </span>
                  <span className="min-w-0 flex-1 text-gray-800">
                    <span className="font-bold">{r.player}</span>
                    <span className="text-gray-400"> · age {r.age} · {r.slot}</span>
                    <span className="text-gray-500"> (replaced by {r.replacement})</span>
                  </span>
                  <Overall value={r.overall} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
