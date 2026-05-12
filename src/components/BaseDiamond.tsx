import { useState } from "react"
import type { CSSProperties, PointerEvent } from "react"
import type { BaseName, BasesState } from "./RecordGamePage.types"

type BaseDiamondProps = {
  bases: BasesState
  onBasesChange?: (nextBases: BasesState) => void
  selectedBase?: BaseName | null
  onSelectBase?: (base: BaseName | null) => void
}

export default function BaseDiamond({ bases, onBasesChange, selectedBase, onSelectBase }: BaseDiamondProps) {
  const [draggingBase, setDraggingBase] = useState<BaseName | null>(null)

  const baseClass = (base: BaseName, occupied: boolean) =>
    `absolute h-5 w-5 rotate-45 rounded-[4px] border-2 transition-colors ${
      occupied
        ? "cursor-grab border-green-900 bg-green-700 shadow-sm active:cursor-grabbing"
        : "border-gray-300 bg-white"
    } ${selectedBase === base ? "ring-4 ring-amber-300 ring-offset-2" : ""}`

  const handleRelease = (event: PointerEvent<HTMLDivElement>) => {
    if (!draggingBase || !onBasesChange) return

    const rect = event.currentTarget.getBoundingClientRect()
    const point = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    const targets: Array<{ base: BaseName | "home"; x: number; y: number }> = [
      { base: "first", x: 78, y: 44 },
      { base: "second", x: 48, y: 18 },
      { base: "third", x: 24, y: 44 },
      { base: "home", x: 48, y: 70 },
    ]
    const target = targets.reduce((closest, candidate) => {
      const closestDistance = Math.hypot(point.x - closest.x, point.y - closest.y)
      const candidateDistance = Math.hypot(point.x - candidate.x, point.y - candidate.y)
      return candidateDistance < closestDistance ? candidate : closest
    })

    onBasesChange({
      ...bases,
      [draggingBase]: false,
      ...(target.base === "home" ? {} : { [target.base]: true }),
    })
    onSelectBase?.(target.base === "home" ? null : target.base)
    setDraggingBase(null)
  }

  const renderBase = (base: BaseName, occupied: boolean, style: CSSProperties) => (
    <button
      type="button"
      aria-label={`${base} base ${occupied ? "occupied" : "empty"}`}
      onPointerDown={(event) => {
        if (!occupied) return
        event.preventDefault()
        onSelectBase?.(base)
        setDraggingBase(base)
      }}
      className={baseClass(base, occupied)}
      style={style}
    />
  )

  return (
    <div
      className="relative h-20 w-24 shrink-0 touch-none select-none"
      aria-label="Runner diamond"
      onPointerUp={handleRelease}
      onPointerCancel={() => setDraggingBase(null)}
      onPointerLeave={() => setDraggingBase(null)}
    >
      <div className="absolute left-1/2 top-8 h-12 w-12 -translate-x-1/2 rotate-45 rounded-sm border border-gray-200 bg-gray-100" />
      {renderBase("first", bases.first, { right: 14, top: 34 })}
      {renderBase("second", bases.second, { left: 38, top: 8 })}
      {renderBase("third", bases.third, { left: 14, top: 34 })}
      <div className="absolute bottom-2 left-1/2 h-4 w-4 -translate-x-1/2 rotate-45 rounded-[3px] border border-gray-300 bg-white" />
      {draggingBase && (
        <p className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold text-green-900">
          drop to move
        </p>
      )}
    </div>
  )
}
