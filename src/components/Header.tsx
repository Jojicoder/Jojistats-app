export default function Header(){
  return(
    <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
      <div className="text-2xl font-bold text-green-900">
        JojiStats
      </div>

      <nav className="flex gap-8 text-sm font-medium text-gray-600">
        <a href="#">Analytics</a>
        <a href="#">Roster</a>
        <a href="#">Scouting</a>
        <a href="#">Schedule</a>
      </nav>

      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-green-900 text-white flex items-center justify-center font-semibold">
          J
        </div>
      </div>
    </header>
  )
}
