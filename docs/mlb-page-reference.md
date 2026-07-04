# MLB Page Reference

A record of what each MLB page shows and how it's built, so a new league
(a second fictional league, a different real league, etc.) can be brought to
the same level without re-deriving it from scratch. JBL was built to match
this; use it as the worked example when the source data differs from MLB's.

Source files: `src/pages/MLBTeamPage.tsx`, `src/components/mlb/PlayersTab.tsx`,
`MLBRosterSidebar.tsx`, `MLBTrendChart.tsx`, `MLBTrendChartUtils.ts`,
`MLBGameLog.tsx`, `MLBScoreboard.tsx`, `MLBScoreHero.tsx`, `TodayGamesTab.tsx`,
`StandingsTab.tsx`, `playerStats.ts`, `../../config/leagueConfig.ts`.

## Page composition & routing

Two top-level pages carry all four views, plus one dedicated route for a
selected team:

- **`/mlb`** (`MLBPage.tsx`) — the "no team selected yet" shell. Owns
  `activeView` (`"team" | "today" | "standings" | "players"`) synced to a
  `?view=` query param, plus `?teamId=` and `?playerId=` for deep-linking a
  team/player straight into the Players tab. Renders `TodayGamesTab` /
  `StandingsTab` / `PlayersTab` directly based on `activeView`; the "team"
  view here is just a placeholder prompt ("select a team above") since Team
  Overview redirects to the dedicated route below the moment a team is picked.
- **`/mlb/teams/:teamId`** (`MLBTeamPage.tsx`) — Team Overview for one team.
  Not merged into `MLBPage.tsx`'s view-switch; it's its own route so a team's
  overview has a clean, bookmarkable, team-scoped URL instead of
  `/mlb?view=team&teamId=N`.
- Both pages wrap their content in the same `<PageShell>` (header team
  picker + a `tabs` array: Team Overview / Players / Today's Games /
  Standings / Back to Your Stats). Selecting "Team Overview" from the tabs
  always navigates to `/mlb/teams/:id` (via `navigate()`), not a view-switch;
  the other three tabs are `{ label, view }` entries that just flip
  `activeView` and rewrite `?view=`.
- Team selection lives in the header dropdown (`headerProps.onChangeTeam`),
  shared across every view — changing team while on Players/Standings/Today's
  Games re-filters in place; changing team while on Team Overview navigates to
  the new team's `/mlb/teams/:id`.
- Team theming (`applyGlobalMLBTheme`/`getTeamThemeStyle`) is applied at this
  same top level and passed down as inline `style` on `<PageShell>`, so every
  child component just uses the `--mlb-primary`/`--mlb-on-primary` CSS
  variables rather than receiving team colors as props.

JBL's equivalent (`JBLPage.tsx` + `JBLTeamPage.tsx`, query params
`?view=`/`?team=`/`?player=`) follows this exact split — team name in the URL
instead of a numeric id, since JBL teams aren't backed by a numeric API id.

## Team Overview (`MLBTeamPage.tsx`)

- **Header card**: team logo (large) + division/league label (small, team-color
  text) + team name (large, bold) + venue name, with a season-year pill badge
  top-right.
- **Summary tiles** (2 cols mobile / 4 cols desktop): Record (W-L, detail =
  "N games"), Win PCT, Games, Players. Record/Win PCT are color-coded —
  emerald if win% ≥ .550, rose if ≤ .450, neutral between (`getRecordColor`).
- **Roster card**: grid of player cards (jersey-number circle badge + name +
  position/role), each linking to that player on the Players page.
- **Team Batting card**: AVG/OBP/OPS/HR/RBI tiles, color-coded via
  `getStatColor`.
- **Team Pitching card**: ERA/WHIP/IP/SO/BB tiles, same coloring.
- **Recent Results sidebar** (sticky, right column on desktop): last 8
  completed games as W/L badge + opponent + date + score, one row each.

## Players (`PlayersTab.tsx` + `MLBRosterSidebar.tsx`)

Two-column layout: roster sidebar (left, ~18rem) + player detail (right, flex-1).

- **Roster sidebar**: "Sort by" dropdown — Name (A–Z) / Position / Jersey
  Number — then a scrollable list of player rows (jersey-number circle badge +
  name + position/role text). Selected row gets a solid dark background.
- **Player detail header**: team logo + circular headshot (or a default
  silhouette avatar if no photo) + team name/season + `#N Name` + position line
  (adds "· Bats X" for hitters, "· Throws Y" for pitchers) + a **Batting /
  Pitching toggle** (only shown if the player has stats in both modes) +
  Games Played / At Bats-or-Innings-Pitched summary tiles.
