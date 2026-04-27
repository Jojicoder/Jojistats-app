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
    <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 shadow-sm sm:px-5 sm:py-3">
      <div className="flex items-center justify-between gap-3">

        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/logo.png"
            alt="JojiStats logo"
            className="h-10 w-10 shrink-0 rounded-full object-cover sm:h-14 sm:w-14"
          />

          <div className="min-w-0">
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
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
        <div className="flex shrink-0 items-center gap-2">
  {isLoggedIn ? (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
    >
      Logout
    </button>
  ) : (
    <>
      <Link
        to="/login"
        className="rounded-lg bg-green-900 px-3 py-2 text-center text-sm font-semibold text-white hover:bg-green-800"
      >
        Login
      </Link>

      <Link
        to="/signup"
        className="rounded-lg border border-green-900 px-3 py-2 text-center text-sm font-semibold text-green-900 hover:bg-green-50"
      >
        Sign Up
      </Link>
    </>
  )}
</div>
      </div>
    </header>
  )
}
