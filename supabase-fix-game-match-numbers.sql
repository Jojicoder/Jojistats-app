-- Renumber existing games so match_number is unique within each team season.
-- Run this in Supabase SQL Editor after taking a backup/export.

with ranked_games as (
  select
    id,
    row_number() over (
      partition by team_id, season_year
      order by game_date asc, id asc
    ) as next_match_number
  from games
)
update games
set match_number = ranked_games.next_match_number
from ranked_games
where games.id = ranked_games.id;

-- Prevent the same issue from coming back at the database layer.
create unique index if not exists games_team_season_match_number_unique
  on games (team_id, season_year, match_number);
