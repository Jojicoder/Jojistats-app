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
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  const isLoggedIn = isLoggedInProp ?? authIsLoggedIn

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    if (isLoggedInProp !== undefined) {
      setAvatarUrl(null)
      return
    }

    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        setAuthIsLoggedIn(true)

        // 🔥 avatar取得
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .single()

        setAvatarUrl(profile?.avatar_url ?? null)
      } else {
        setAuthIsLoggedIn(false)
        setAvatarUrl(null)
      }
    }

    loadUser()

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthIsLoggedIn(!!session)

        if (session?.user) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", session.user.id)
            .single()

          setAvatarUrl(profile?.avatar_url ?? null)
        } else {
          setAvatarUrl(null)
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [isLoggedInProp])

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  /* ---------------- UI ---------------- */

  return (
    <header className="shrink-0 border-b border-gray-200 bg-white px-3 py-2 shadow-sm sm:px-5 sm:py-3">
      <div className="flex flex-wrap items-center justify-between gap-2 sm:flex-nowrap sm:gap-3">

        {/* LEFT */}
        <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
          <Link to="/stats" className="shrink-0">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-9 w-9 rounded-full object-cover sm:h-14 sm:w-14"
            />
          </Link>

          <div className="min-w-0">
            <Link
              to="/stats"
              className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl"
            >
              Joji Stats
            </Link>

            <select
              value={teams.includes(teamName) ? teamName : ""}
              onChange={(event) => onChangeTeam(event.target.value)}
              className="mt-1 w-32 rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 sm:w-36"
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
        <div className="flex w-full shrink-0 items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">

          {isLoggedIn ? (
            <>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 sm:py-2"
              >
                Logout
              </button>

              {/* 🔥 AVATAR */}
              <img
                src={avatarUrl || "/default-avatar.png"}
                alt="avatar"
                className="h-9 w-9 cursor-pointer rounded-full border border-gray-200 object-cover sm:h-10 sm:w-10"
                onClick={() => navigate("/profile")}
              />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg bg-green-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-green-800 sm:py-2"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="rounded-lg border border-green-900 px-3 py-1.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
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
