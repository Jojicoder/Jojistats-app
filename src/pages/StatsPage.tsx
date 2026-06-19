import { useMemo } from "react"
import PageShell from "../components/PageShell"
import MyTeamPage from "../components/MyTeamPage"
import type { TabItem } from "../components/TopTabs"

import MyStatsPage from "../components/MyStatsPage"
import MyPitchingStatsPage from "../components/MyPitchingStatsPage"
import RecordGameContainer from "../components/RecordGameContainer"
import TeamSetupPage from "../components/TeamSetupPage"
import SeasonArchivePage from "./SeasonArchivePage"
import { JUNKS_THEME_STYLE } from "../components/teamTheme"
import Sidebar from "../components/Sidebar"

import { useGameStats } from "../hooks/useGameStats"
import { useStatsPageLoader } from "../hooks/useStatsPageLoader"

import type { DisplayStat } from "../types"

export default function StatsPage() {
  const {
    teams,
    players,
    activeTeamId,
    activePlayerId,
    setActivePlayerId,
    savedEntriesByPlayer,
    pitchingEntriesByPlayer,
    mode,
    setMode,
    isRestrictedUser: _isRestrictedUser,
    userRole,
    accessStatus,
    view,
    setView,
    setupSeasonYear,
    setupActivePlayerId,
    setSetupActivePlayerId,
    isLoading,
    errorMessage,
    activeTeam,
    activePlayer,
    useJunksTheme,
    savedEntries,
    allTeamEntries,
    handleChangeTeam,
    handleSetupChangeSeason,
    handleSetupAddPlayer,
    handleSetupUpdatePlayer,
    handleSetupDeletePlayer,
  } = useStatsPageLoader()

  /* -------------------- stats -------------------- */

  const savedStatLines = useMemo(
    () => savedEntries.map((entry) => entry.statLine),
    [savedEntries]
  )

  const { kpi } = useGameStats(savedStatLines)

  const calculatedStats: DisplayStat[] = [
    { label: "AVG", value: kpi.avg },
    { label: "OBP", value: kpi.obp },
    { label: "OPS", value: kpi.ops },
    { label: "BB/K", value: kpi.bbPerK },
    { label: "HR", value: String(kpi.hr) },
    { label: "RBI", value: String(kpi.rbi) },
    { label: "HBP", value: String(kpi.hbp) },
    { label: "SB", value: String(kpi.sb) },
    { label: "CS", value: String(kpi.cs) },
    { label: "SB%", value: kpi.sbPct },
  ]

  const tabs: TabItem[] = useMemo(() => {
    if (userRole === "manager") {
      return [
        { label: "My Stats", view: "stats" },
        { label: "Team Stats", view: "myteam" },
        { label: "Record Game", view: "record" },
        { label: "Team Setup", view: "setup" },
        { label: "Team Manager", href: "/manager" },
        { label: "Archive", view: "archive" },
      ]
    }
    if (userRole === "recorder") {
      return [
        { label: "My Stats", view: "stats" },
        { label: "My Team", view: "myteam" },
        { label: "Record Game", view: "record" },
        { label: "Archive", view: "archive" },
      ]
    }
    return [
      { label: "My Stats", view: "stats" },
      { label: "My Team", view: "myteam" },
      { label: "Archive", view: "archive" },
    ]
  }, [userRole])

  /* -------------------- UI -------------------- */

  return (
    <PageShell
      variant={useJunksTheme ? "team" : "default"}
      style={useJunksTheme ? JUNKS_THEME_STYLE : undefined}
      headerProps={{
        teamName: activeTeam?.name ?? "No Team",
        teams: teams.map((team) => team.name),
        onChangeTeam: (teamName) => {
          const team = teams.find((t) => t.name === teamName)
          if (team) handleChangeTeam(team.id)
        },
        accessRole: userRole,
        showAwaitingAccessLink: accessStatus === "awaiting",
      }}
      activeView={view}
      onChangeView={(nextView) =>
        setView(nextView as "stats" | "myteam" | "record" | "setup" | "archive")
      }
      tabs={tabs}
      contentClassName="mx-auto flex w-full max-w-screen-2xl flex-1 flex-col items-stretch gap-3 p-3 lg:flex-row lg:items-start lg:p-4"
    >
      {view === "archive" ? (
        <SeasonArchivePage embedded />
      ) : isLoading ? (
        <div>Loading...</div>
      ) : errorMessage ? (
        <div className="text-red-600">{errorMessage}</div>
      ) : view === "record" && activePlayer && activeTeam ? (
        <RecordGameContainer
          initialPlayer={activePlayer}
          allPlayers={players}
          teamName={activeTeam.name}
          teamId={Number(activeTeamId)}
          seasonYear={activeTeam.currentSeasonYear}
          initialSavedEntriesByPlayer={savedEntriesByPlayer}
          initialPitchingEntriesByPlayer={pitchingEntriesByPlayer}
        />
      ) : view === "setup" && activeTeam ? (
        <TeamSetupPage
          teams={teams}
          activeTeamId={activeTeamId}
          setActiveTeamId={() => {}}
          teamName={activeTeam.name}
          seasonYear={setupSeasonYear}
          players={players}
          activePlayerId={setupActivePlayerId || activePlayerId}
          setActivePlayerId={setSetupActivePlayerId}
          savedEntriesByPlayer={savedEntriesByPlayer}
          onAddTeam={() => {}}
          onUpdateTeamName={() => {}}
          onArchiveTeam={() => {}}
          onAddPlayer={handleSetupAddPlayer}
          onUpdatePlayer={handleSetupUpdatePlayer}
          onDeletePlayer={handleSetupDeletePlayer}
          onChangeSeason={handleSetupChangeSeason}
          hideTeamManagement={true}
        />
      ) : view === "myteam" ? (
        <MyTeamPage
          team={activeTeam}
          players={players}
          savedEntriesByPlayer={savedEntriesByPlayer}
          pitchingEntriesByPlayer={pitchingEntriesByPlayer}
        />
      ) : activePlayer ? (
        <>
          <Sidebar
            players={players}
            activePlayerId={activePlayer.id}
            setActivePlayerId={setActivePlayerId}
            savedEntriesByPlayer={savedEntriesByPlayer}
            pitchingEntriesByPlayer={pitchingEntriesByPlayer}
            mode={mode}
          />

          <div className="min-w-0 flex-1">
            {mode === "batting" ? (
              <MyStatsPage
                activePlayer={activePlayer}
                calculatedStats={calculatedStats}
                savedEntries={savedEntries}
                pitchingEntries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
                teamSavedEntries={allTeamEntries}
                seasonYear={activeTeam?.currentSeasonYear ?? 0}
                league={activeTeam?.league ?? null}
                mode={mode}
                onModeChange={setMode}
              />
            ) : (
              <MyPitchingStatsPage
                activePlayer={activePlayer}
                entries={pitchingEntriesByPlayer[activePlayer.id] ?? []}
                teamEntries={Object.values(pitchingEntriesByPlayer).flat()}
                battingEntries={savedEntries}
                league={activeTeam?.league ?? null}
                mode={mode}
                onModeChange={setMode}
              />
            )}
          </div>
        </>
      ) : (
        <div>No player found</div>
      )}
    </PageShell>
  )
}
