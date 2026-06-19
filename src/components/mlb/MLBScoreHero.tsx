import { Link } from "react-router-dom"
import type { MLBGameLiveFeed } from "./types"
import { teamLogoUrl } from "./MLBGameDetailsUtils"

export function ScoreHero({ feed, liveStatus, finalStatus }: {
  feed: MLBGameLiveFeed
  liveStatus: boolean
  finalStatus: boolean
}) {
  const linescore = feed.liveData?.linescore
  const away = feed.gameData?.teams?.away
  const home = feed.gameData?.teams?.home
  const awayScore = linescore?.teams?.away?.runs ?? 0
  const homeScore = linescore?.teams?.home?.runs ?? 0
  const awayWinning = finalStatus && awayScore > homeScore
  const homeWinning = finalStatus && homeScore > awayScore

  return (
    <div className="flex items-center justify-between gap-2 py-1">
      {/* Away team */}
      <Link
        to={away?.id ? `/mlb/teams/${away.id}` : "#"}
        className={`flex min-w-0 flex-1 items-center gap-2 rounded-xl p-1 transition hover:bg-gray-50 ${finalStatus && !awayWinning ? "opacity-55" : ""}`}
      >
        {away?.id && (
          <img
            src={teamLogoUrl(away.id)}
            alt={away.name}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-gray-800">{away?.teamName ?? away?.name ?? "Away"}</p>
          <p className="text-[10px] text-gray-400">{away?.abbreviation ?? "AWY"}</p>
        </div>
      </Link>

      {/* Score */}
      <div className="flex shrink-0 flex-col items-center gap-0.5">
        <div className="flex items-center gap-2.5">
          <span className={`text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl ${
            finalStatus && awayWinning ? "text-gray-900" : finalStatus && !awayWinning ? "text-gray-400" : "text-gray-900"
          }`}>
            {awayScore}
          </span>
          <span className="text-lg font-light text-gray-300">–</span>
          <span className={`text-3xl font-extrabold tabular-nums tracking-tight sm:text-4xl ${
            finalStatus && homeWinning ? "text-gray-900" : finalStatus && !homeWinning ? "text-gray-400" : "text-gray-900"
          }`}>
            {homeScore}
          </span>
        </div>
        {liveStatus && (
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span className="text-xs font-bold text-emerald-600">
              {linescore?.inningHalf ?? ""} {linescore?.currentInningOrdinal ?? ""}
            </span>
          </div>
        )}
        {finalStatus && (
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Final</span>
        )}
        {!liveStatus && !finalStatus && (
          <span className="text-[10px] font-semibold text-blue-600">{feed.gameData?.status?.detailedState ?? ""}</span>
        )}
      </div>

      {/* Home team */}
      <Link
        to={home?.id ? `/mlb/teams/${home.id}` : "#"}
        className={`flex min-w-0 flex-1 flex-row-reverse items-center gap-2 rounded-xl p-1 transition hover:bg-gray-50 ${finalStatus && !homeWinning ? "opacity-55" : ""}`}
      >
        {home?.id && (
          <img
            src={teamLogoUrl(home.id)}
            alt={home.name}
            className="h-10 w-10 shrink-0 object-contain sm:h-12 sm:w-12"
          />
        )}
        <div className="min-w-0 text-right">
          <p className="truncate text-sm font-bold text-gray-800">{home?.teamName ?? home?.name ?? "Home"}</p>
          <p className="text-[10px] text-gray-400">{home?.abbreviation ?? "HME"}</p>
        </div>
      </Link>
    </div>
  )
}
