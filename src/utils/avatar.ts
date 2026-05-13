export const AVATAR_UPDATED_EVENT = "jojistats-avatar-updated"

function avatarCacheKey(userId: string) {
  return `jojistats-avatar-url-${userId}`
}

export function withAvatarCacheBust(url: string | null | undefined, version = Date.now()) {
  if (!url) return ""
  try {
    const nextUrl = new URL(url)
    nextUrl.searchParams.set("v", String(version))
    return nextUrl.toString()
  } catch {
    const [baseUrl, queryString = ""] = url.split("?")
    const params = new URLSearchParams(queryString)
    params.set("v", String(version))
    return `${baseUrl}?${params.toString()}`
  }
}

export function publishAvatarUpdated(userId: string, avatarUrl: string) {
  window.localStorage.setItem(avatarCacheKey(userId), avatarUrl)
  window.dispatchEvent(
    new CustomEvent<string>(AVATAR_UPDATED_EVENT, { detail: avatarUrl })
  )
}

export function getUserAvatarCache(userId: string) {
  return window.localStorage.getItem(avatarCacheKey(userId))
}

export function subscribeAvatarUpdated(userId: string | null, onAvatarUpdated: (avatarUrl: string) => void) {
  const handleAvatarUpdated = (event: Event) => {
    onAvatarUpdated((event as CustomEvent<string>).detail)
  }

  const handleStorage = (event: StorageEvent) => {
    if (!userId) return
    if (event.key === avatarCacheKey(userId) && event.newValue) {
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
