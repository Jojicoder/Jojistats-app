import { useState } from "react"
import { Link } from "react-router-dom"
import { supabase } from "../api/supabase-client"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState("")

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError("")

    try {
      setIsLoading(true)

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) {
        setError(error.message)
        return
      }

      setSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="JojiStats logo" className="h-12 w-12 rounded-full object-cover" />
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/login" className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800">
              Login
            </Link>
            <Link to="/signup" className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50">
              Sign Up
            </Link>
          </div>
        </div>
      </header>

      <main className="flex min-h-[calc(100vh-73px)] items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          {sent ? (
            <div className="text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-50 text-green-700 ring-1 ring-green-200">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                  <path d="M3 8l7.89 5.26a2 2 0 0 0 2.22 0L21 8M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2z" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <h1 className="mt-4 text-xl font-bold text-gray-900">Check your email</h1>
              <p className="mt-2 text-sm text-gray-500">
                We sent a password reset link to{" "}
                <span className="font-semibold text-gray-700">{email}</span>.
              </p>
              <p className="mt-4 text-xs text-gray-400">
                Can't find it? Check your spam folder.
              </p>
              <Link
                to="/login"
                className="mt-6 block rounded-lg border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Back to login
              </Link>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-green-900">Forgot password</h1>
              <p className="mt-2 text-sm text-gray-600">
                Enter your email and we'll send you a reset link.
              </p>

              <form onSubmit={handleSubmit}>
                <label className="mt-6 block text-sm font-medium text-gray-700">
                  Email
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-3 sm:py-2 text-sm outline-none focus:border-green-700"
                  />
                </label>

                {error && (
                  <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !email}
                  className="mt-6 w-full rounded-lg bg-green-900 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {isLoading ? "Sending..." : "Send reset link"}
                </button>
              </form>

              <p className="mt-4 text-center text-sm text-gray-600">
                <Link to="/login" className="font-semibold text-green-900">
                  Back to login
                </Link>
              </p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
