import { useMemo, useState } from "react"
import type { Team, Player, SavedBattingGameEntry } from "../types"
import PlayerForm from "./PlayerForm"

type RosterSortKey =
  | "jersey"
  | "name"
  | "position"
  | "games"
  | "pa"
  | "avg"
  | "ops"
  | "hr"
  | "rbi"

type TeamSetupPageProps = {
  teams: Team[]
  activeTeamId: string | null
  setActiveTeamId: (teamId: string) => void
  onAddTeam: (name: string) => void
  onUpdateTeamName: (teamId: string, name: string) => void
  onArchiveTeam: (teamId: string) => void
  onStartNewSeason: () => void
  teamName: string
  seasonYear: number
  players: Player[]
  activePlayerId: string | null
  setActivePlayerId: (playerId: string) => void
  onAddPlayer: (player: Player) => void
  onUpdatePlayer: (player: Player) => void
  onDeletePlayer: (playerId: string) => void
  savedEntriesByPlayer: Record<string, SavedBattingGameEntry[]>
}

// ここは今の getPlayerTotals / getPlayerMetrics / formatRate をそのまま使ってOK

export default function TeamSetupPage({
  teams,
  activeTeamId,
  setActiveTeamId,
  onAddTeam,
  onUpdateTeamName,
  onArchiveTeam,
  onStartNewSeason,
  teamName,
  seasonYear,
  players,
  activePlayerId,
  setActivePlayerId,
  savedEntriesByPlayer,
  onAddPlayer,
  onUpdatePlayer,
  onDeletePlayer,
}: TeamSetupPageProps) {
  // 今の state / useMemo はそのまま

  // 省略せず使うなら、あなたの今の TeamSetupPage に
  // 下のボタンだけ足せばOK

  return (
    <main className="w-full">
      <div className="w-full space-y-6">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-green-900">Team Setup</p>
          <h1 className="mt-2 text-2xl font-bold">Manage team and roster</h1>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              Current Season: {seasonYear}
            </div>

            <button
              type="button"
              onClick={onStartNewSeason}
              className="rounded-lg bg-green-900 px-4 py-2 text-sm font-medium text-white"
            >
              Start {seasonYear + 1} Season
            </button>
          </div>
        </div>

        {/* 下は今の TeamSetupPage の中身をそのまま残してOK */}
      </div>
    </main>
  )
}