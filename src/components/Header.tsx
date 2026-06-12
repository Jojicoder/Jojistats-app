import { Link, useNavigate } from "react-router-dom"
import { useEffect, useState } from "react"
import { supabase } from "../api/supabase-client"
import { fetchUserAccessByEmail } from "../api/supabase-api"
import type { UserAccess } from "../types"
import { subscribeAvatarUpdated, getUserAvatarCache, withAvatarCacheBust } from "../utils/avatar"

type HeaderProps = {
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
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 xl:flex-nowrap xl:gap-3">

        {/* LEFT */}
        <div className="flex min-w-0 flex-1 items-center gap-2 xl:gap-3">
          <Link to="/stats" className="shrink-0">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-9 w-9 rounded-full object-cover xl:h-14 xl:w-14"
            />
          </Link>

          <div className="min-w-0">
            <Link
              to="/stats"
              className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 xl:text-4xl"
            >
              Joji Stats
            </Link>

            <select
              value={teams.includes(teamName) ? teamName : ""}
              onChange={(event) => onChangeTeam(event.target.value)}
              className="mt-1 w-40 max-w-full rounded-md border border-gray-200 bg-white px-2 py-2 text-xs text-gray-700 xl:w-36 xl:py-1"
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
        <div className="flex w-full min-w-0 shrink-0 items-center justify-end gap-2 overflow-x-auto xl:w-auto xl:gap-3">

          {isLoggedIn ? (
            <>
              {displayAccessRole === "recorder" && (
                <Link
                  to="/record-game"
                  className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
                >
                  Record Game
                </Link>
              )}

              {displayAccessRole === "player" && (
                <Link
                  to="/player"
                  className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
                >
                  My Player
                </Link>
              )}

              {displayAccessRole === "manager" && (
                <Link
                  to="/manager"
                  className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
                >
                  Manager
                </Link>
              )}

              {displayAccessRole === "admin" && (
                <Link
                  to="/admin"
                  className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
                >
                  Admin
                </Link>
              )}

              {showAwaitingAccessLink && !displayAccessRole && (
                <Link
                  to="/awaiting-access"
                  className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
                >
                  Check Access
                </Link>
              )}

              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg bg-green-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-800 sm:py-2"
              >
                Logout
              </button>

              {/* 🔥 AVATAR */}
              <img
                src={avatarUrl || "/logo.png"}
                alt="avatar"
                className="h-9 w-9 cursor-pointer rounded-full border border-gray-200 object-cover sm:h-10 sm:w-10"
                onClick={() => navigate("/profile")}
              />
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg bg-green-900 px-3 py-2.5 text-sm font-semibold text-white hover:bg-green-800 sm:py-2"
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="rounded-lg border border-green-900 px-3 py-2.5 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
              >
                Sign Up
              </Link>
            </>
          )}

        </div>
      </div>
      </div>
    </header>
  )
}
