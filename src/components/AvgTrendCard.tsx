import type { TrendPoint } from "../types"

type AvgTrendCardProps = {
  avgTrend: TrendPoint[]
}

export default function AvgTrendCard({ avgTrend }: AvgTrendCardProps) {
  return (
    <section className="bg-white rounded-xl p-6 shadow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">AVG Trend</h2>
        <span className="text-sm text-gray-500">Recent Games</span>
      </div>

      {avgTrend.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-200 px-4 py-6 text-sm text-gray-500 text-center">
          Save game records to see your AVG trend.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {avgTrend.map((point) => (
            <div
              key={point.game}
              className="bg-gray-50 rounded-lg p-4 text-center"
            >
              <p className="text-xs text-gray-500">{point.game}</p>
              <p className="text-lg font-bold mt-2">{point.value}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}