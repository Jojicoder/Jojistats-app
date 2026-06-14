import { Link } from "react-router-dom"
import ContactForm from "../components/ContactForm"

const features = [
  {
    label: "Record Games",
    desc: "Log at-bats, pitching, and fielding in real time.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <path d="M9 12h6M9 16h4" />
      </svg>
    ),
  },
  {
    label: "Manage Players",
    desc: "Keep rosters organized across multiple seasons.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
        <circle cx="9" cy="7" r="3" />
        <path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
      </svg>
    ),
  },
  {
    label: "View Stats",
    desc: "Batting averages, OBP, ERA, and more at a glance.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
        <path d="M3 3v18h18" />
        <path d="M7 16l4-6 4 4 4-8" />
      </svg>
    ),
  },
  {
    label: "Track Seasons",
    desc: "Compare performance year over year with ease.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="h-7 w-7">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth={2.5} strokeLinecap="round" />
      </svg>
    ),
  },
]

const steps = [
  {
    label: "Create Team",
    desc: "Set up your team profile and season in minutes.",
  },
  {
    label: "Add Players",
    desc: "Build your roster by adding players and positions.",
  },
  {
    label: "Record Game",
    desc: "Enter game results and watch stats update instantly.",
  },
]

const recentGames = [
  { opponent: "Northview", result: "W 7-4", win: true },
  { opponent: "Riverside", result: "W 5-2", win: true },
  { opponent: "West Park", result: "L 3-6", win: false },
]

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-[#f7f8f3] text-slate-950">
      {/* ── Header ── */}
      <header className="border-b border-slate-200 bg-white px-5 py-3">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-9 w-9 shrink-0 rounded-full object-cover sm:h-11 sm:w-11"
            />
            <span className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-3xl">
              JojiStats
            </span>
          </Link>

          <nav className="hidden items-center gap-7 text-sm font-semibold text-slate-500 md:flex">
            <a href="#features" className="transition-colors hover:text-green-900">Features</a>
            <a href="#how" className="transition-colors hover:text-green-900">How It Works</a>
            <Link to="/stats" className="transition-colors hover:text-green-900">Try the Demo</Link>
            <a href="#contact" className="transition-colors hover:text-green-900">Contact</a>
            <Link to="/login" className="transition-colors hover:text-green-900">Login</Link>
          </nav>

          <Link
            to="/signup"
            className="rounded-lg bg-green-900 px-4 py-2 text-sm font-bold text-white shadow-sm transition-colors hover:bg-green-800"
          >
            Sign Up Free
          </Link>
        </div>
      </header>

      <main>
        {/* ── Hero ── */}
        <section className="relative overflow-hidden border-b border-slate-200 px-5 py-10 sm:py-20 lg:py-28">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_60%_-10%,rgba(20,83,45,0.08),transparent)]"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[1fr_480px] lg:gap-14">
            <div>
              <span className="inline-block rounded-full border border-green-200 bg-green-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-green-800">
                Baseball Stats App
              </span>
              <h1 className="mt-4 max-w-2xl text-3xl font-extrabold leading-[1.1] tracking-tight text-green-950 sm:text-5xl lg:text-6xl">
                Make baseball stats management{" "}
                <span className="text-green-700">easier.</span>
              </h1>

              <p className="mt-4 max-w-xl text-base leading-7 text-slate-500 sm:mt-6 sm:text-xl sm:leading-8">
                Record games, manage players, and visualize team performance — all in one app built for coaches.
              </p>

              <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row">
                <Link
                  to="/signup"
                  className="rounded-lg bg-green-900 px-7 py-3.5 text-center text-sm font-bold text-white shadow transition-colors hover:bg-green-800"
                >
                  Get Started — It's Free
                </Link>
                <a
                  href="#demo"
                  className="rounded-lg border border-slate-300 bg-white px-7 py-3.5 text-center text-sm font-bold text-slate-700 transition-colors hover:border-green-800 hover:text-green-900"
                >
                  See Demo
                </a>
              </div>

              <p className="mt-5 text-xs text-slate-400">No credit card required · Set up in under 5 minutes</p>
            </div>

            {/* Dashboard preview card — hidden on mobile, shown lg+ */}
            <div className="hidden lg:block rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-200/80">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-green-700">
                    Dashboard Preview
                  </p>
                  <h2 className="mt-0.5 text-lg font-extrabold text-slate-950">Joji Wildcats</h2>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-800 ring-1 ring-green-200">
                  2026 Season
                </span>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2.5">
                {[
                  ["Games", "18"],
                  ["Team AVG", ".312"],
                  ["Runs", "124"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-slate-50 px-3 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                    <p className="mt-1.5 text-2xl font-extrabold text-green-950">{value}</p>
                  </div>
                ))}
              </div>

              {/* Bar chart */}
              <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4">
                <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-slate-400">Runs per Game</p>
                <div className="flex items-end justify-between gap-1.5">
                  {[62, 74, 48, 82, 68, 92, 78].map((height, index) => (
                    <div
                      key={height + index}
                      className="flex h-20 flex-1 items-end rounded-md bg-slate-100 overflow-hidden"
                    >
                      <div
                        className="w-full rounded-t-md bg-green-700 transition-all"
                        style={{ height: `${height}%` }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-xl bg-green-950 p-4 text-white">
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-green-300">Team Leader</p>
                  <p className="mt-2 text-base font-extrabold">M. Tanaka</p>
                  <p className="text-xs text-green-300">.421 AVG · 22 RBI</p>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Recent Games</p>
                  <div className="mt-2.5 space-y-1.5">
                    {recentGames.map((game) => (
                      <div key={game.opponent} className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-slate-600">{game.opponent}</span>
                        <span className={`font-bold ${game.win ? "text-green-700" : "text-rose-500"}`}>
                          {game.result}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Pain Point ── */}
        <section className="border-b border-slate-200 bg-white px-5 py-10 sm:py-16">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 ring-1 ring-amber-200">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-6 w-6">
                <path d="M12 9v4M12 17h.01" strokeLinecap="round" />
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              </svg>
            </div>
            <h2 className="text-2xl font-extrabold tracking-tight text-green-950 sm:text-3xl">
              Still managing stats on paper?
            </h2>
            <p className="mt-4 text-base leading-7 text-slate-500 sm:text-lg sm:leading-8">
              Paper score sheets are useful, but calculating season stats and comparing player performance takes hours.
              With JojiStats, your game records automatically become team stats — no spreadsheets needed.
            </p>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="features" className="border-b border-slate-200 px-5 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Features</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
                Everything your team needs
              </h2>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 sm:gap-5 lg:grid-cols-4">
              {features.map((f) => (
                <div
                  key={f.label}
                  className="group rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-800 ring-1 ring-green-100 transition-colors group-hover:bg-green-900 group-hover:text-white group-hover:ring-green-900 sm:h-12 sm:w-12">
                    {f.icon}
                  </div>
                  <p className="mt-3 text-sm font-extrabold text-slate-900 sm:mt-4 sm:text-base">{f.label}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:mt-1.5 sm:text-sm sm:leading-6">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ── */}
        <section id="how" className="border-b border-slate-200 bg-white px-5 py-12 sm:py-20">
          <div className="mx-auto max-w-5xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">How It Works</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
                Up and running in 3 steps
              </h2>
            </div>

            <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
              {steps.map((step, index) => (
                <div key={step.label} className="relative">
                  {index < steps.length - 1 && (
                    <div
                      aria-hidden
                      className="absolute right-0 top-6 hidden h-px w-1/2 translate-x-1/2 bg-linear-to-r from-green-200 to-transparent md:block"
                    />
                  )}
                  <div className="rounded-2xl border border-slate-200 bg-[#f7f8f3] p-5 sm:p-7">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-900 text-sm font-extrabold text-white shadow">
                      {index + 1}
                    </div>
                    <p className="mt-5 text-xl font-extrabold text-slate-950">{step.label}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Demo ── */}
        <section id="demo" className="border-b border-slate-200 px-5 py-12 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Demo</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
                See it in action
              </h2>
              <p className="mt-3 text-sm text-slate-500 sm:text-base">Live data from a sample team season</p>
            </div>

            <div className="mt-8 grid grid-cols-2 gap-4 sm:mt-10 md:grid-cols-4">
              {[
                { label: "Games Played", value: "18", icon: "⚾", color: "bg-blue-50 text-blue-700 ring-blue-100" },
                { label: "Team AVG", value: ".312", icon: "📊", color: "bg-green-50 text-green-700 ring-green-100" },
                { label: "This Week", value: "3 games", icon: "📅", color: "bg-amber-50 text-amber-700 ring-amber-100" },
                { label: "Tracked Leaders", value: "4 players", icon: "🏆", color: "bg-purple-50 text-purple-700 ring-purple-100" },
              ].map(({ label, value, icon, color }) => (
                <div
                  key={label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ring-1 text-lg ${color}`}>
                    {icon}
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-400">{label}</p>
                  <p className="mt-1 text-2xl font-extrabold text-green-950">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 text-center">
              <Link
                to="/stats"
                className="inline-block rounded-xl bg-green-900 px-8 py-3.5 text-sm font-bold text-white shadow transition-colors hover:bg-green-800"
              >
                Try the Demo
              </Link>
            </div>
          </div>
        </section>

        {/* ── Contact ── */}
        <section id="contact" className="border-b border-slate-200 bg-white px-5 py-12 sm:py-20">
          <div className="mx-auto max-w-2xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-widest text-green-700">Contact</p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-green-950 sm:text-4xl">
                Get in touch
              </h2>
              <p className="mt-3 text-sm text-slate-500 sm:text-base">
                Questions, feedback, or want to join a team? Send us a message.
              </p>
            </div>

            <ContactForm className="mt-8" />
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="relative overflow-hidden bg-green-950 px-5 py-14 text-white sm:py-20">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_80%_at_50%_120%,rgba(134,239,172,0.12),transparent)]"
          />
          <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-5 text-center sm:gap-6">
            <h2 className="text-2xl font-extrabold tracking-tight sm:text-4xl">
              Start tracking your team today.
            </h2>
            <p className="max-w-xl text-sm text-green-300 sm:text-base">
              Join coaches who have already ditched the spreadsheets. Free forever for one team.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                to="/signup"
                className="rounded-xl bg-white px-8 py-3.5 text-sm font-extrabold text-green-950 shadow-lg transition-colors hover:bg-green-50"
              >
                Create Free Account
              </Link>
              <Link
                to="/login"
                className="rounded-xl border border-green-700 px-8 py-3.5 text-sm font-bold text-green-100 transition-colors hover:border-green-500 hover:text-white"
              >
                Log In
              </Link>
            </div>
          </div>
        </section>
      </main>

    </div>
  )
}
