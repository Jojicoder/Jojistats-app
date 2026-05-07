import { useEffect, useState } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import AdminPage from "./pages/AdminPage"
import StatsPage from "./pages/StatsPage"
import GameRecordPage from "./pages/GameRecordPage"
import LoginPage from "./pages/LoginPage"
import SignupPage from "./pages/SignupPage"
import ProfilePage from "./pages/ProfilePage"
import TeamManagerPage from "./pages/TeamManagerPage"
import PlayerPage from "./pages/PlayerPage"
import SeasonArchivePage from "./pages/SeasonArchivePage"
import { supabase } from "./api/supabase-client"

import type { Player, Team } from "./types"

function AdminGuard({ children }: { children: React.ReactNode }) {
  const location = useLocation()
  const [isLoading, setIsLoading] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()

      setIsLoggedIn(!!data.user)
      setIsAdmin(data.user?.email === "admin@jojistats.com")
      setIsLoading(false)
    }

    checkUser()
  }, [])

  if (isLoading) {
    return <div className="p-6 text-gray-600">Checking auth...</div>
  }

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  if (!isAdmin) {
    return <Navigate to="/stats" replace />
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
        <Route path="/" element={<Navigate to="/stats" replace />} />

        <Route path="/stats" element={<StatsPage />} />
        <Route path="/states" element={<Navigate to="/stats" replace />} />

        <Route path="/record-game" element={<GameRecordPage />} />

        <Route path="/manager" element={<TeamManagerPage />} />
        <Route path="/player" element={<PlayerPage />} />
        <Route path="/seasons" element={<SeasonArchivePage />} />

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

        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route path="/profile" element={<ProfilePage />} />

        <Route path="*" element={<Navigate to="/stats" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
