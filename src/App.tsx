import Layout from "./components/Layout"
import { useState } from "react"
import type { Player } from "./types"

const players: Player[] = [
  {
    name: "Joji",
    position: "2B",
    stats: [
      { label: "AVG", value: ".320" },
      { label: "OPS", value: ".890" },
      { label: "HR", value: "12" },
      { label: "RBI", value: "45" },
    ],
    avgTrend: [
      { game: "G1", avg: ".250" },
      { game: "G2", avg: ".286" },
      { game: "G3", avg: ".300" },
      { game: "G4", avg: ".320" },
    ],
  },
  {
    name: "Kenny",
    position: "SS",
    stats: [
      { label: "AVG", value: ".287" },
      { label: "OPS", value: ".812" },
      { label: "HR", value: "8" },
      { label: "RBI", value: "31" },
    ],
    avgTrend: [
      { game: "G1", avg: ".220" },
      { game: "G2", avg: ".250" },
      { game: "G3", avg: ".270" },
      { game: "G4", avg: ".287" },
    ],
  },
]

export default function App() {
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <Layout
      players={players}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
    />
  )
}
