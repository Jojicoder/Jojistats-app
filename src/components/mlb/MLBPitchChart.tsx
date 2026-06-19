import type { MLBPlayEvent } from "./types"
import { PITCH_COLORS } from "./MLBGameDetailsUtils"

export function PitchChart({ events, expanded = false }: { events: MLBPlayEvent[]; expanded?: boolean }) {
  const pitches = events.filter(
    (event) =>
      event.pitchData?.coordinates?.pX !== undefined &&
      event.pitchData?.coordinates?.pZ !== undefined
  )

  if (pitches.length === 0) {
    return (
      <div className="rounded-xl bg-gray-50 px-4 py-5 text-sm text-gray-500">
        <p className="font-semibold text-gray-700">Pitch location data is not available</p>
        <p className="mt-1 text-xs text-gray-400">
          Statcast tracking data is not available for this game (e.g. Spring Training, international games, or certain archived games).
        </p>
      </div>
    )
  }

  return (
    <div className={`grid gap-6 ${expanded ? "lg:grid-cols-[420px_1fr]" : "md:grid-cols-[360px_1fr]"}`}>
      <div className={`relative mx-auto overflow-hidden rounded-xl bg-[#1a2e1a] ${
        expanded
          ? "h-80 w-full max-w-80 md:h-105 md:max-w-[22rem]"
          : "h-64 w-full max-w-64 md:h-80 md:max-w-80"
      }`}>
        {/* Home plate area hint */}
        <div className="absolute bottom-[6%] left-1/2 h-[7%] w-[34%] -translate-x-1/2 rounded-sm bg-[#2a3e2a] opacity-60" />
        {/* Strike zone */}
        <div className="absolute left-[12%] top-[8%] h-[74%] w-[76%] border-2 border-white/60 bg-white/5">
          <span className="absolute left-1/3 top-0 h-full border-l border-white/25" />
          <span className="absolute left-2/3 top-0 h-full border-l border-white/25" />
          <span className="absolute left-0 top-1/3 w-full border-t border-white/25" />
          <span className="absolute left-0 top-2/3 w-full border-t border-white/25" />
        </div>
        <p className="absolute left-1/2 top-[10%] -translate-x-1/2 text-xs font-bold uppercase tracking-widest text-white/40">Strike Zone</p>
        {pitches.map((event, index) => {
          const x = Math.max(4, Math.min(96, 50 + (event.pitchData?.coordinates?.pX ?? 0) * 23))
          const z = Math.max(4, Math.min(96, 92 - (event.pitchData?.coordinates?.pZ ?? 0) * 20))
          const code = event.details?.type?.code ?? ""
          return (
            <span
              key={event.index ?? index}
              title={`${index + 1}. ${event.details?.type?.description ?? "Pitch"} ${event.pitchData?.startSpeed?.toFixed(1) ?? ""} mph`}
              className="absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white/80 text-sm font-extrabold text-white shadow-lg"
              style={{
                left: `${x}%`,
                top: `${z}%`,
                backgroundColor: PITCH_COLORS[code] ?? "#4b5563",
              }}
            >
              {index + 1}
            </span>
          )
        })}
      </div>

      <ol className={expanded ? "max-h-96 space-y-2 overflow-y-auto pr-1" : "max-h-128 space-y-3 overflow-y-auto pr-1"}>
        {pitches.map((event, index) => (
          <li key={event.index ?? index} className="flex items-center justify-between gap-2 rounded-xl bg-gray-50 px-3 py-2.5 transition hover:bg-gray-100">
            <div className="flex min-w-0 items-center gap-2.5">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-extrabold text-white shadow-sm"
                style={{ backgroundColor: PITCH_COLORS[event.details?.type?.code ?? ""] ?? "#4b5563" }}
              >
                {index + 1}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800">
                  {event.details?.type?.description ?? "Pitch"}
                </p>
                <p className="truncate text-xs text-gray-500">
                  {event.details?.description ?? ""}
                </p>
                <p className="text-xs text-gray-400">
                  {event.pitchData?.startSpeed?.toFixed(1) ?? "—"} mph
                  {event.pitchData?.breaks?.spinRate ? ` · ${Math.round(event.pitchData.breaks.spinRate)} rpm` : ""}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-lg bg-white px-2.5 py-1 text-sm font-bold tabular-nums text-gray-500 shadow-sm ring-1 ring-gray-200">
              {event.count?.balls ?? 0}-{event.count?.strikes ?? 0}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