- **Stat card grid**: mode-appropriate cards (hitting: AVG/OBP/SLG/OPS/BB-K/
  ISO/BABIP/HR/RBI/R/2B/SB/SO; pitching: role-specific subset — starters get
  IP/W emphasis, relievers get HLD, closers get SV/BS) with a "Show All"
  expander past the first 4. Every card is colored via `getStatColor(label,
  value, league, pitchingRole)`.
- **Trend chart** (`MLBTrendChart.tsx`): "Last 15 Games" / "Full Season"
  toggle recomputing a *cumulative* line from that window's raw per-game log
  (not a slice of pre-accumulated points — recomputed from scratch so the
  windowed numbers are internally consistent). Hitting adds an AVG/OBP/OPS
  metric switch. A dashed team-average reference line is drawn from the
  team's season stat, labeled directly on the line. Hover shows a tooltip with
  date/opponent + value; a handful of x-axis date labels are shown (first,
  last, every 5th) to avoid crowding.
- **All Games** (`MLBGameLog.tsx`): full per-game log, newest first, each row
  a small stat-chip strip (hitting: AB/H/2B/3B/HR/RBI/BB/SO; pitching: IP/H/R/
  ER/BB/SO/HR). Capped at 10 visible with a "Show All" toggle.

## Standings (`StandingsTab.tsx`)

Division-grouped card layout, one card per division: Team (logo + name, team-
color text, links to Team Overview) / W / L / PCT / GB columns.

## Today's Games (`TodayGamesTab.tsx`)

Date-strip navigator (7-day window, today highlighted) above a card grid: each
card is status pill (Live/Final/Scheduled) + both teams (logo + name + score)
+ venue, linking to Game Details. Winner's row/score highlighted once final.

## Game Details — score hero + scoreboard (`MLBScoreHero.tsx`, `MLBScoreboard.tsx`)

- **Score hero**: away team (logo + name/abbrev) — combined score — home team
  (logo + name/abbrev, mirrored layout), with a live "● Top/Bottom N" indicator
  or "Final" badge centered under the score.
- **Scoreboard**: line-score table, one row per team (logo + name in the left
  column, "W" badge if final and winner), one column per inning (click a cell
  to jump the replay/box view to that half-inning; disabled if no data yet),
  R/H/E totals on the right.

## Supporting infrastructure (shared across all of the above)

- **`leagueConfig.ts`**: per-league `StatConfig` (hi/lo thresholds per stat
  label, `lowerBetter` flag for ERA/WHIP-type stats) plus per-pitching-role
  overrides (starter/reliever/closer). `getStatColor(label, value, league,
  pitchingRole)` is the single function every stat tile/card goes through —
  add a new league by adding a `LEAGUE_CONFIGS` entry (reuse `MLB_BASE_STATS`
  wholesale if the new league plays on the same statistical scale, the way JBL
  does; write a new base table if not, the way `JAA_BASE_STATS` does for the
  user's own recorded amateur games).
- **Team theming**: a `--mlb-primary` / `--mlb-on-primary` CSS custom
  property pair set per-team, with global `.mlb-themed` overrides that
  recolor any `green-*` Tailwind utility class to the team's color. This is
  why "neutral" stat tiles (no threshold match) still pick up team branding
  automatically — they fall back to a `green-950`-class text color, which the
  theme layer repaints.
- **Badge/logo sizing**: `teamBadge(name, size)` with a fixed size ladder
  (`md`/`lg`/`xl`/`2xl`/`3xl`). If a league's source logos have inconsistent
  padding baked into the PNG canvas (as JBL's did), auto-crop every logo to
  its opaque-pixel bounding box first — a per-team manual "scale" fudge factor
  cannot fix that on its own, it only corrects for genuine ink-density
  differences between logos (a solid crest vs. a spread-wing eagle) once the
  canvases are already tight.

## Known gaps when the source data is a simulator, not a live stats API

JBL hit these; check for the same shape of gap in any future league sourced
from a sim rather than a real stats feed:

- No jersey numbers, starter/reliever/closer role, or batting/throwing hand on
  the roster by default — these had to be added to the sim engine's export
  and threaded through (see `docs/jbl-season-json.md` and the engine's
  `PitcherBoxScore`/`Player` structs). Check whether the new source already
  emits them before assuming they need the same treatment.
- No doubles/triples/sac-flies/hit-by-pitch/batters-faced in the box score —
  SLG-against, ISO-from-raw-hits, and K-BB% all need those and were dropped or
  approximated (extra-base hits collapsed to "every non-HR hit is a single").
- No photos — use a default circular silhouette avatar, not a broken `<img>`.
