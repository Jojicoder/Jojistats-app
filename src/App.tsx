import { useEffect, useState } from "react"
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom"

import AdminPage from "./pages/AdminPage"
import StatsPage from "./pages/StatsPage"
import LoginPage from "./pages/LoginPage"
import { supabase } from "./api/supabase-client"
import SignupPage from "./pages/SignupPage"

import type { Player, Team } from "./types"

/* -------------------- Admin Guard (Supabase版) -------------------- */

function AdminGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (data.user && data.user.email === "admin@jojistats.com") {
        setIsAuthenticated(true)
      } else {
        setIsAuthenticated(false)
      }

      setIsLoading(false)
    }

    checkUser()
  }, [])

  if (isLoading) {
    return <div className="p-6 text-gray-600">Checking auth...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return children
}

/* -------------------- App -------------------- */

export default function App() {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [activeTeamId, setActiveTeamId] = useState("")
  const [activePlayerId, setActivePlayerId] = useState("")

  return (
    <BrowserRouter>
      <Routes>
        {/* Root redirect */}
        <Route path="/" element={<Navigate to="/stats" replace />} />

        {/* Public page */}
        <Route path="/stats" element={<StatsPage />} />

        {/* Admin (protected) */}
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

        {/* Login */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
      </Routes>
    </BrowserRouter>
  )
}
