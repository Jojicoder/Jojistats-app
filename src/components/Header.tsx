type HeaderProps = {
  teamName: string
}

export default function Header({ teamName }: HeaderProps) {
  return (
    <header className="border-b border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">JojiStats</h1>
          <p className="mt-1 text-sm text-gray-500">
            Current Team: {teamName}
          </p>
        </div>
      </div>
    </header>
  )
}