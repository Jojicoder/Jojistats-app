import type { Team, Player, SavedBattingGameEntry, Position } from "./types"

export const demoTeams: Team[] = [
  {
    id: "team-1",
    name: "My Team",
    isArchived: false,
  },
]

export const demoPlayers: Player[] = [
  {
    id: "player-1",
    teamId: "team-1",
    name: "Joji",
    position: "UTIL",
    jerseyNumber: 7,
    isActive: true,
  },
  {
    id: "player-2",
    teamId: "team-1",
    name: "Ken",
    position: "CF",
    jerseyNumber: 1,
    isActive: true,
  },
  {
    id: "player-3",
    teamId: "team-1",
    name: "Mike",
    position: "SS",
    jerseyNumber: 10,
    isActive: true,
  },
  {
    id: "player-4",
    teamId: "team-1",
    name: "Taro",
    position: "1B",
    jerseyNumber: 3,
    isActive: true,
  },
  {
    id: "player-5",
    teamId: "team-1",
    name: "Ryo",
    position: "3B",
    jerseyNumber: 5,
    isActive: true,
  },
  {
    id: "player-6",
    teamId: "team-1",
    name: "Shun",
    position: "LF",
    jerseyNumber: 8,
    isActive: true,
  },
  {
    id: "player-7",
    teamId: "team-1",
    name: "Daiki",
    position: "RF",
    jerseyNumber: 9,
    isActive: true,
  },
  {
    id: "player-8",
    teamId: "team-1",
    name: "Yuta",
    position: "C",
    jerseyNumber: 2,
    isActive: true,
  },
  {
    id: "player-9",
    teamId: "team-1",
    name: "Sota",
    position: "P",
    jerseyNumber: 11,
    isActive: true,
  },
  {
    id: "player-10",
    teamId: "team-1",
    name: "Kaito",
    position: "2B",
    jerseyNumber: 4,
    isActive: true,
  },
]

const gameMetas = [
  { date: "2026-04-01", opponent: "Tigers", seasonYear: 2026, matchNumber: 1 },
  { date: "2026-04-03", opponent: "Lions", seasonYear: 2026, matchNumber: 2 },
  { date: "2026-04-05", opponent: "Bears", seasonYear: 2026, matchNumber: 3 },
  { date: "2026-04-08", opponent: "Hawks", seasonYear: 2026, matchNumber: 4 },
  { date: "2026-04-10", opponent: "Sharks", seasonYear: 2026, matchNumber: 5 },
  { date: "2026-04-12", opponent: "Falcons", seasonYear: 2026, matchNumber: 6 },
  { date: "2026-04-15", opponent: "Eagles", seasonYear: 2026, matchNumber: 7 },
  { date: "2026-04-18", opponent: "Panthers", seasonYear: 2026, matchNumber: 8 },
  { date: "2026-04-20", opponent: "Wolves", seasonYear: 2026, matchNumber: 9 },
  { date: "2026-04-22", opponent: "Dragons", seasonYear: 2026, matchNumber: 10 },
] as const

type StatLineTuple = [number, number, number, number, number, number, number, number]
// AB, H, 2B, 3B, HR, RBI, BB, SO

function makeEntries(
  playerId: string,
  teamId: string,
  positions: Position[],
  lines: StatLineTuple[]
): SavedBattingGameEntry[] {
  return lines.map((line, index) => {
    const [AB, H, doubles, triples, HR, RBI, BB, SO] = line
    return {
      id: `entry-${playerId}-${index + 1}`,
      teamId,
      gameMeta: gameMetas[index],
      gamePosition: positions[index],
      statLine: {
        AB,
        H,
        doubles,
        triples,
        HR,
        RBI,
        BB,
        SO,
      },
    }
  })
}

