import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { supabase } from "../api/supabase-client"
import { publishAvatarUpdated, withAvatarCacheBust } from "../utils/avatar"

const positionOptions = [
  "P",
  "C",
  "1B",
  "2B",
  "3B",
  "SS",
  "LF",
  "CF",
  "RF",
  "DH",
  "UTIL",
]

function isMissingTeamNameColumnError(message: string) {
  const normalized = message.toLowerCase()
  return normalized.includes("team_name") && normalized.includes("column")
}

export default function ProfilePage() {
  const navigate = useNavigate()

  const [userId, setUserId] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [avatarUrl, setAvatarUrl] = useState("")
  const [teamName, setTeamName] = useState("")
  const [primaryPosition, setPrimaryPosition] = useState("")
  const [jerseyNumber, setJerseyNumber] = useState("")
  const [isAdminUser, setIsAdminUser] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState("")
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    const loadProfile = async () => {
      try {
        setIsLoading(true)
        setErrorMessage("")

        const { data } = await supabase.auth.getUser()

        if (!data.user) {
          navigate("/login", { replace: true })
          return
        }

        const userEmail = data.user.email ?? ""
        setUserId(data.user.id)
        setEmail(userEmail)
        setIsAdminUser(userEmail.trim().toLowerCase() === "admin@jojistats.com")

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", data.user.id)
          .maybeSingle()

        if (error) throw new Error(error.message)

        setName(profile?.name ?? data.user.user_metadata?.name ?? "")
        setAvatarUrl(profile?.avatar_url ? withAvatarCacheBust(profile.avatar_url) : "")
        setTeamName(profile?.team_name ?? data.user.user_metadata?.team_name ?? "")
        setPrimaryPosition(profile?.primary_position ?? "")
        setJerseyNumber(
          profile?.jersey_number === null || profile?.jersey_number === undefined
            ? ""
            : String(profile.jersey_number)
        )
      } catch (error) {
        console.error(error)
        setErrorMessage(
          error instanceof Error
            ? `Failed to load profile: ${error.message}`
            : "Failed to load profile."
        )
      } finally {
        setIsLoading(false)
      }
    }

    loadProfile()
  }, [navigate])

  /* ---------------- AVATAR UPLOAD ---------------- */

  const handleUploadAvatar = async (file: File) => {
    if (!userId) return

    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.")
      return
    }

    const fileExt = file.name.split(".").pop()
    const filePath = `${userId}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      window.alert(uploadError.message)
      return
    }

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath)
    const nextAvatarUrl = withAvatarCacheBust(data.publicUrl)

    console.log("[ProfilePage] publicUrl:", data.publicUrl)
    console.log("[ProfilePage] nextAvatarUrl:", nextAvatarUrl)

    setAvatarUrl(nextAvatarUrl)
    publishAvatarUpdated(userId, nextAvatarUrl)

    console.log("[ProfilePage] localStorage after publish:", window.localStorage.getItem("jojistats-avatar-url"))

    const fallbackName = name.trim() || email.split("@")[0] || "User"

    const { error } = await supabase.from("profiles").upsert({
      id: userId,
      email,
      name: fallbackName,
      avatar_url: nextAvatarUrl,
      updated_at: new Date().toISOString(),
    })

    if (error) {
      window.alert(error.message)
    }
  }

  /* ---------------- SAVE ---------------- */

  const handleSave = async () => {
    if (!userId) return

    try {
      setIsSaving(true)

      const nextTeamName = teamName.trim()

      await supabase.auth.updateUser({
        data: {
          name: name.trim(),
          team_name: nextTeamName,
        },
      })

      const profilePayload = {
        id: userId,
        email,
        name: name.trim(),
        avatar_url: avatarUrl,
        team_name: nextTeamName || null,
        primary_position: primaryPosition || null,
        jersey_number: jerseyNumber ? Number(jerseyNumber) : null,
        updated_at: new Date().toISOString(),
      }

      const { error } = await supabase.from("profiles").upsert(profilePayload)

      if (error) {
        if (!isMissingTeamNameColumnError(error.message)) {
          window.alert(error.message)
          return
        }

        const fallbackPayload = {
          id: profilePayload.id,
          email: profilePayload.email,
          name: profilePayload.name,
          avatar_url: profilePayload.avatar_url,
          primary_position: profilePayload.primary_position,
          jersey_number: profilePayload.jersey_number,
          updated_at: profilePayload.updated_at,
        }
        const { error: fallbackError } = await supabase
          .from("profiles")
          .upsert(fallbackPayload)

        if (fallbackError) {
          window.alert(fallbackError.message)
          return
        }
      }

      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/login", { replace: true })
  }

  /* ---------------- UI ---------------- */

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f7f8f3] p-6 text-gray-400">
        Loading profile...
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f7f8f3]">
      {/* HEADER */}
      <header className="border-b border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex w-full items-center justify-between gap-4">
          <Link to="/stats" className="flex items-center gap-3">
            <img
              src="/logo.png"
              alt="JojiStats logo"
              className="h-12 w-12 shrink-0 rounded-full object-cover"
            />

            <p className="text-2xl font-extrabold uppercase tracking-tight text-green-900 sm:text-4xl">
              Joji Stats
            </p>
          </Link>

          <div className="flex items-center gap-3">
            <Link
              to={isAdminUser ? "/admin" : "/stats"}
              className="rounded-lg border border-green-900 px-3 py-2 text-sm font-semibold text-green-900 hover:bg-green-50"
            >
              {isAdminUser ? "Admin" : "Stats"}
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="rounded-lg bg-green-900 px-3 py-2 text-sm font-semibold text-white hover:bg-green-800"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* CONTENT */}
      <main className="mx-auto max-w-2xl p-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-green-700">My Account</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">My Profile</h1>

          <p className="mt-1 text-sm text-gray-400">
            Manage your JojiStats account and player profile.
          </p>

          {errorMessage && (
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          {/* AVATAR */}
          <div className="mt-6 flex items-center gap-4">
            <label className="cursor-pointer">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-green-900 text-2xl font-bold text-white">
                  {name ? name[0].toUpperCase() : "?"}
                </div>
              )}

              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(event) => {
                  if (event.target.files?.[0]) {
                    handleUploadAvatar(event.target.files[0])
                  }
                }}
              />
            </label>

            <div className="flex-1">
              {isEditing ? (
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-700"
                  placeholder="Display name"
                />
              ) : (
                <p className="text-lg font-semibold text-gray-900">
                  {name || "No name"}
                </p>
              )}

              <p className="mt-1 text-sm text-gray-500">{email}</p>

              <p className="mt-2 text-xs text-gray-400">
                Click the avatar to upload a new profile photo.
              </p>
            </div>
          </div>

          {/* PROFILE DETAILS */}
          <div className="mt-8 grid gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Team
              </p>

              {isEditing ? (
                <input
                  type="text"
                  value={teamName}
                  onChange={(event) => setTeamName(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm outline-none focus:border-green-700 focus:bg-white"
                  placeholder="Team name"
                />
              ) : (
                <p className="mt-1 rounded-xl bg-[#f7f8f3] px-3 py-2.5 text-sm text-gray-700">
                  {teamName || "Not set"}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Primary Position
              </p>

              {isEditing ? (
                <select
                  value={primaryPosition}
                  onChange={(event) => setPrimaryPosition(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm outline-none focus:border-green-700 focus:bg-white"
                >
                  <option value="">Select position</option>
                  {positionOptions.map((position) => (
                    <option key={position} value={position}>
                      {position}
                    </option>
                  ))}
                </select>
              ) : (
                <p className="mt-1 rounded-xl bg-[#f7f8f3] px-3 py-2.5 text-sm text-gray-700">
                  {primaryPosition || "Not set"}
                </p>
              )}
            </div>

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                Jersey Number
              </p>

              {isEditing ? (
                <input
                  type="number"
                  value={jerseyNumber}
                  onChange={(event) => setJerseyNumber(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-gray-200 bg-[#f7f8f3] px-3 py-3 sm:py-2 text-sm outline-none focus:border-green-700 focus:bg-white"
                  placeholder="Example: 27"
                />
              ) : (
                <p className="mt-1 rounded-xl bg-[#f7f8f3] px-3 py-2.5 text-sm text-gray-700">
                  {jerseyNumber || "Not set"}
                </p>
              )}
            </div>
          </div>

          {/* ACTION */}
          <div className="mt-8 flex gap-3">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 rounded-xl bg-green-900 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save"}
                </button>

                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 sm:py-2 text-sm font-semibold text-gray-600 hover:bg-[#f7f8f3]"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="w-full rounded-xl bg-green-900 py-3 sm:py-2 text-sm font-semibold text-white hover:bg-green-800"
              >
                Edit Profile
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
