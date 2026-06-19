import { Link } from "react-router-dom"
import type { MLBGameLiveFeed, MLBPlay } from "./types"
import { teamLogoUrl } from "./MLBGameDetailsUtils"

export function Scoreboard({
  feed,
  selectedInning,
  selectedHalf,
  onSelectHalfInning,
}: {
  feed: MLBGameLiveFeed
  selectedInning: number | null
  selectedHalf: "top" | "bottom" | null
  onSelectHalfInning: (inning: number, half: "top" | "bottom") => void
}) {
  const linescore = feed.liveData?.linescore
  const innings = linescore?.innings ?? []
  const allPlays = feed.liveData?.plays?.allPlays ?? []
  const inningNumbers = innings.length > 0
    ? innings.map((inning) => inning.num ?? 0)
    : Array.from({ length: 9 }, (_, index) => index + 1)

  function hasPlaysForHalf(inning: number, half: "top" | "bottom") {
    return allPlays.some(
      (play: MLBPlay) => play.about?.inning === inning && play.about?.halfInning === half
    )
  }

  return (
    <div className="overflow-x-auto rounded-xl bg-gray-50 ring-1 ring-gray-100">
      <table className="w-full min-w-155 text-center text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-[10px] uppercase tracking-widest text-gray-400">
            <th className="px-3 py-2.5 text-left">Team</th>
            {inningNumbers.map((inning) => (
              <th key={inning} className="px-2 py-2.5 font-bold">
                {inning}
              </th>
            ))}
            <th className="border-l border-gray-200 px-3 py-2.5 font-extrabold text-gray-600">R</th>
            <th className="px-3 py-2.5 font-bold">H</th>
            <th className="px-3 py-2.5 font-bold">E</th>
          </tr>
        </thead>
        <tbody>
          {(["away", "home"] as const).map((side, sideIndex) => {
            const team = feed.gameData?.teams?.[side]
            const total = linescore?.teams?.[side]
            const half = side === "away" ? "top" : "bottom"
            const isWinner = (side === "away" && (total?.runs ?? 0) > (linescore?.teams?.home?.runs ?? 0)) ||
                             (side === "home" && (total?.runs ?? 0) > (linescore?.teams?.away?.runs ?? 0))
            const isFinal = feed.gameData?.status?.abstractGameState === "Final"
            return (
              <tr key={side} className={`font-bold text-gray-800 ${sideIndex === 0 ? "" : "border-t border-gray-200"}`}>
                <td className="px-3 py-3 text-left">
                  <Link
                    to={team?.id ? `/mlb/teams/${team.id}` : "#"}
                    className="flex items-center gap-2 rounded-lg transition hover:opacity-75"
                  >
                    {team?.id && (
                      <img src={teamLogoUrl(team.id)} alt="" className="h-6 w-6 object-contain" />
                    )}
                    <span className="max-w-36 truncate text-sm font-bold text-gray-900">{team?.name ?? side}</span>
                    {isFinal && isWinner && (
                      <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-emerald-700">W</span>
                    )}
                  </Link>
                </td>
                {inningNumbers.map((inning) => {
                  const inningData = innings.find((entry) => entry.num === inning)?.[side]
                  const isSelected = selectedInning === inning && selectedHalf === half
                  const hasData = hasPlaysForHalf(inning, half)
                  return (
                    <td key={inning} className="px-1 py-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectHalfInning(inning, half)}
                        disabled={!hasData}
                        aria-label={`View ${half} of inning ${inning} play-by-play`}
                        className={`h-8 min-w-8 rounded-lg px-2 text-sm font-bold transition ${
                          isSelected
                            ? "bg-green-600 text-white shadow-sm"
                            : hasData
                            ? "text-gray-700 hover:bg-white hover:shadow-sm"
                            : "cursor-not-allowed text-gray-300"
                        }`}
                      >
                        {inningData?.runs ?? "–"}
                      </button>
                    </td>
                  )
                })}
                <td className="border-l border-gray-200 px-3 py-3 text-lg font-extrabold text-gray-900">{total?.runs ?? 0}</td>
                <td className="px-3 py-3 text-gray-600">{total?.hits ?? 0}</td>
                <td className="px-3 py-3 text-gray-400">{total?.errors ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
