-- Add stolen base columns to batting_game_stats
alter table public.batting_game_stats
  add column if not exists sb integer not null default 0,
  add column if not exists cs integer not null default 0;

notify pgrst, 'reload schema';
