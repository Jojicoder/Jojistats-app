import type {TrendPoint} from "../types"

type AvgTrendCardProps={
    avgTrend: TrendPoint[]
}

export default function AvgTrendCard({ avgTrend }: AvgTrendCardProps){
    return (
        <section className="bg-white rounded-xl p-6 shadow-sm mt-6">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">AVG Trend</h2>
                <span className="text-sm text-gray-500">Last 4 Games</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
                {avgTrend.map((point)=>(
                    <div 
                        key={point.game}
                        className="bg-gray-50 rounded-lg p-4 text-center">
                        <p className="text-xs text-gray-500">{point.game}</p>
                        <p className="text-lg font-bold mt-2">{point.avg}</p>
                    </div>
                ))}
            </div>
        </section>
    )
}
