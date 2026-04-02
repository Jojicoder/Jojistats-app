import { useState } from "react"

type TeamSetupPageProps = {
  teamName: string
  seasonYear: number
  onChangeTeamName: (name: string) => void
  onChangeSeasonYear: (year: number) => void
}

// Team Setup page is focused on team-level information only.
// Player management is intentionally handled in the separate Roster page.
export default function TeamSetupPage({
  teamName,
  seasonYear,
  onChangeTeamName,
  onChangeSeasonYear,
}: TeamSetupPageProps) {
  const [saveMessage, setSaveMessage] = useState("")

  const handleSave = () => {
    setSaveMessage("Team settings saved.")
  }

  return (
    <main className="flex-1 p-6 bg-gray-50">
      <div className="bg-white rounded-xl p-6 shadow-sm">
        <p className="text-sm font-medium text-green-900">Team Setup</p>
        <h1 className="text-2xl font-bold mt-2">Set up your team</h1>
        <p className="text-gray-600 mt-2">
          Configure the team first, then manage players in the Roster tab.
        </p>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm mt-6">
        <h2 className="text-lg font-semibold mb-4">Team Information</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600">
              Team Name
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => {
                onChangeTeamName(e.target.value)
                setSaveMessage("")
              }}
              placeholder="e.g. Brooklyn Waves"
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-600">
              Season Year
            </label>
            <input
              type="number"
              value={seasonYear}
              onChange={(e) => {
                onChangeSeasonYear(Number(e.target.value))
                setSaveMessage("")
              }}
              className="rounded-lg border border-gray-200 px-3 py-2"
            />
          </div>
        </div>

        {saveMessage && (
          <p className="mt-4 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
            {saveMessage}
          </p>
        )}

        <button
          onClick={handleSave}
          className="mt-6 bg-green-900 text-white px-5 py-2 rounded-xl font-medium"
        >
          Save Team Settings
        </button>
      </div>
    </main>
  )
}