export const demoSavedEntriesByPlayer: Record<string, SavedBattingGameEntry[]> = {
  "player-1": makeEntries(
    "player-1",
    "team-1",
    ["LF", "2B", "SS", "2B", "DH", "LF", "3B", "SS", "2B", "DH"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 2, 0, 0, 0, 1, 0, 1],
      [5, 3, 1, 0, 0, 2, 0, 0],
      [4, 1, 0, 0, 0, 1, 1, 0],
    ]
  ),

  "player-2": makeEntries(
    "player-2",
    "team-1",
    ["CF", "CF", "CF", "CF", "CF", "CF", "CF", "CF", "CF", "CF"],
    [
      [4, 1, 0, 0, 0, 0, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 0, 0, 0, 1, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 1, 0, 1, 0, 1],
      [5, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 1],
    ]
  ),

  "player-3": makeEntries(
    "player-3",
    "team-1",
    ["SS", "SS", "SS", "SS", "SS", "SS", "SS", "SS", "SS", "SS"],
    [
      [4, 1, 0, 0, 0, 1, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 1, 1, 0, 0, 1, 0, 2],
      [4, 2, 1, 0, 0, 1, 1, 0],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [5, 2, 1, 0, 0, 1, 0, 0],
      [4, 2, 0, 1, 0, 1, 1, 1],
      [4, 1, 0, 0, 0, 0, 0, 1],
    ]
  ),

  "player-4": makeEntries(
    "player-4",
    "team-1",
    ["1B", "1B", "1B", "1B", "1B", "1B", "1B", "1B", "1B", "1B"],
    [
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 0, 0, 0, 1, 1, 0],
      [4, 0, 0, 0, 0, 0, 0, 2],
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
      [4, 1, 1, 0, 0, 1, 1, 1],
      [5, 1, 0, 0, 0, 0, 0, 1],
      [4, 2, 1, 0, 1, 3, 0, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
    ]
  ),

  "player-5": makeEntries(
    "player-5",
    "team-1",
    ["3B", "3B", "3B", "3B", "3B", "3B", "3B", "3B", "3B", "3B"],
    [
      [4, 1, 0, 0, 0, 1, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 0, 0, 0, 0, 0, 1, 2],
    ]
  ),

  "player-6": makeEntries(
    "player-6",
    "team-1",
    ["LF", "LF", "LF", "LF", "LF", "LF", "LF", "LF", "LF", "LF"],
    [
      [4, 1, 0, 0, 0, 0, 0, 2],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 1, 1, 1],
      [4, 0, 0, 0, 0, 0, 0, 2],
      [4, 2, 1, 0, 1, 2, 0, 0],
      [4, 2, 0, 1, 0, 1, 1, 0],
      [4, 1, 0, 0, 0, 0, 0, 1],
      [5, 2, 1, 0, 0, 1, 0, 1],
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 1, 0, 0, 1, 1, 0],
    ]
  ),

  "player-7": makeEntries(
    "player-7",
    "team-1",
    ["RF", "RF", "RF", "RF", "RF", "RF", "RF", "RF", "RF", "RF"],
    [
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 1, 1, 0, 0, 0, 1, 0],
      [4, 0, 0, 0, 0, 0, 0, 2],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 1, 1, 0],
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
    ]
  ),

  "player-8": makeEntries(
    "player-8",
    "team-1",
    ["C", "C", "C", "C", "C", "C", "C", "C", "C", "C"],
    [
      [3, 1, 0, 0, 0, 1, 1, 1],
      [3, 0, 0, 0, 0, 0, 1, 1],
      [3, 1, 0, 0, 0, 1, 0, 1],
      [4, 1, 1, 0, 0, 1, 0, 0],
      [3, 0, 0, 0, 0, 0, 1, 1],
      [3, 1, 0, 0, 0, 0, 1, 0],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [3, 1, 0, 0, 0, 1, 1, 0],
      [4, 1, 1, 0, 0, 1, 0, 1],
      [3, 0, 0, 0, 0, 0, 1, 1],
    ]
  ),

  "player-9": makeEntries(
    "player-9",
    "team-1",
    ["P", "P", "P", "P", "P", "P", "P", "P", "P", "P"],
    [
      [2, 1, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 1, 0, 0],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 0, 0, 0],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 1, 0, 0],
      [2, 0, 0, 0, 0, 0, 1, 1],
    ]
  ),

  "player-10": makeEntries(
    "player-10",
    "team-1",
    ["2B", "2B", "2B", "2B", "2B", "2B", "2B", "2B", "2B", "2B"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 2, 0, 1, 0, 1, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
      [4, 1, 0, 0, 0, 0, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 1, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 1],
    ]
  ),
}