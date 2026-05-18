import type {
  Player,
  Position,
  BattingEntryData,
  PitchingEntryData,
  DraftGameMeta,
  SavedBattingGameEntry,
  SavedPitchingGameEntry,
  PendingBattingEntry,
  PendingPitchingEntry,
} from "../types"

export type SavedGameSummary = {
  id: number
  team_id: number
  game_date: string
  opponent_name: string
  season_year: number
  match_number: number
  location?: string | null
  memo?: string | null
  team_score?: number | null
  opponent_score?: number | null
  result?: "W" | "L" | "T" | string | null
}

export type RecordGamePageProps = {
  activePlayer: Player
  allPlayers: Player[]
  onSelectPlayer: (player: Player) => void
  showRosterPanel?: boolean
  currentEntry: BattingEntryData
  gameMeta: DraftGameMeta
  savedEntries: SavedBattingGameEntry[]
  savedPitchingEntries?: SavedPitchingGameEntry[]
  teamSavedEntries?: SavedBattingGameEntry[]
  teamSavedPitchingEntries?: SavedPitchingGameEntry[]
  savedGames?: SavedGameSummary[]
  onGameMetaChange: (nextMeta: DraftGameMeta) => void
  onEntryChange: (nextEntry: BattingEntryData) => void
  onSaveGame: (
    gameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries?: PendingPitchingEntry[]
  ) => Promise<void>
  teamName: string
  seasonYear: number
  isEditingSavedEntry: boolean
  isEditingSavedPitchingEntry?: boolean
  editingSavedEntryId: string | null
  onStartEditSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  onUpdateSavedEntry: (nextGameMeta: DraftGameMeta, nextStatLine: BattingEntryData, gamePositions?: Position[]) => void
  onUpdateSavedGame?: (
    nextGameMeta: DraftGameMeta,
    entries: PendingBattingEntry[],
    pitchingEntries?: PendingPitchingEntry[]
  ) => void | Promise<void>
  onUpdateSavedGameMeta?: (nextGameMeta: DraftGameMeta) => void
  onCancelEditSavedEntry: () => void
  onDeleteSavedEntry: (savedEntry: SavedBattingGameEntry) => void
  onDeleteSavedGame?: () => void | Promise<void>
  onStartEditSavedPitchingEntry?: (savedEntry: SavedPitchingGameEntry) => void
  onUpdateSavedPitchingEntry?: (
    nextGameMeta: DraftGameMeta,
    nextPitchingEntry: PitchingEntryData
  ) => void | Promise<void>
  onCancelEditSavedPitchingEntry?: () => void
  onDeleteSavedPitchingEntry?: (savedEntry: SavedPitchingGameEntry) => void | Promise<void>
  editingGamePositions?: Position[]
  recordMode: "batting" | "pitching"
  setRecordMode: (mode: "batting" | "pitching") => void
  pitchingEntry: PitchingEntryData
  onPitchingEntryChange: (nextEntry: PitchingEntryData) => void
  onSavePitchingGame: (entry?: PitchingEntryData, playerId?: string) => void | Promise<void>
  isPitchingSaveDisabled: boolean
  saveError?: string
  onClearSaveError?: () => void
  onGameModeChange?: (isGameMode: boolean) => void
}

export type GameHalf = "Top" | "Bottom"
export type LivePlayResult = "1B" | "2B" | "3B" | "HR" | "BB" | "HBP" | "SF" | "SO" | "OUT" | "E" | "FC" | "FC_OUT"
export type LiveGameTab = "batting" | "pitching"
export type InputStyle = "standard" | "game" | "edit"
export type EditGameTab = "batting" | "pitching"
export type LivePitchResult = "OUT" | "SO" | "BB" | "HBP" | "H" | "2B" | "3B" | "R" | "ER" | "HR" | "E"
export type BaseName = "first" | "second" | "third"
export type BasesState = {
  first: boolean
  second: boolean
  third: boolean
}

export type LivePitchingStats = {
  inningsPitchedOuts: number
  hitsAllowed: number
  runsAllowed: number
  earnedRuns: number
  walks: number
  hitBatters: number
  strikeouts: number
  homeRunsAllowed: number
}

export type LivePlay = {
  id: string
  playerId: string
  playerName: string
  result: LivePlayResult
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  rbi: number
  runs: number
  note: string
  statLine: BattingEntryData
}

export type LivePitchPlay = {
  id: string
  pitcherId: string
  pitcherName: string
  result: LivePitchResult
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  note: string
  scoredBase?: BaseName | null
}

export type QuickRbiValue = number | null

export type RunnerOutAction = {
  id: string
  inning: number
  half: GameHalf
  outsBefore: number
  basesBefore: BasesState
  tabBefore: LiveGameTab
}

export type RunnerRbiAction = {
  id: string
  half: GameHalf
  basesBefore: BasesState
  playBefore: LivePlay
}

export type RunnerRunAction = {
  id: string
  half: GameHalf
  basesBefore: BasesState
}

export type LiveInningSummary = {
  inning: number
  half: GameHalf
  batting: LivePlay[]
  pitching: LivePitchPlay[]
}
