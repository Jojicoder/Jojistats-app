import { useState } from "react"

type Point = { date: string; value: number }

function formatDate(date: string) {
  return new Date(`${date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })
}

export default function JBLTrendChart({
  title,
  points,
  color,
  format,
  average,
}: {
  title: string
  points: Point[]
  color: string
  format: (value: number) => string
  average?: number
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  if (points.length < 2) {
    return (
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-base font-bold text-gray-900">{title}</h2>
        <p className="mt-4 text-sm text-gray-400">Not enough games yet to show a trend.</p>
      </section>
    )
  }

  const width = 640
  const height = 220
  const padLeft = 44
  const padRight = 16
  const padTop = 16
  const padBottom = 28
  const plotWidth = width - padLeft - padRight
  const plotHeight = height - padTop - padBottom

  const values = points.map((p) => p.value)
  const allValues = average !== undefined ? [...values, average] : values
  const rawMin = Math.min(...allValues)
  const maxValue = Math.max(...allValues)
  const span = maxValue - rawMin || 1
  const yPad = span * 0.15
  // These metrics (AVG/OPS/ERA/WHIP) are never negative, so the domain floor
  // never drops below 0 even when every value sits close to the bottom.
  const domainMin = Math.max(0, rawMin - yPad)
  const domainMax = maxValue + yPad
  const domainSpan = domainMax - domainMin || 1

  const yFor = (value: number) =>
    padTop + plotHeight - ((value - domainMin) / domainSpan) * plotHeight
  const xFor = (index: number) => padLeft + (index / (points.length - 1)) * plotWidth

  const linePath = points.map((p, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(p.value).toFixed(1)}`).join(" ")

  const gridLines = [0, 0.5, 1].map((t) => domainMin + domainSpan * t)

  const hovered = hoverIndex !== null ? points[hoverIndex] : null

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      <p className="mt-0.5 text-xs text-gray-400">{points.length} games</p>
      <div className="relative mt-3">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full touch-none"
          onPointerMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect()
            const relX = ((e.clientX - rect.left) / rect.width) * width
            const t = Math.min(1, Math.max(0, (relX - padLeft) / plotWidth))
            setHoverIndex(Math.round(t * (points.length - 1)))
          }}
          onPointerLeave={() => setHoverIndex(null)}
        >
          {gridLines.map((v, i) => (
            <line
              key={i}
              x1={padLeft}
              x2={width - padRight}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="#e5e7eb"
              strokeWidth={1}
            />
          ))}
          {gridLines.map((v, i) => (
            <text key={i} x={padLeft - 8} y={yFor(v)} textAnchor="end" dominantBaseline="middle" className="fill-gray-400 text-[9px]">
              {format(v)}
            </text>
          ))}

          {average !== undefined && (
            <>
              <line
                x1={padLeft}
                x2={width - padRight}
                y1={yFor(average)}
                y2={yFor(average)}
                stroke="#9ca3af"
                strokeWidth={1.5}
                strokeDasharray="4 3"
              />
              <text
                x={width - padRight}
                y={
                  // Nudge the reference label to the far side of its line when
                  // it would otherwise collide with the end-of-line value label.
                  Math.abs(yFor(average) - yFor(points[points.length - 1].value)) < 14
                    ? yFor(average) + 14
                    : yFor(average) - 5
                }
                textAnchor="end"
                className="fill-gray-400 text-[9px] font-semibold"
              >
                Team {format(average)}
              </text>
            </>
          )}

          <path d={linePath} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {hoverIndex !== null && (
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={padTop}
              y2={height - padBottom}
              stroke="#9ca3af"
              strokeWidth={1}
            />
          )}

          <circle
            cx={xFor(points.length - 1)}
            cy={yFor(points[points.length - 1].value)}
            r={4}
            fill={color}
            stroke="#fff"
            strokeWidth={2}
          />
          <text
            x={xFor(points.length - 1) - 6}
            y={yFor(points[points.length - 1].value) - 10}
            textAnchor="end"
            className="text-[10px] font-bold"
            fill={color}
          >
            {format(points[points.length - 1].value)}
          </text>

          {hovered && hoverIndex !== null && (
            <circle cx={xFor(hoverIndex)} cy={yFor(hovered.value)} r={4} fill={color} stroke="#fff" strokeWidth={2} />
          )}
        </svg>

        {hovered && (
          <div
            className="pointer-events-none absolute top-0 rounded-lg bg-gray-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
            style={{
              left: `${(xFor(hoverIndex ?? 0) / width) * 100}%`,
              transform: "translate(-50%, -110%)",
            }}
          >
            <p className="font-bold">{format(hovered.value)}</p>
            <p className="text-gray-300">{formatDate(hovered.date)}</p>
          </div>
        )}
      </div>
    </section>
  )
}
