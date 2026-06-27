# JBL Season JSON Contract

This repo expects the C++ engine to export JBL data into:

```txt
public/jbl/seasons/<season>/season.json
public/jbl/seasons/<season>/games/index.json
public/jbl/seasons/<season>/games/<gameId>.json
```

`season.json` is the page-level index for Team Overview, Players, Today's Games, and Standings.
Each game file is the animation source for Today's Games and Game Detail replay.

## Required Season Shape

```json
{
  "schemaVersion": 1,
  "season": 2026,
  "league": "JBL",
  "generatedAt": "2026-06-26T00:00:00Z",
  "teams": [],
  "players": [],
  "battingLeaders": [],
  "pitchingLeaders": [],
  "schedule": []
}
```

Every schedule item must include:

```json
{
  "gameId": "2026-001",
  "date": "2026-04-03",
  "away": "Brooklyn Hammers",
  "home": "Bronx Wolves",
  "venue": "Ravens Nest",
  "status": "final",
  "finalScore": { "away": 5, "home": 3 },
  "gameFile": "games/2026-001.json"
}
```

## Required Game Shape

```json
{
  "schemaVersion": 1,
  "gameId": "2026-001",
  "season": 2026,
  "date": "2026-04-03",
  "venue": "Ravens Nest",
  "away": "Brooklyn Hammers",
  "home": "Bronx Wolves",
  "finalScore": { "away": 5, "home": 3 },
  "lineScore": { "away": [0, 1, 0], "home": [2, 0, 1] },
  "awayLineup": [],
  "homeLineup": [],
  "awayDefense": { "P": "Name", "C": "Name", "1B": "Name" },
  "homeDefense": { "P": "Name", "C": "Name", "1B": "Name" },
  "winPitcher": "Name",
  "lossPitcher": "Name",
  "savePitcher": null,
  "boxScore": { "batters": [], "pitchers": [] },
  "events": []
}
```

## Animation-Critical Event Fields

Pitch events need before/after state so the UI can show the count and transition correctly:

```json
{
  "type": "pitch",
  "inning": 1,
  "half": "top",
  "pitcher": "Name",
  "catcher": "Name",
  "batter": "Name",
  "pitchType": "fastball",
  "outcome": "called strike",
  "ballsBefore": 0,
  "strikesBefore": 1,
  "outsBefore": 0,
  "ballsAfter": 0,
  "strikesAfter": 2,
  "outsAfter": 0,
  "basesBefore": { "first": null, "second": null, "third": null },
  "basesAfter": { "first": null, "second": null, "third": null },
  "scoreBefore": { "away": 0, "home": 0 },
  "scoreAfter": { "away": 0, "home": 0 },
  "velo": 94.1,
  "px": 0.2,
  "pz": 2.4,
  "mx": -1.3,
  "mz": 11.8,
  "batHand": "L",
  "pitchHand": "R"
}
```

Play events need runner and fielder resolution so the 3D replay does not infer defense:

```json
{
  "type": "play",
  "inning": 1,
  "half": "top",
  "batter": "Name",
  "pitcher": "Name",
  "result": "grounds out",
  "outsBefore": 1,
  "outsAfter": 2,
  "basesBefore": { "first": "Runner", "second": null, "third": null },
  "basesAfter": { "first": null, "second": "Runner", "third": null },
  "scoreBefore": { "away": 0, "home": 0 },
  "scoreAfter": { "away": 0, "home": 0 },
  "runsScored": [],
  "rbi": 0,
  "fielder": "SS",
  "fieldersInvolved": ["SS", "1B"],
  "throwTo": "first",
  "outRunners": ["batter"],
  "runnerAdvances": [
    { "runner": "batter", "from": "home", "to": "first", "result": "out" },
    { "runner": "Runner", "from": "first", "to": "second", "result": "safe" }
  ],
  "hit": {
    "ev": 87.2,
    "la": -3.1,
    "sa": 12.4,
    "landing": { "x": 34, "y": 112 },
    "traj": [[0, 0, 3.3], [1, 4, 3.1]]
  }
}
```

The TypeScript source of truth is `src/sim/jblJsonTypes.ts`.
The CI validator is `scripts/validate-jbl-json.mjs`.

`games/index.json` is an array of game file names inside the `games` directory:

```json
["2026-001.json", "2026-002.json"]
```

For local validation against a temporary export directory:

```sh
JBL_JSON_ROOT=/private/tmp/jbl-season-test npm run validate:jbl-json -- 2026
```
