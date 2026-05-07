alter table public.games add column if not exists team_score integer;
alter table public.games add column if not exists opponent_score integer;
alter table public.games add column if not exists result text;

alter table public.games
  drop constraint if exists games_result_check;

alter table public.games
  add constraint games_result_check
  check (result is null or result in ('W', 'L', 'T'));

alter table public.games
  drop constraint if exists games_team_score_check;

alter table public.games
  add constraint games_team_score_check
  check (team_score is null or team_score >= 0);

alter table public.games
  drop constraint if exists games_opponent_score_check;

alter table public.games
  add constraint games_opponent_score_check
  check (opponent_score is null or opponent_score >= 0);
