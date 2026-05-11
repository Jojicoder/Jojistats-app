-- Compact numeric ids and update every related foreign-key column.
-- Run in Supabase SQL Editor after taking a backup/export.
--
-- This renumbers:
--   teams.id
--   players.id / players.team_id
--   games.id / games.team_id
--   batting_game_stats.id / batting_game_stats.game_id / batting_game_stats.player_id
--   pitching_game_stats.id / pitching_game_stats.game_id / pitching_game_stats.player_id
--   user_access.id / user_access.team_id / user_access.player_id
--
-- Note: external URLs, screenshots, or exports that reference old numeric ids will no
-- longer match after this. App data relationships stay intact.

begin;

-- Make foreign keys check at commit, so related ids can be moved together.
do $$
declare
  constraint_record record;
begin
  for constraint_record in
    select
      conrelid::regclass as table_name,
      conname as constraint_name
    from pg_constraint
    where contype = 'f'
      and connamespace = 'public'::regnamespace
      and conrelid::regclass::text in (
        'players',
        'games',
        'batting_game_stats',
        'pitching_game_stats',
        'user_access'
      )
  loop
    execute format(
      'alter table %s alter constraint %I deferrable initially deferred',
      constraint_record.table_name,
      constraint_record.constraint_name
    );
  end loop;
end $$;

set constraints all deferred;

create temp table team_id_map as
select id as old_id, row_number() over (order by id)::bigint as new_id
from teams;

create temp table player_id_map as
select id as old_id, row_number() over (order by team_id, season_year, jersey_number nulls last, id)::bigint as new_id
from players;

create temp table game_id_map as
select id as old_id, row_number() over (order by team_id, season_year, game_date, match_number, id)::bigint as new_id
from games;

create temp table batting_stat_id_map as
select id as old_id, row_number() over (order by game_id, batting_order nulls last, player_id, id)::bigint as new_id
from batting_game_stats;

create temp table pitching_stat_id_map as
select id as old_id, row_number() over (order by game_id, player_id, id)::bigint as new_id
from pitching_game_stats;

create temp table user_access_id_map as
select id as old_id, row_number() over (order by email, id)::bigint as new_id
from user_access;

-- Move all numeric ids and foreign keys to negative temporary values first.
-- This avoids primary-key collisions such as updating id 4 to id 3 while id 3 exists.
update batting_game_stats set id = -id, game_id = -game_id, player_id = -player_id;
update pitching_game_stats set id = -id, game_id = -game_id, player_id = -player_id;
update user_access set id = -id, team_id = -team_id, player_id = -player_id;
update games set id = -id, team_id = -team_id;
update players set id = -id, team_id = -team_id;
update teams set id = -id;

-- Apply compact final ids.
update teams t
set id = m.new_id
from team_id_map m
where t.id = -m.old_id;

update players p
set
  id = pm.new_id,
  team_id = tm.new_id
from player_id_map pm
join team_id_map tm on p.team_id = -tm.old_id
where p.id = -pm.old_id;

update games g
set
  id = gm.new_id,
  team_id = tm.new_id
from game_id_map gm
join team_id_map tm on g.team_id = -tm.old_id
where g.id = -gm.old_id;

update batting_game_stats b
set
  id = bm.new_id,
  game_id = gm.new_id,
  player_id = pm.new_id
from batting_stat_id_map bm
join game_id_map gm on b.game_id = -gm.old_id
join player_id_map pm on b.player_id = -pm.old_id
where b.id = -bm.old_id;

update pitching_game_stats p
set
  id = pm_stat.new_id,
  game_id = gm.new_id,
  player_id = pm_player.new_id
from pitching_stat_id_map pm_stat
join game_id_map gm on p.game_id = -gm.old_id
join player_id_map pm_player on p.player_id = -pm_player.old_id
where p.id = -pm_stat.old_id;

update user_access ua
set
  id = um.new_id,
  team_id = tm.new_id,
  player_id = pm.new_id
from user_access_id_map um
join team_id_map tm on ua.team_id = -tm.old_id
join player_id_map pm on ua.player_id = -pm.old_id
where ua.id = -um.old_id;

-- Reset sequences so the next insert continues after the compacted ids.
select setval(pg_get_serial_sequence('teams', 'id'), coalesce((select max(id) from teams), 0) + 1, false);
select setval(pg_get_serial_sequence('players', 'id'), coalesce((select max(id) from players), 0) + 1, false);
select setval(pg_get_serial_sequence('games', 'id'), coalesce((select max(id) from games), 0) + 1, false);
select setval(pg_get_serial_sequence('batting_game_stats', 'id'), coalesce((select max(id) from batting_game_stats), 0) + 1, false);
select setval(pg_get_serial_sequence('pitching_game_stats', 'id'), coalesce((select max(id) from pitching_game_stats), 0) + 1, false);
select setval(pg_get_serial_sequence('user_access', 'id'), coalesce((select max(id) from user_access), 0) + 1, false);

commit;
