import { useState } from "react"

type HeaderProps = {
  teamName: string
  onOpenTeamSetup: () => void
}

export default function Header({ teamName, onOpenTeamSetup }: HeaderProps) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  const openTeamSetup = () => {
    onOpenTeamSetup()
    setIsSettingsOpen(false)
    setIsProfileOpen(false)
  }

  return (
    <header className="border-b border-gray-200 bg-white px-3 py-2 sm:px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <img
            src="/logo.png"
            alt="JojiStats logo"
            className="h-12 w-12 shrink-0 rounded-full object-cover sm:h-16 sm:w-16"
          />

          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-tight text-green-900 sm:text-4xl">
              JOJISTATS
            </h1>
            <p className="mt-1 truncate text-xs text-gray-500 sm:text-sm">
              Team: {teamName}
            </p>
          </div>
        </div>

        <div className="relative flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            aria-label="Settings"
            onClick={() => {
              setIsSettingsOpen((prev) => !prev)
              setIsProfileOpen(false)
            }}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-3xl text-gray-700 hover:bg-gray-50 sm:h-11 sm:w-11 sm:text-4xl"
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
            className="flex h-10 w-10 items-center justify-center rounded-full bg-green-900 text-sm font-bold text-white sm:h-11 sm:w-11"
          >
            J
          </button>

          {isSettingsOpen && (
            <div className="absolute right-11 top-12 z-20 w-52 rounded-xl border border-gray-200 bg-white p-2 shadow-lg sm:right-14 sm:top-14">
              <button
                type="button"
                className="w-full rounded-lg px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
              >
                Account Settings
              </button>

              <button
                type="button"
                onClick={openTeamSetup}
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
            <div className="absolute right-0 top-12 z-20 w-56 rounded-xl border border-gray-200 bg-white p-3 shadow-lg sm:top-14">
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
                  onClick={openTeamSetup}
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
