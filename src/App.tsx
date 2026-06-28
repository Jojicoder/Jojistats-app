import { lazy, Suspense, useEffect, useState } from "react"
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
  useLocation,
} from "react-router-dom"

import { supabase } from "./api/supabase-client"
import SiteFooter from "./components/SiteFooter"

const AdminPage = lazy(() => import("./pages/AdminPage"))
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"))
const LandingPage = lazy(() => import("./pages/LandingPage"))
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"))
const StatsPage = lazy(() => import("./pages/StatsPage"))
const GameRecordPage = lazy(() => import("./pages/GameRecordPage"))
const LoginPage = lazy(() => import("./pages/LoginPage"))
const SignupPage = lazy(() => import("./pages/SignupPage"))
const AwaitingAccessPage = lazy(() => import("./pages/AwaitingAccessPage"))
const ProfilePage = lazy(() => import("./pages/ProfilePage"))
const ContactPage = lazy(() => import("./pages/ContactPage"))
const TeamManagerPage = lazy(() => import("./pages/TeamManagerPage"))
const PlayerPage = lazy(() => import("./pages/PlayerPage"))
const SeasonArchivePage = lazy(() => import("./pages/SeasonArchivePage"))
const MLBPage = lazy(() => import("./pages/MLBPage"))
const MLBTeamPage = lazy(() => import("./pages/MLBTeamPage"))
const MLBGamePage = lazy(() => import("./pages/MLBGamePage"))
const SimPage = lazy(() => import("./pages/SimPage"))
const SeasonPage = lazy(() => import("./pages/SeasonPage"))

function PageFallback() {
  return <div className="p-6 text-gray-600">Loading...</div>
}

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
  return (
    <BrowserRouter>
      <div className="flex min-h-dvh flex-col">
        <div className="site-page-content flex flex-1 flex-col">
          <Suspense fallback={<PageFallback />}>
            <Routes>
              <Route path="/" element={<LandingPage />} />

              <Route path="/stats" element={<StatsPage />} />
              <Route path="/states" element={<Navigate to="/stats" replace />} />

              <Route path="/record-game" element={<GameRecordPage />} />

              <Route path="/manager" element={<TeamManagerPage />} />
              <Route path="/player" element={<PlayerPage />} />
              <Route path="/seasons" element={<SeasonArchivePage />} />
              <Route path="/sim" element={<SimPage />} />
              <Route path="/jbl" element={<SimPage />} />
              <Route path="/season" element={<SeasonPage />} />
              <Route path="/mlb" element={<MLBPage />} />
              <Route path="/mlb/teams/:teamId" element={<MLBTeamPage />} />
              <Route path="/mlb/games/:gamePk" element={<MLBGamePage />} />

              <Route
                path="/admin"
                element={
                  <AdminGuard>
                    <AdminPage />
                  </AdminGuard>
                }
              />

              <Route path="/login" element={<LoginPage />} />
              <Route path="/signup" element={<SignupPage />} />
              <Route path="/awaiting-access" element={<AwaitingAccessPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />

              <Route path="*" element={<Navigate to="/stats" replace />} />
            </Routes>
          </Suspense>
        </div>
        <SiteFooter />
      </div>
    </BrowserRouter>
  )
}
