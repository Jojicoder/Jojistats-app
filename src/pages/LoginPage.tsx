import { useState } from "react"
import { useNavigate } from "react-router-dom"

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

 const handleLogin = (event: React.FormEvent<HTMLFormElement>) => {
  event.preventDefault()

  if (email === "admin@example.com" && password === "password") {

    
    localStorage.setItem("jojiStatsAdminLoggedIn", "true")
    navigate("/admin")
    return
  }

  window.alert("Invalid email or password")
}

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm"
      >
        {/* Login page title */}
        <h1 className="text-2xl font-bold text-green-900">
        Login
        </h1>

        {/* Login page description */}
        <p className="mt-2 text-sm text-gray-600">
          Sign in to manage teams, players, and game records.
        </p>

        <label className="mt-6 block text-sm font-medium text-gray-700">
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
            placeholder="admin@example.com"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Password
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
            placeholder="password"
          />
        </label>

        <button
          type="submit"
          className="mt-6 w-full rounded-lg bg-green-900 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800"
        >
          Login
        </button>
      </form>
    </div>
  )
}