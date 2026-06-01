import { useCallback, useMemo, useState } from "react"
import type { Dispatch, SetStateAction } from "react"
import type { Player } from "../types"

type Input = {
  allPlayers: Player[]
}

const normalizeLineupIds = (lineupIds: string[], allPlayers: Player[]) => {
  const validIds = new Set(allPlayers.map((p) => p.id))
  const next = lineupIds.filter((id) => validIds.has(id))
  const missing = allPlayers
    .map((p) => p.id)
    .filter((id) => !next.includes(id))
    .slice(0, Math.max(9 - next.length, 0))

  return [...next, ...missing]
}

export function useLiveLineup({ allPlayers }: Input) {
  const [storedLineupIds, setStoredLineupIds] = useState<string[]>(() =>
    allPlayers.slice(0, Math.min(allPlayers.length, 9)).map((p) => p.id)
  )
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0)
  const [pinhitters, setPinhitters] = useState<Record<number, string>>({})
  const [replacedLineupIds, setReplacedLineupIds] = useState<Record<number, string>>({})
  const [pendingRemoveIndex, setPendingRemoveIndex] = useState<number | null>(null)
  const [dragLineupIndex, setDragLineupIndex] = useState<number | null>(null)
  const [dragOverLineupIndex, setDragOverLineupIndex] = useState<number | null>(null)

  const lineupIds = useMemo(
    () => normalizeLineupIds(storedLineupIds, allPlayers),
    [allPlayers, storedLineupIds]
  )

  const setLineupIds = useCallback<Dispatch<SetStateAction<string[]>>>(
    (action) => {
      setStoredLineupIds((prev) => {
        const current = normalizeLineupIds(prev, allPlayers)
        return typeof action === "function" ? action(current) : action
      })
    },
    [allPlayers]
  )

  const lineupPlayers = useMemo(
    () =>
      lineupIds
        .map((id) => allPlayers.find((p) => p.id === id))
        .filter((p): p is Player => Boolean(p)),
    [allPlayers, lineupIds]
  )

  const handleLineupChange = (index: number, playerId: string) => {
    setLineupIds((prev) => prev.map((id, i) => (i === index ? playerId : id)))
    setReplacedLineupIds((prev) => {
      const next = { ...prev }
      delete next[index]
      return next
    })
  }

  const handleAddLineupSpot = () => {
    const next = allPlayers.find((p) => !lineupIds.includes(p.id)) ?? allPlayers[0]
    if (!next) return
    setLineupIds((prev) => [...prev, next.id])
  }

  const handleRemoveLineupSpot = (index: number) => {
    setLineupIds((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
    setReplacedLineupIds((prev) => {
      const next: Record<number, string> = {}
      Object.entries(prev).forEach(([key, value]) => {
        const i = Number(key)
        if (i < index) next[i] = value
        if (i > index) next[i - 1] = value
      })
      return next
    })
    setCurrentBatterIndex((prev) => Math.max(Math.min(prev, lineupIds.length - 2), 0))
  }

  const handleLineupDrop = (toIndex: number) => {
    if (dragLineupIndex === null || dragLineupIndex === toIndex) {
      setDragLineupIndex(null)
      setDragOverLineupIndex(null)
      return
    }
    setLineupIds((prev) => {
      const next = [...prev]
      const [moved] = next.splice(dragLineupIndex, 1)
      next.splice(toIndex, 0, moved)
      return next
    })
    setDragLineupIndex(null)
    setDragOverLineupIndex(null)
  }

  return {
    lineupIds,
    setLineupIds,
    lineupPlayers,
    currentBatterIndex,
    setCurrentBatterIndex,
    pinhitters,
    setPinhitters,
    replacedLineupIds,
    setReplacedLineupIds,
    pendingRemoveIndex,
    setPendingRemoveIndex,
    dragLineupIndex,
    setDragLineupIndex,
    dragOverLineupIndex,
    setDragOverLineupIndex,
    handleLineupChange,
    handleAddLineupSpot,
    handleRemoveLineupSpot,
    handleLineupDrop,
  }
}
