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

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
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
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-12 w-12 rounded-full object-cover"
            />

            <p className="text-4xl font-extrabold uppercase tracking-tight text-green-900">
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

      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
        <form
          onSubmit={handleLogin}
          className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
        >
          <h1 className="text-2xl font-bold text-green-900">Login</h1>

          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage JojiStats.
          </p>

          <label className="mt-6 block text-sm font-medium text-gray-700">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
            />
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
              placeholder="Enter password"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-600">
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
