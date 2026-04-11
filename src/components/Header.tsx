import { useState } from "react"

type HeaderProps = {
  teamName: string
}

export default function Header({ teamName }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  return (
    <header className="border-b border-gray-200 bg-white px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="JojiStats logo"
            className="h-16 w-16 rounded-full object-cover"
          />

          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-green-900">
              JOJISTATS
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Team: {teamName}
            </p>
          </div>
        </div>

        <div className="relative flex items-center gap-3">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => {
              setIsSettingsOpen((prev) => !prev)
              setIsProfileOpen(false)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 text-4xl text-gray-700 hover:bg-gray-50"
          >
            ⚙
          </button>

          <button
            type="button"
            aria-label="User profile"
            onClick={() => {
              setIsProfileOpen((prev) => !prev)
              setIsSettingsOpen(false)
            }}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-white"
          >
            J
          </button>

          {isSettingsOpen && (
            <div className="absolute right-14 top-14 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Account Settings
              </button>

              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Team Preferences
              </button>

              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
              >
                Log Out
              </button>
            </div>
          )}

          {isProfileOpen && (
            <div className="absolute right-0 top-14 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg">
              <div className="border-b border-gray-100 pb-3">
                <p className="text-sm font-semibold text-gray-800">Joji</p>
                <p className="mt-1 text-xs text-gray-500">
                  joji@example.com
                </p>
              </div>

              <div className="mt-3 flex flex-col gap-1">
                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  Profile
                </button>

                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                >
                  My Teams
                </button>

                <button
                  type="button"
                  className="w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}