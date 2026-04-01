import { useState } from "react"

type EntryData={
  AB: number
  H : number
  HR: number
  RBI: number
  BB:number
  SO: number
}

const initialEntry: EntryData ={
  AB: 4,
  H: 2,
  HR: 1,
  RBI: 3,
  BB: 0,
  SO:1,
}


export default function ScoreEntryPanel() {
  const [entry,setEntry]=useState<EntryData>(initialEntry)
  const handleIncrement= (field: keyof EntryData) =>{
    setEntry((prev) => ({
      ...prev,
      [field]: prev[field] +1,
    }))
  }
  const handleDecrement = (field : keyof EntryData) =>{
    setEntry((prev) => ({
      ...prev,
      [field]: Math.max(0,prev[field]-1),
    }))
  }

  const scoreFields: {label: keyof EntryData}[]=[
    {label: "AB"},
    {label: "H"},
    {label: "HR"},
    {label: "RBI"},
    {label: "BB"},
    {label: "SO"},
  ]

  return (
    <section className="bg-white round-xl p-6 shodow-sm mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Enter Your Score</h2>
        <span className="text-sm text-gray-500">Manual Entry</span>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {scoreFields.map((filed)=>(
          <div
            key={filed.label}
            className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-3">
              <span className="text-sm font-medium text-gray-600">
                {filed.label}
              </span>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => handleDecrement(filed.label)}
                className="w-8 h-8 rounded-full bg-white shadow-sm text-gray-700">
                  -
                </button>

                <span className="w-6 text-center font-semibold">
                  {entry[filed.label]}
                </span>

                <button
                  onClick={() => handleIncrement(filed.label)}
                  className="w-8 h-8 rounded-full bg-green-900 text-white shadow-sm">
                    +
                  </button>
              </div>
            </div>
        ))}
      </div>
      <button className="mt-6 w-full bg-green-900 text-white py-3 rounded-xl font-medium">
      Save Game
      </button>
    </section>
  )
}