import { teamBadge, teamColors } from "./teamTheme"
import { TEAM_IDENTITY, DIVISION_TONE } from "./teamIdentity"

function IdentityCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#f7f8f3] p-4">
      <p className="text-xs font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-1.5 text-sm text-gray-800">{value}</p>
    </div>
  )
}

export default function TeamIdentityTab({
  teamName,
  division,
}: {
  teamName: string
  division?: string
}) {
  const identity = TEAM_IDENTITY[teamName]
  const c = teamColors(teamName)
  const tone = division ? DIVISION_TONE[division] : undefined

  if (!identity) {
    return (
      <div className="rounded-2xl bg-white p-6 text-sm text-gray-500 shadow-sm">
        No identity profile for this team yet.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <div className="flex items-center gap-4">
          {teamBadge(teamName, "2xl")}
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.primary }}>
              {division ?? "JBL"}
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              {teamName}
            </h1>
          </div>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.primary }}>
          Team Philosophy
        </p>
        <h2 className="mt-1 text-xl font-extrabold text-gray-900">{identity.philosophy}</h2>
        <p className="mt-2 text-sm text-gray-600">{identity.tagline}</p>
      </section>

      {tone && (
        <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: c.primary }}>
            Team Culture — {tone}
          </p>
          <p className="mt-2 text-sm text-gray-600">{identity.vibe}</p>
        </section>
      )}

      <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-5">
        <p className="mb-3 text-xs font-bold uppercase tracking-widest" style={{ color: c.primary }}>
          Front Office Tendencies
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <IdentityCard label="Draft" value={identity.draft} />
          <IdentityCard label="Free Agency" value={identity.freeAgency} />
          <IdentityCard label="Trades" value={identity.trade} />
          <IdentityCard label="In-Game Strategy" value={identity.strategy} />
        </div>
      </section>
    </div>
  )
}
