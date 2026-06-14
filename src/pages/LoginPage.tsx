import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import { fetchUserAccessByEmail } from "../api/supabase-api"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("admin@jojistats.com")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const redirectAfterLogin = async (nextEmail: string | null | undefined) => {
    const normalizedEmail = nextEmail?.trim().toLowerCase()

    if (normalizedEmail === "admin@jojistats.com") {
      navigate("/admin", { replace: true })
      return
    }

    if (normalizedEmail) {
      const access = await fetchUserAccessByEmail(normalizedEmail)

      if (access?.role === "recorder") {
        navigate("/record-game", { replace: true })
        return
      }

      if (access?.role === "manager") {
        navigate("/manager", { replace: true })
        return
      }

      if (access?.role === "player") {
        navigate("/player", { replace: true })
        return
      }
    }

    navigate("/stats", { replace: true })
  }

  const handleLogin = async (event: { preventDefault(): void }) => {
    event.preventDefault()

    try {
      setIsLoading(true)

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        window.alert(error.message)
        return
      }

      await redirectAfterLogin(data.user?.email ?? email)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-12 w-12 rounded-full object-cover"
            />

            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Login
            </Link>

            <Link
              to="/signup"
              className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
        >
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Joji Stats</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">Login</h1>

          <p className="mt-1 text-sm text-gray-400">
            Sign in to manage JojiStats.
          </p>

          <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-gray-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-gray-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
              placeholder="Enter password"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-xl bg-green-900 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-3 text-center text-sm">
            <Link to="/forgot-password" className="text-gray-400 hover:text-green-900">
              Forgot your password?
            </Link>
          </p>

          <p className="mt-4 text-center text-sm text-gray-400">
            Need an account?{" "}
            <Link to="/signup" className="font-semibold text-green-900">
              Sign Up
            </Link>
          </p>
        </form>
      </main>
    </div>
  )
}
