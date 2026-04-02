import { useState } from "react"
import Layout from "./components/Layout"
import type { Player } from "./types"

const initialPlayers: Player[] = [
  {
    id: "p1",
    name: "Joji",
    position: "2B",
    jerseyNumber: 7,
    isActive: true,
  },
]

export default function App() {
  const [players, setPlayers] = useState<Player[]>(initialPlayers)
  const [activeIndex, setActiveIndex] = useState(0)

  return (
    <Layout
      players={players}
      setPlayers={setPlayers}
      activeIndex={activeIndex}
      setActiveIndex={setActiveIndex}
    />
  )
}