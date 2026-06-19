import type { BattingEntryData, PitchingEntryData, Position } from "../types"
import type { BasesState, LivePlayResult, LivePitchResult } from "./RecordGamePage.types"

export const emptyBases: BasesState = {
  first: false,
  second: false,
  third: false,
}

export const gamePositionOptions: Position[] = [
  "P","C","1B","2B","3B","SS","LF","CF","RF","DH","UTIL",
]

export const liveResultLabels: { result: LivePlayResult; label: string }[] = [
  { result: "1B", label: "Single" },
  { result: "2B", label: "Double" },
  { result: "3B", label: "Triple" },
  { result: "HR", label: "HR" },
  { result: "BB", label: "Walk" },
  { result: "HBP", label: "Hit By Pitch" },
  { result: "SF", label: "Sac Fly" },
  { result: "SO", label: "Strikeout" },
  { result: "OUT", label: "Out" },
  { result: "E", label: "Error" },
  { result: "FC", label: "FC Safe" },
  { result: "FC_OUT_2B", label: "FC Out (2B)" },
  { result: "FC_OUT_3B", label: "FC Out (3B)" },
]

export const livePitchResultLabels: { result: LivePitchResult; label: string }[] = [
  { result: "OUT", label: "Out" },
  { result: "SO", label: "Strikeout" },
  { result: "BB", label: "Walk" },
  { result: "HBP", label: "Hit By Pitch" },
  { result: "HR", label: "HR Allowed" },
]

export function createEmptyBattingLine(): BattingEntryData {
  return {
    AB: 0, H: 0, doubles: 0, triples: 0, HR: 0, RBI: 0,
    BB: 0, HBP: 0, SF: 0, SO: 0, SB: 0, CS: 0, note: "",
  }
}

export function createEmptyPitchingLine(): PitchingEntryData {
  return {
    inningsPitchedOuts: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walks: 0,
    hitBatters: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    note: "",
  }
}
