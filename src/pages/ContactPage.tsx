import { Link } from "react-router-dom"
import ContactForm from "../components/ContactForm"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-[#f7f8f3] text-slate-950">
      <header className="border-b border-slate-200 bg-white px-5 py-3 shadow-sm">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src="/logo.png" alt="JojiStats logo" className="h-10 w-10 rounded-full object-cover" />
            <span className="block truncate text-xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              JojiStats
            </span>
          </Link>
          <Link to="/login" className="rounded-xl bg-green-900 px-4 py-2 text-sm font-bold text-white hover:bg-green-800">
            Login
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 py-12 sm:py-16">
        <p className="text-xs font-bold uppercase tracking-widest text-green-700">Contact</p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-green-950 sm:text-5xl">
          Get in touch
        </h1>
        <p className="mt-3 text-sm text-slate-500 sm:text-base">
          Questions, feedback, team setup help, or account requests are saved for the JojiStats admin team.
        </p>

        <div className="mt-8 rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <ContactForm />
        </div>
      </main>
    </div>
  )
}
