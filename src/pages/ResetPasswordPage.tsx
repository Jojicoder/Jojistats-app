import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  // Supabase puts the session token in the URL hash when the user lands here.
  // Listening for PASSWORD_RECOVERY confirms the session is valid before showing the form.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e: { preventDefault(): void }) => {
    e.preventDefault()
    setError("")

    if (password !== confirm) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    try {
      setIsLoading(true)

      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setError(error.message)
        return
      }

      await supabase.auth.signOut()
      navigate("/login", { replace: true, state: { passwordReset: true } })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3]">
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-3">
            <img src="/logo.png" alt="JojiStats logo" className="h-12 w-12 rounded-full object-cover" />
            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10">
        <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          {!ready ? (
            <div className="text-center">
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-green-900 border-t-transparent" />
              <p className="mt-4 text-sm text-gray-400">Verifying link...</p>
              <p className="mt-6 text-xs text-gray-400">
                This page is only accessible from a password reset email.
              </p>
              <Link to="/forgot-password" className="mt-4 block text-sm font-semibold text-green-900">
                Resend reset email
              </Link>
            </div>
          ) : (
            <>
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Joji Stats</p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">Set new password</h1>
              <p className="mt-1 text-sm text-gray-400">
                Choose a new password with at least 6 characters.
              </p>

              <form onSubmit={handleSubmit}>
                <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  New password
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    placeholder="At least 6 characters"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                  />
                </label>

                <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-gray-400">
                  Confirm password
                  <input
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    required
                    placeholder="Repeat password"
                    className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
                  />
                </label>

                {error && (
                  <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-600">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLoading || !password || !confirm}
                  className="mt-6 w-full rounded-xl bg-green-900 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
                >
                  {isLoading ? "Updating..." : "Update password"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
