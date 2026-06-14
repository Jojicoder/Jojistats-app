import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { fetchUserAccessByEmail } from "../api/supabase-api"
import { supabase } from "../api/supabase-client"

function getAccessDestination(email: string, role: string | null | undefined) {
  if (email === "admin@jojistats.com") return "/admin"
  if (role === "recorder") return "/record-game"
  if (role === "manager") return "/manager"
  if (role === "player") return "/player"
  return null
}

export default function AwaitingAccessPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const pendingEmail = searchParams.get("email")?.trim().toLowerCase() ?? ""
  const needsEmailConfirmation = searchParams.get("confirm") === "1"
  const [email, setEmail] = useState(pendingEmail)
  const [isChecking, setIsChecking] = useState(true)
  const [message, setMessage] = useState("")

  const checkAccess = useCallback(async () => {
    setIsChecking(true)
    setMessage("")

    try {
      const { data } = await supabase.auth.getUser()
      const normalizedEmail = data.user?.email?.trim().toLowerCase()

      if (!normalizedEmail) {
        if (needsEmailConfirmation) {
          setEmail(pendingEmail)
          setMessage("Please confirm your email, then log in to continue.")
          return
        }

        navigate("/login", { replace: true })
        return
      }

      setEmail(normalizedEmail)

      if (normalizedEmail === "admin@jojistats.com") {
        navigate("/admin", { replace: true })
        return
      }

      const access = await fetchUserAccessByEmail(normalizedEmail)
      const destination = getAccessDestination(normalizedEmail, access?.role)

      if (destination) {
        navigate(destination, { replace: true })
        return
      }

      setMessage("Your account is waiting for access approval.")
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to check access.")
    } finally {
      setIsChecking(false)
    }
  }, [navigate, needsEmailConfirmation, pendingEmail])

  useEffect(() => {
    checkAccess()
    const intervalId = window.setInterval(checkAccess, 30000)

    return () => window.clearInterval(intervalId)
  }, [checkAccess])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img src="/logo.png" alt="JojiStats logo" className="h-12 w-12 rounded-full object-cover" />
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>

          <button
            type="button"
            onClick={handleLogout}
            className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
          >
            Logout
          </button>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <section className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Access Pending</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-gray-900">
            Waiting for approval
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-500">
            {needsEmailConfirmation
              ? "Your account has been created. Confirm your email first, then log in and wait until an administrator gives your email an access record."
              : "Your account has been created. Please wait until an administrator gives your email an access record."}
          </p>

          {email && (
            <p className="mt-4 rounded-xl bg-[#f7f8f3] px-3 py-3 text-sm font-semibold text-gray-700">
              {email}
            </p>
          )}

          <p className="mt-4 min-h-5 text-sm text-gray-400">
            {isChecking ? "Checking access..." : message}
          </p>

          <button
            type="button"
            onClick={checkAccess}
            disabled={isChecking}
            className="mt-6 w-full rounded-xl bg-green-900 px-4 py-3 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60 sm:py-2"
          >
            {isChecking ? "Checking..." : "Check again"}
          </button>

          {needsEmailConfirmation && (
            <Link
              to="/login"
              className="mt-3 block rounded-xl border border-green-900 px-4 py-3 text-sm font-semibold text-green-900 hover:bg-green-50 sm:py-2"
            >
              Go to login
            </Link>
          )}
        </section>
      </main>
    </div>
  )
}
