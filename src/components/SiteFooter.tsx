import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"

const exploreLinks = [
  { label: "My Stats", to: "/stats" },
  { label: "MLB", to: "/mlb" },
  { label: "JBL", to: "/jbl" },
  { label: "Team Manager", to: "/manager" },
  { label: "Seasons", to: "/seasons" },
]

export default function SiteFooter() {
  const navigate = useNavigate()
  const [loggedIn, setLoggedIn] = useState(false)
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setLoggedIn(!!data.user))
    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => {
      setLoggedIn(!!session)
    })
    return () => listener.subscription.unsubscribe()
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    navigate("/login")
  }

  return (
    <footer
      className="relative shrink-0 border-t text-white"
      style={{
        background: `linear-gradient(
          var(--mlb-pattern-angle, 135deg),
          color-mix(in srgb, var(--mlb-primary, #052e16) 92%, black) 0%,
          color-mix(in srgb, var(--mlb-primary, #052e16) 75%, black) 55%,
          color-mix(in srgb, var(--mlb-secondary, #166534) 40%, black) 100%
        )`,
        borderTopColor: "color-mix(in srgb, var(--mlb-secondary, #166534) 50%, transparent)",
      }}
    >
      <div className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-10">
        <div className="grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">

          {/* Brand */}
          <div>
            <Link to="/" className="inline-flex items-center gap-3">
              <img
                src="/logo.png"
                alt=""
                className="h-10 w-10 rounded-full bg-white object-cover ring-2 ring-white/15"
              />
              <span className="text-lg font-extrabold uppercase tracking-tight">JojiStats</span>
            </Link>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-green-100/60">
              Record games, manage your team, and explore baseball stats — all in one place.
            </p>
            <a
              href="https://jaabaseball.blogspot.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-sm font-semibold text-green-100/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white"
            >
              JAA Baseball League Official Site
              <span aria-hidden="true">↗</span>
            </a>
          </div>

          {/* Explore */}
          <nav aria-label="Explore">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--mlb-secondary, #86efac) 90%, white)" }}>Explore</p>
            <ul className="mt-4 space-y-2.5">
              {exploreLinks.map(({ label, to }) => (
                <li key={label}>
                  <Link to={to} className="text-sm font-medium text-green-100/70 transition hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Account */}
          <nav aria-label="Account">
            <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: "color-mix(in srgb, var(--mlb-secondary, #86efac) 90%, white)" }}>Account</p>
            <ul className="mt-4 space-y-2.5">
              {loggedIn ? (
                <>
                  <li>
                    <Link to="/profile" className="text-sm font-medium text-green-100/70 transition hover:text-white">
                      Profile
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-sm font-medium text-green-100/70 transition hover:text-white">
                      Contact
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="text-sm font-medium text-green-100/70 transition hover:text-white"
                    >
                      Log Out
                    </button>
                  </li>
                </>
              ) : (
                <>
                  <li>
                    <Link to="/login" className="text-sm font-medium text-green-100/70 transition hover:text-white">
                      Log In
                    </Link>
                  </li>
                  <li>
                    <Link to="/signup" className="text-sm font-medium text-green-100/70 transition hover:text-white">
                      Sign Up
                    </Link>
                  </li>
                  <li>
                    <Link to="/contact" className="text-sm font-medium text-green-100/70 transition hover:text-white">
                      Contact
                    </Link>
                  </li>
                </>
              )}
            </ul>
          </nav>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col gap-1.5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p className="text-xs text-green-100/45">
            © {new Date().getFullYear()} JojiStats. All rights reserved.
          </p>
          <p className="text-xs text-green-100/45">
            Stats provided by{" "}
            <a
              href="https://statsapi.mlb.com"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 transition hover:text-green-100/70"
            >
              MLB Stats API
            </a>
            . Not affiliated with or endorsed by MLB.
          </p>
        </div>
      </div>
    </footer>
  )
}
