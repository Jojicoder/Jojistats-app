import type { SavedBattingGameEntry } from "../types"


type LastFiveFormCardProps = {
  savedEntries: SavedBattingGameEntry[]
}

type LastFiveStats = {
  avg: string
  obp: string
  hr: number
  rbi: number
  games: number
  formLabel: "Hot" | "Steady" | "Cold"
  formClassName: string
}

function calculateLastFiveStats(
  savedEntries: SavedBattingGameEntry[]
): LastFiveStats {
  const lastFive = savedEntries.slice(-5)

  const totals = lastFive.reduce(
    (acc, entry) => {
      acc.ab += entry.statLine.AB
      acc.h += entry.statLine.H
      acc.bb += entry.statLine.BB
      acc.hr += entry.statLine.HR
      acc.rbi += entry.statLine.RBI
      return acc
    },
    {
      ab: 0,
      h: 0,
      bb: 0,
      hr: 0,
      rbi: 0,
    }
  )

  const avg =
    totals.ab > 0
      ? (totals.h / totals.ab).toFixed(3).replace("0.", ".")
      : ".000"

  const obpDenominator = totals.ab + totals.bb
  const obp =
    obpDenominator > 0
      ? ((totals.h + totals.bb) / obpDenominator)
          .toFixed(3)
          .replace("0.", ".")
      : ".000"

  const numericObp =
    obpDenominator > 0 ? (totals.h + totals.bb) / obpDenominator : 0

  let formLabel: LastFiveStats["formLabel"] = "Cold"
  let formClassName =
    "bg-red-50 text-red-700 border border-red-200"

  if (numericObp >= 0.45) {
    formLabel = "Hot"
    formClassName = "bg-green-50 text-green-700 border border-green-200"
  } else if (numericObp >= 0.32) {
    formLabel = "Steady"
    formClassName = "bg-gray-50 text-gray-700 border border-gray-200"
  }

  return {
    avg,
    obp,
    hr: totals.hr,
    rbi: totals.rbi,
    games: lastFive.length,
    formLabel,
    formClassName,
  }
}

export default function LastFiveFormCard({
  savedEntries,
}: LastFiveFormCardProps) {
  if (savedEntries.length === 0) {
    return (
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-green-900">Last 5 Form</p>
            <h2 className="mt-2 text-lg font-semibold text-gray-900">
              Recent performance
            </h2>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-6 text-center text-sm text-gray-500">
          Save game records to see recent form.
        </div>
      </section>
    )
  }

  const stats = calculateLastFiveStats(savedEntries)

  return (
    <section className="rounded-2xl bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-green-900">Last 5 Form</p>
          <h2 className="mt-2 text-lg font-semibold text-gray-900">
            Recent performance
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Based on the most recent {stats.games} game
            {stats.games === 1 ? "" : "s"}.
          </p>
        </div>

        <div
          className={`rounded-full px-3 py-1 text-sm font-medium ${stats.formClassName}`}
        >
          {stats.formLabel}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">AVG</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.avg}</p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">OBP</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.obp}</p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">HR</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.hr}</p>
        </div>

        <div className="rounded-xl bg-gray-50 p-4">
          <p className="text-xs font-medium text-gray-500">RBI</p>
          <p className="mt-2 text-2xl font-bold text-gray-900">{stats.rbi}</p>
        </div>
      </div>
    </section>
  )
}