// src/components/MyPitchingStatsPage.tsx

import type { Player, SavedPitchingGameEntry } from "../types"
import { usePitchingStats } from "../hooks/usePitchingStats"

type Props = {
  activePlayer: Player
  entries: SavedPitchingGameEntry[]
}

/* 説明 */
const statDescriptions: Record<string, string> = {
  IP: "Innings Pitched",
  ERA: "Earned Run Average",
  WHIP: "Walks + Hits per Inning",
  H: "Hits Allowed",
  R: "Runs Allowed",
  ER: "Earned Runs",
  BB: "Walks",
  SO: "Strikeouts",
  HR: "Home Runs Allowed",
}

export default function MyPitchingStatsPage({
  activePlayer,
  entries,
}: Props) {
  const statLines = entries.map((e) => e.statLine)
  const stats = usePitchingStats(statLines)

  /* 🔥 登板数 */
  const gamesPlayed = entries.length

  return (
    <main className="w-full">
      <div className="max-w-6xl space-y-6">

        {/* 🔥 上のカード（MyStatsと同じ構造） */}
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">
            Pitching Stats
          </p>

          <h1 className="mt-3 text-2xl font-bold text-gray-900">
            {activePlayer.name}
          </h1>

          {/* 🔥 KPI上段 */}
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Games Played
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {gamesPlayed}
              </p>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Innings Pitched
              </p>
              <p className="mt-2 text-2xl font-bold text-gray-900">
                {stats.ip}
              </p>
            </div>
          </div>
        </div>

        {/* 🔥 KPIカード */}
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <Stat label="ERA" value={stats.era} />
          <Stat label="WHIP" value={stats.whip} />
          <Stat label="H" value={String(stats.h)} />
          <Stat label="R" value={String(stats.r)} />
          <Stat label="ER" value={String(stats.er)} />
          <Stat label="BB" value={String(stats.bb)} />
          <Stat label="SO" value={String(stats.so)} />
          <Stat label="HR" value={String(stats.hr)} />
        </section>

        {/* 🔥 最近の試合 */}
        <RecentPitchingGames entries={entries} />

      </div>
    </main>
  )
}

/* -------------------- カード -------------------- */

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold text-gray-700">
          {label}
        </p>
        <p className="text-[11px] text-gray-400">
          {statDescriptions[label]}
        </p>
      </div>

      <p className="mt-2 text-2xl font-bold text-gray-900">
        {value}
      </p>
    </div>
  )
}

/* -------------------- 最近の試合 -------------------- */

function RecentPitchingGames({
  entries,
}: {
  entries: SavedPitchingGameEntry[]
}) {
  if (!entries.length) {
    return (
      <div className="rounded-2xl bg-white p-6 shadow-sm">
        <p className="text-gray-500">No pitching records yet.</p>
      </div>
    )
  }

  const sorted = [...entries].reverse().slice(0, 5)

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900">
        Recent Games
      </h2>

      <div className="mt-4 space-y-3">
        {sorted.map((entry) => (
          <div
            key={entry.id}
            className="flex justify-between rounded-lg border border-gray-100 px-4 py-3"
          >
            <div>
              <p className="text-sm font-medium text-gray-900">
                {entry.gameMeta.opponent}
              </p>
              <p className="text-xs text-gray-400">
                {entry.gameMeta.date}
              </p>
            </div>

            <div className="text-sm text-gray-700">
              {entry.statLine.inningsPitchedOuts / 3} IP /{" "}
              {entry.statLine.earnedRuns} ER
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}