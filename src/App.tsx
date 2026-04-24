import { useState } from "react"
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom"

import AdminPage from "./pages/AdminPage"
import StatsPage from "./pages/StatsPage"
import LoginPage from "./pages/LoginPage"
import type { Player, Team } from "./types"

function AdminGuard({ children }: { children: React.ReactNode }) {
  // Check temporary local admin login status
  const isLoggedIn = localStorage.getItem("jojiStatsAdminLoggedIn") === "true"

  if (!isLoggedIn) {
    return <Navigate to="/login" replace />
  }

  return children
}

export default function App() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTeamId, setActiveTeamId] = useState("")
  const [activePlayerId, setActivePlayerId] = useState("")

  return (
    <BrowserRouter>
      <Routes>
        {/* Redirect root URL to public stats page */}
        <Route path="/" element={<Navigate to="/stats" replace />} />

        {/* Public read-only page */}
        <Route path="/stats" element={<StatsPage />} />

        {/* Admin editable page protected by local login */}
        <Route
          path="/admin"
          element={
            <AdminGuard>
              <AdminPage
                teams={teams}
                setTeams={setTeams}
                players={players}
                setPlayers={setPlayers}
                activeTeamId={activeTeamId}
                setActiveTeamId={setActiveTeamId}
                activePlayerId={activePlayerId}
                setActivePlayerId={setActivePlayerId}
              />
            </AdminGuard>
          }
        />

        {/* Login page for admin users */}
        <Route path="/login" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  )
}