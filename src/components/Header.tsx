import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../api/supabase-client"
import { fetchUserAccessByEmail } from "../api/supabase-api"
import type { UserAccess } from "../types"
import { subscribeAvatarUpdated, getUserAvatarCache, withAvatarCacheBust } from "../utils/avatar"

export type HeaderProps = {
  teamName: string
  teams: string[]
  onChangeTeam: (teamName: string) => void
  placeholder?: string
  isLoggedIn?: boolean
  accessRole?: UserAccess["role"] | null
  showAwaitingAccessLink?: boolean
}

function normalizeAccessRole(role: string | null | undefined) {
  if (
    role === "player" ||
    role === "recorder" ||
    role === "manager" ||
    role === "admin"
  ) {
    return role
  }

  return null
}

export default function Header({
  teamName,
  teams,
  onChangeTeam,
  placeholder,
  isLoggedIn: isLoggedInProp,
  accessRole: accessRoleProp,
  showAwaitingAccessLink = false,
}: HeaderProps) {
  const navigate = useNavigate()

  const [authIsLoggedIn, setAuthIsLoggedIn] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [accessRole, setAccessRole] = useState<UserAccess["role"] | null>(null)

  const isLoggedIn = isLoggedInProp ?? authIsLoggedIn
  const displayAccessRole = accessRoleProp !== undefined ? accessRoleProp : accessRole

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    const loadSessionProfile = async () => {
      const { data } = await supabase.auth.getUser()

      if (data.user) {
        setAuthIsLoggedIn(true)
        setUserId(data.user.id)
        const email = data.user.email?.trim().toLowerCase()

        const cachedUrl = getUserAvatarCache(data.user.id)
        if (cachedUrl) setAvatarUrl(cachedUrl)

        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url")
          .eq("id", data.user.id)
          .maybeSingle()

        const finalUrl = profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : cachedUrl || null
        setAvatarUrl(finalUrl)
        if (accessRoleProp !== undefined) {
          setAccessRole(accessRoleProp)
        } else if (email === "admin@jojistats.com") {
          setAccessRole("admin")
        } else if (email) {
          const access = await fetchUserAccessByEmail(email)
          setAccessRole(normalizeAccessRole(access?.role))
        }
      } else {
        setAuthIsLoggedIn(false)
        setUserId(null)
        setAvatarUrl(null)
        setAccessRole(null)
      }
    }

    loadSessionProfile()

    if (isLoggedInProp !== undefined) {
      return
    }

    const { data: listener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setAuthIsLoggedIn(!!session)

        if (session?.user) {
          setUserId(session.user.id)
          const email = session.user.email?.trim().toLowerCase()
          const cachedUrl = getUserAvatarCache(session.user.id)
          if (cachedUrl) setAvatarUrl(cachedUrl)

          const { data: profile } = await supabase
            .from("profiles")
            .select("avatar_url")
            .eq("id", session.user.id)
            .maybeSingle()

          setAvatarUrl(profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : cachedUrl || null)
          if (accessRoleProp !== undefined) {
            setAccessRole(accessRoleProp)
          } else if (email === "admin@jojistats.com") {
            setAccessRole("admin")
          } else if (email) {
            const access = await fetchUserAccessByEmail(email)
            setAccessRole(normalizeAccessRole(access?.role))
          }
        } else {
          setUserId(null)
          setAvatarUrl(null)
          setAccessRole(null)
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [accessRoleProp, isLoggedInProp])

  useEffect(() => subscribeAvatarUpdated(userId, setAvatarUrl), [userId])

  /* ---------------- LOGOUT ---------------- */

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  /* ---------------- UI ---------------- */

  return (
    <header className="shrink-0 overflow-hidden border-b border-gray-200 bg-white px-3 py-2 shadow-sm xl:px-5 xl:py-3">
      <div className="mx-auto max-w-screen-2xl">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-start gap-2 xl:flex xl:items-center xl:justify-between xl:gap-3">

        {/* LEFT */}
        <div className="flex min-w-0 items-center gap-2 xl:flex-1 xl:gap-3">
          <Link to="/stats" className="shrink-0">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-8 w-8 rounded-full object-cover xl:h-14 xl:w-14"
            />
          </Link>

          <div className="min-w-0">
            <Link
              to="/stats"
              className="block truncate text-lg font-extrabold uppercase tracking-tight text-green-900 xl:text-4xl"
            >
              Joji Stats
            </Link>

            <select
              value={teams.includes(teamName) ? teamName : ""}
              onChange={(event) => onChangeTeam(event.target.value)}
              className="mt-0.5 w-36 max-w-full rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700 xl:mt-1 xl:w-36"
              disabled={teams.length === 0}
            >
              {teams.length === 0 ? (
                <option value="">No teams</option>
              ) : (
                <>
                  {placeholder && <option value="">{placeholder}</option>}
                  {teams.map((team) => (
                    <option key={team} value={team}>
                      {team}
                    </option>
                  ))}
                </>
              )}
            </select>
          </div>
        </div>

        {/* RIGHT */}
        <div className="flex max-w-[46vw] shrink-0 flex-wrap items-center justify-end gap-2 xl:max-w-none xl:flex-nowrap xl:gap-3">

          {isLoggedIn ? (
            <>
              <div className="flex items-center divide-x divide-gray-300">
                <Link
                  to="/mlb"
                  className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                >
                  MLB
                </Link>

                <Link
                  to="/sim"
                  className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                >
                  JBL
                </Link>

                <Link
                  to="/season"
                  className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                >
                  Season
                </Link>

                {displayAccessRole === "recorder" && (
                  <Link
                    to="/record-game"
                    className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                  >
                    Record Game
                  </Link>
                )}

                {displayAccessRole === "player" && (
                  <Link
                    to="/player"
                    className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                  >
                    My Player
                  </Link>
                )}

                {displayAccessRole === "manager" && (
                  <Link
                    to="/manager"
                    className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                  >
                    Manager
                  </Link>
                )}

                {displayAccessRole === "admin" && (
                  <Link
                    to="/admin"
                    className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                  >
                    Admin
                  </Link>
                )}

                {showAwaitingAccessLink && !displayAccessRole && (
                  <Link
                    to="/awaiting-access"
                    className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                  >
                    Check Access
                  </Link>
                )}

                <button
                  type="button"
                  onClick={handleLogout}
                  className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
                >
                  Logout
                </button>
              </div>

              <img
                src={avatarUrl || "/logo.png"}
                alt="avatar"
                className="h-8 w-8 cursor-pointer rounded-full border border-gray-200 object-cover xl:h-10 xl:w-10"
                onClick={() => navigate("/profile")}
              />
            </>
          ) : (
            <div className="flex items-center divide-x divide-gray-300">
              <Link
                to="/mlb"
                className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
              >
                MLB
              </Link>

              <Link
                to="/sim"
                className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
              >
                JBL
              </Link>

              <Link
                to="/season"
                className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
              >
                Season
              </Link>

              <Link
                to="/login"
                className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="whitespace-nowrap px-2.5 text-xs font-semibold text-green-900 hover:text-green-600 xl:px-3 xl:text-sm"
              >
                Sign Up
              </Link>
            </div>
          )}

        </div>
      </div>
      </div>
    </header>
  )
}
