import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../api/supabase-client"

type HeaderProps = {
  teamName: string
  teams: string[]
  onChangeTeam: (teamName: string) => void
  isLoggedIn?: boolean
}

export default function Header({
  teamName,
  teams,
  onChangeTeam,
  isLoggedIn: isLoggedInProp,
}: HeaderProps) {
  const navigate = useNavigate()

  const [authIsLoggedIn, setAuthIsLoggedIn] = useState(false)
  const isLoggedIn = isLoggedInProp ?? authIsLoggedIn

  /* -------------------- AUTH STATE -------------------- */

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      setAuthIsLoggedIn(!!data.user)
    }

    checkUser()

    // 🔥 リアルタイムでログイン状態更新
    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setAuthIsLoggedIn(!!session)
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  /* -------------------- LOGOUT -------------------- */

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  /* -------------------- UI -------------------- */

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-3 shadow-sm sm:px-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        
        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-3">
          <img
            src="/logo.png"
            alt="JojiStats logo"
            className="h-14 w-14 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
          />

          <div className="min-w-0">
            <p className="text-4xl font-extrabold uppercase tracking-tight text-green-900">
              Joji Stats
            </p>

            <select
              value={teams.includes(teamName) ? teamName : ""}
              onChange={(event) => onChangeTeam(event.target.value)}
              className="mt-1 w-36 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
              disabled={teams.length === 0}
            >
              {teams.length === 0 ? (
                <option value="">No teams</option>
              ) : (
                teams.map((team) => (
                  <option key={team} value={team}>
                    {team}
                  </option>
                ))
              )}
            </select>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Logout
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="rounded-lg bg-green-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-800"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
