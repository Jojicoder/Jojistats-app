export const AVATAR_UPDATED_EVENT = "jojistats-avatar-updated"

export function withAvatarCacheBust(url: string | null | undefined, version = Date.now()) {
  if (!url) return ""
  const separator = url.includes("?") ? "&" : "?"
  return `${url}${separator}v=${version}`
}

export function publishAvatarUpdated(avatarUrl: string) {
  window.localStorage.setItem("jojistats-avatar-url", avatarUrl)
  window.dispatchEvent(
    new CustomEvent<string>(AVATAR_UPDATED_EVENT, { detail: avatarUrl })
  )
}

export function subscribeAvatarUpdated(onAvatarUpdated: (avatarUrl: string) => void) {
  const handleAvatarUpdated = (event: Event) => {
    onAvatarUpdated((event as CustomEvent<string>).detail)
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === "jojistats-avatar-url" && event.newValue) {
      onAvatarUpdated(event.newValue)
    }
  }

  window.addEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdated)
  window.addEventListener("storage", handleStorage)

  return () => {
    window.removeEventListener(AVATAR_UPDATED_EVENT, handleAvatarUpdated)
    window.removeEventListener("storage", handleStorage)
  }
}
