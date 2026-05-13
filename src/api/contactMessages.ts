import { supabase } from "./supabase-client"

export type ContactMessageStatus = "open" | "read" | "closed"

export type ContactMessage = {
  id: string
  name: string
  email: string
  subject: string | null
  message: string
  status: ContactMessageStatus
  created_at: string
  updated_at: string | null
}

export type NewContactMessage = {
  name: string
  email: string
  subject?: string
  message: string
}

export async function submitContactMessage(input: NewContactMessage) {
  const { error } = await supabase.from("contact_messages").insert({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    subject: input.subject?.trim() || null,
    message: input.message.trim(),
    status: "open",
  })

  if (error) throw new Error(error.message)
}

export async function fetchContactMessages() {
  const { data, error } = await supabase
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []) as ContactMessage[]
}

export async function updateContactMessageStatus(
  id: string,
  status: ContactMessageStatus
) {
  const { error } = await supabase
    .from("contact_messages")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)

  if (error) throw new Error(error.message)
}
