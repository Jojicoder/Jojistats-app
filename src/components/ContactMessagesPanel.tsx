import { useEffect, useMemo, useState } from "react"
import {
  fetchContactMessages,
  updateContactMessageStatus,
  type ContactMessage,
  type ContactMessageStatus,
} from "../api/contactMessages"

const statusOptions: ContactMessageStatus[] = ["open", "read", "closed"]

function formatDate(value: string) {
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })
}

export default function ContactMessagesPanel() {
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [statusFilter, setStatusFilter] = useState<ContactMessageStatus | "all">("open")
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")

  const filteredMessages = useMemo(
    () => messages.filter((message) => statusFilter === "all" || message.status === statusFilter),
    [messages, statusFilter]
  )

  const unreadCount = messages.filter((message) => message.status === "open").length

  const loadMessages = async () => {
    try {
      setIsLoading(true)
      setErrorMessage("")
      setMessages(await fetchContactMessages())
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Failed to load contact messages.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadMessages()
  }, [])

  const handleStatusChange = async (messageId: string, status: ContactMessageStatus) => {
    await updateContactMessageStatus(messageId, status)
    setMessages((prev) =>
      prev.map((message) =>
        message.id === messageId
          ? { ...message, status, updated_at: new Date().toISOString() }
          : message
      )
    )
  }

  return (
    <main className="w-full">
      <div className="rounded-xl bg-white p-4 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-green-700">Contact</p>
            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-gray-900">Messages</h2>
            <p className="mt-1 text-sm text-gray-500">{unreadCount} open message{unreadCount === 1 ? "" : "s"}</p>
          </div>

          <div className="flex gap-2">
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ContactMessageStatus | "all")}
              className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
            >
              <option value="open">Open</option>
              <option value="read">Read</option>
              <option value="closed">Closed</option>
              <option value="all">All</option>
            </select>
            <button
              type="button"
              onClick={loadMessages}
              className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {errorMessage && (
          <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {isLoading ? (
          <div className="py-10 text-center text-sm font-semibold text-gray-400">Loading messages...</div>
        ) : filteredMessages.length === 0 ? (
          <div className="py-10 text-center text-sm font-semibold text-gray-400">No messages found.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {filteredMessages.map((message) => (
              <article key={message.id} className="rounded-xl border border-gray-100 bg-[#f7f8f3] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-bold text-gray-900">{message.subject || "No subject"}</h3>
                      <span className="rounded-full bg-white px-2.5 py-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                        {message.status}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      {message.name} · <a className="text-green-800 hover:underline" href={`mailto:${message.email}`}>{message.email}</a>
                    </p>
                    <p className="mt-1 text-xs font-semibold text-gray-400">{formatDate(message.created_at)}</p>
                  </div>

                  <select
                    value={message.status}
                    onChange={(event) => handleStatusChange(message.id, event.target.value as ContactMessageStatus)}
                    className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-gray-700">{message.message}</p>
              </article>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
