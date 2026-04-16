import type { Team, Player, SavedBattingGameEntry, Position } from "./types"

export const demoTeams: Team[] = [
  {
    id: "team-1",
    name: "My Team",
    isArchived: false,
    currentSeasonYear: 2026,
  },
  {
    id: "team-2",
    name: "Ocean Stars",
    isArchived: false,
    currentSeasonYear: 2026,
  },
  {
    id: "team-3",
    name: "River Hawks",
    isArchived: false,
    currentSeasonYear: 2026,
  },
]

export const demoPlayers: Player[] = [
  {
    id: "player-1",
    teamId: "team-1",
    name: "Joji",
    position: "UTIL",
    jerseyNumber: 7,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-2",
    teamId: "team-1",
    name: "Ken",
    position: "CF",
    jerseyNumber: 1,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-3",
    teamId: "team-1",
    name: "Mike",
    position: "SS",
    jerseyNumber: 6,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-4",
    teamId: "team-1",
    name: "Taro",
    position: "1B",
    jerseyNumber: 3,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-5",
    teamId: "team-1",
    name: "Ryo",
    position: "3B",
    jerseyNumber: 5,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-6",
    teamId: "team-1",
    name: "Shun",
    position: "LF",
    jerseyNumber: 8,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-7",
    teamId: "team-1",
    name: "Daiki",
    position: "RF",
    jerseyNumber: 9,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-8",
    teamId: "team-1",
    name: "Yuta",
    position: "C",
    jerseyNumber: 2,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-9",
    teamId: "team-1",
    name: "Sota",
    position: "P",
    jerseyNumber: 11,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-10",
    teamId: "team-1",
    name: "Kaito",
    position: "2B",
    jerseyNumber: 4,
    seasonYear: 2026,
    isArchived: false,
  },

  {
    id: "player-11",
    teamId: "team-2",
    name: "Haruto",
    position: "CF",
    jerseyNumber: 1,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-12",
    teamId: "team-2",
    name: "Ren",
    position: "2B",
    jerseyNumber: 4,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-13",
    teamId: "team-2",
    name: "Yuki",
    position: "SS",
    jerseyNumber: 6,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-14",
    teamId: "team-2",
    name: "Takumi",
    position: "1B",
    jerseyNumber: 3,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-15",
    teamId: "team-2",
    name: "Kosei",
    position: "3B",
    jerseyNumber: 5,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-16",
    teamId: "team-2",
    name: "Taiga",
    position: "LF",
    jerseyNumber: 8,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-17",
    teamId: "team-2",
    name: "Ryota",
    position: "RF",
    jerseyNumber: 9,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-18",
    teamId: "team-2",
    name: "Naoki",
    position: "C",
    jerseyNumber: 2,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-19",
    teamId: "team-2",
    name: "Kazuma",
    position: "P",
    jerseyNumber: 18,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-20",
    teamId: "team-2",
    name: "Sena",
    position: "UTIL",
    jerseyNumber: 10,
    seasonYear: 2026,
    isArchived: false,
  },

  {
    id: "player-21",
    teamId: "team-3",
    name: "Aoi",
    position: "CF",
    jerseyNumber: 7,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-22",
    teamId: "team-3",
    name: "Minato",
    position: "2B",
    jerseyNumber: 4,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-23",
    teamId: "team-3",
    name: "Itsuki",
    position: "SS",
    jerseyNumber: 6,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-24",
    teamId: "team-3",
    name: "Reo",
    position: "1B",
    jerseyNumber: 25,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-25",
    teamId: "team-3",
    name: "Hinata",
    position: "3B",
    jerseyNumber: 5,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-26",
    teamId: "team-3",
    name: "Soma",
    position: "LF",
    jerseyNumber: 24,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-27",
    teamId: "team-3",
    name: "Riku",
    position: "RF",
    jerseyNumber: 9,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-28",
    teamId: "team-3",
    name: "Koki",
    position: "C",
    jerseyNumber: 22,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-29",
    teamId: "team-3",
    name: "Hayate",
    position: "P",
    jerseyNumber: 17,
    seasonYear: 2026,
    isArchived: false,
  },
  {
    id: "player-30",
    teamId: "team-3",
    name: "Yuya",
    position: "DH",
    jerseyNumber: 13,
    seasonYear: 2026,
    isArchived: false,
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
      gamePositions: [positions[index]],
      statLine: {
        AB,
        H,
        doubles,
        triples,
        HR,
        RBI,
        BB,
        SO,
        note: "",
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

  "player-11": makeEntries(
    "player-11",
    "team-2",
    ["CF", "CF", "CF", "CF", "CF"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [5, 2, 0, 1, 0, 1, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 2, 0, 0],
    ]
  ),
  "player-12": makeEntries(
    "player-12",
    "team-2",
    ["2B", "2B", "2B", "2B", "2B"],
    [
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 1, 1, 0],
    ]
  ),
  "player-13": makeEntries(
    "player-13",
    "team-2",
    ["SS", "SS", "SS", "SS", "SS"],
    [
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
    ]
  ),
  "player-14": makeEntries(
    "player-14",
    "team-2",
    ["1B", "1B", "1B", "1B", "1B"],
    [
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 1, 3, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
    ]
  ),
  "player-15": makeEntries(
    "player-15",
    "team-2",
    ["3B", "3B", "3B", "3B", "3B"],
    [
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 0, 0, 1, 2, 0, 1],
    ]
  ),
  "player-16": makeEntries(
    "player-16",
    "team-2",
    ["LF", "LF", "LF", "LF", "LF"],
    [
      [4, 1, 0, 0, 0, 0, 0, 2],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 0, 0, 1, 2, 0, 0],
      [4, 1, 1, 0, 0, 1, 0, 1],
    ]
  ),
  "player-17": makeEntries(
    "player-17",
    "team-2",
    ["RF", "RF", "RF", "RF", "RF"],
    [
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
    ]
  ),
  "player-18": makeEntries(
    "player-18",
    "team-2",
    ["C", "C", "C", "C", "C"],
    [
      [3, 1, 0, 0, 0, 1, 1, 1],
      [3, 0, 0, 0, 0, 0, 1, 1],
      [4, 1, 1, 0, 0, 1, 0, 0],
      [3, 1, 0, 0, 0, 0, 1, 0],
      [4, 1, 0, 0, 1, 2, 0, 1],
    ]
  ),
  "player-19": makeEntries(
    "player-19",
    "team-2",
    ["P", "P", "P", "P", "P"],
    [
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 1, 0, 0],
      [2, 0, 0, 0, 0, 0, 1, 1],
    ]
  ),
  "player-20": makeEntries(
    "player-20",
    "team-2",
    ["UTIL", "UTIL", "UTIL", "UTIL", "UTIL"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 2, 0, 0, 1, 2, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 1, 1, 0, 0, 1, 0, 0],
    ]
  ),

  "player-21": makeEntries(
    "player-21",
    "team-3",
    ["CF", "CF", "CF", "CF", "CF"],
    [
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 2, 0, 1, 0, 1, 0, 0],
      [5, 1, 0, 0, 0, 0, 1, 1],
      [4, 3, 1, 0, 0, 2, 0, 0],
    ]
  ),
  "player-22": makeEntries(
    "player-22",
    "team-3",
    ["2B", "2B", "2B", "2B", "2B"],
    [
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 2, 0, 0, 0, 1, 1, 0],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
    ]
  ),
  "player-23": makeEntries(
    "player-23",
    "team-3",
    ["SS", "SS", "SS", "SS", "SS"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 0, 1, 0],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 1, 1, 1],
    ]
  ),
  "player-24": makeEntries(
    "player-24",
    "team-3",
    ["1B", "1B", "1B", "1B", "1B"],
    [
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 1, 0],
    ]
  ),
  "player-25": makeEntries(
    "player-25",
    "team-3",
    ["3B", "3B", "3B", "3B", "3B"],
    [
      [4, 1, 1, 0, 0, 1, 0, 1],
      [4, 2, 0, 0, 0, 1, 1, 0],
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
    ]
  ),
  "player-26": makeEntries(
    "player-26",
    "team-3",
    ["LF", "LF", "LF", "LF", "LF"],
    [
      [4, 1, 0, 0, 0, 0, 0, 2],
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 0, 1, 1, 1],
      [4, 2, 0, 0, 1, 2, 0, 0],
      [4, 1, 1, 0, 0, 1, 0, 1],
    ]
  ),
  "player-27": makeEntries(
    "player-27",
    "team-3",
    ["RF", "RF", "RF", "RF", "RF"],
    [
      [4, 0, 0, 0, 0, 0, 1, 2],
      [4, 1, 0, 0, 0, 0, 1, 1],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 0, 1, 1],
    ]
  ),
  "player-28": makeEntries(
    "player-28",
    "team-3",
    ["C", "C", "C", "C", "C"],
    [
      [3, 1, 0, 0, 0, 1, 1, 1],
      [3, 0, 0, 0, 0, 0, 1, 1],
      [4, 1, 1, 0, 0, 1, 0, 0],
      [3, 1, 0, 0, 0, 0, 1, 0],
      [4, 0, 0, 0, 0, 0, 1, 1],
    ]
  ),
  "player-29": makeEntries(
    "player-29",
    "team-3",
    ["P", "P", "P", "P", "P"],
    [
      [2, 1, 0, 0, 0, 0, 0, 1],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 1, 0, 0],
      [2, 0, 0, 0, 0, 0, 1, 1],
      [2, 1, 0, 0, 0, 0, 0, 1],
    ]
  ),
  "player-30": makeEntries(
    "player-30",
    "team-3",
    ["DH", "DH", "DH", "DH", "DH"],
    [
      [4, 2, 1, 0, 0, 1, 0, 1],
      [4, 1, 0, 0, 1, 2, 0, 1],
      [4, 0, 0, 0, 0, 0, 1, 1],
      [4, 2, 1, 0, 0, 1, 0, 0],
      [4, 1, 0, 0, 0, 1, 1, 0],
    ]
  ),
}