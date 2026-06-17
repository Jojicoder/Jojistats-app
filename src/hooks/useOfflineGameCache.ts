import { useState } from "react"
import type { Player, SavedBattingGameEntry } from "../types"
import { createFullGame } from "../api/api"
import { fetchSavedEntriesByPlayer } from "../api/supabase-api"

export const OFFLINE_CACHE_KEY = "jojistats-game-cache"
export const OFFLINE_QUEUE_KEY = "jojistats-game-queue"
export const LOAD_TIMEOUT_MS = 15000

export type TeamSnapshot = {
  id: number
  name: string
  current_season_year: number
}

export type OfflineRecordCache = {
  team: TeamSnapshot
  players: Player[]
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
  preferredPlayerId?: string
}

export function withLoadTimeout<T>(promise: PromiseLike<T>, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(
      () => reject(new Error(`${label} timed out. Please check your connection and try again.`)),
      LOAD_TIMEOUT_MS
    )
    Promise.resolve(promise).then(resolve).catch(reject).finally(() => window.clearTimeout(timeoutId))
  })
}

export function readOfflineCache(): OfflineRecordCache | null {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) ?? "null") as OfflineRecordCache | null
  } catch {
    return null
  }
}

export function writeOfflineCache(cache: OfflineRecordCache): void {
  try {
    localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(cache))
  } catch { /* storage full - skip */ }
}

export function readOfflineQueue(): { payload: Parameters<typeof createFullGame>[0] }[] {
  try {
    return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function writeOfflineQueue(queue: { payload: Parameters<typeof createFullGame>[0] }[]): void {
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue))
}

export function useOfflineGameCache(
  onFlushComplete: (entries: Record<string, SavedBattingGameEntry[]>, playerId: string) => void
) {
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [offlineQueueSize, setOfflineQueueSize] = useState(() => readOfflineQueue().length)

  const enqueueOfflineGame = (payload: Parameters<typeof createFullGame>[0]) => {
    const queue = readOfflineQueue()
    queue.push({ payload })
    writeOfflineQueue(queue)
    setOfflineQueueSize(queue.length)
  }

  const flushOfflineQueue = async (teamId: number, seasonYear: number, playerId: string) => {
    const queue = readOfflineQueue()
    if (queue.length === 0) return
    for (const item of queue) {
      try { await createFullGame(item.payload) } catch { return }
    }
    localStorage.removeItem(OFFLINE_QUEUE_KEY)
    setOfflineQueueSize(0)
    const refreshed = await fetchSavedEntriesByPlayer(teamId, seasonYear)
    onFlushComplete(refreshed, playerId)
  }

  const handleOnline = (teamId: number | null, seasonYear: number, playerId: string) => {
    setIsOnline(true)
    if (teamId != null) flushOfflineQueue(teamId, seasonYear, playerId)
  }

  const handleOffline = () => setIsOnline(false)

  return { isOnline, offlineQueueSize, enqueueOfflineGame, flushOfflineQueue, handleOnline, handleOffline }
}
