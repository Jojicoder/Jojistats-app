import type {Stat} from "../types"

type StatCardProps ={
    stat:Stat
}

export default function StatCard({stat}: StatCardProps){
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-xl font-bold">{stat.value}</p>
        </div>
    )
}