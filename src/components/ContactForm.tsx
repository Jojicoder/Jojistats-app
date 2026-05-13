import { useState } from "react"
import { submitContactMessage } from "../api/contactMessages"

type ContactFormProps = {
  className?: string
}

export default function ContactForm({ className = "" }: ContactFormProps) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [statusMessage, setStatusMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setStatusMessage("")
    setErrorMessage("")

    try {
      setIsSubmitting(true)
      await submitContactMessage({ name, email, subject, message })
      setName("")
      setEmail("")
      setSubject("")
      setMessage("")
      setStatusMessage("Message sent. We will get back to you soon.")
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Message failed to send.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form className={`grid gap-4 ${className}`} onSubmit={handleSubmit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
            Name
          </label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            type="text"
            required
            placeholder="Your name"
            className="w-full rounded-xl border border-slate-200 bg-[#f7f8f3] px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-700 focus:bg-white"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
            Email
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="you@example.com"
            className="w-full rounded-xl border border-slate-200 bg-[#f7f8f3] px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-700 focus:bg-white"
          />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
          Subject
        </label>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          type="text"
          placeholder="How can we help?"
          className="w-full rounded-xl border border-slate-200 bg-[#f7f8f3] px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-700 focus:bg-white"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-bold uppercase tracking-widest text-slate-400">
          Message
        </label>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          required
          rows={5}
          placeholder="Tell us what's on your mind..."
          className="w-full resize-none rounded-xl border border-slate-200 bg-[#f7f8f3] px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-green-700 focus:bg-white"
        />
      </div>

      {statusMessage && (
        <div className="rounded-xl bg-green-50 px-4 py-3 text-sm font-semibold text-green-800">
          {statusMessage}
        </div>
      )}

      {errorMessage && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
          {errorMessage}
        </div>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-green-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-green-800 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isSubmitting ? "Sending..." : "Send Message"}
      </button>
    </form>
  )
}
