import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"

export default function SignupPage() {
  const navigate = useNavigate()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSignup = async (event: { preventDefault(): void }) => {
    event.preventDefault()

    if (!name.trim()) {
      window.alert("Please enter your name.")
      return
    }

    try {
      setIsLoading(true)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name: name.trim(),
          },
        },
      })

      if (error) {
        window.alert(error.message)
        return
      }

      if (!data.user) {
        window.alert("Signup failed.")
        return
      }

      window.alert("Account created. Please log in.")
      navigate("/login")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3]">

      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between">
          <Link to="/stats" className="flex items-center gap-3">
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
        <form onSubmit={handleSignup} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">Joji Stats</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">Create Account</h1>
          <p className="mt-1 text-sm text-gray-400">Create a JojiStats account.</p>

          <label className="mt-6 block text-xs font-bold uppercase tracking-widest text-gray-400">
            Name
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
              placeholder="Your name"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-gray-400">
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
              placeholder="you@example.com"
            />
          </label>

          <label className="mt-4 block text-xs font-bold uppercase tracking-widest text-gray-400">
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm font-normal normal-case tracking-normal text-gray-900 outline-none focus:border-green-700 focus:bg-white"
              placeholder="Create password"
            />
          </label>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-6 w-full rounded-xl bg-green-900 px-4 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60"
          >
            {isLoading ? "Creating..." : "Sign Up"}
          </button>

          <p className="mt-4 text-center text-sm text-gray-400">
            Already have an account?{" "}
            <Link to="/login" className="font-semibold text-green-900">Login</Link>
          </p>
        </form>
      </main>
    </div>
  )
}