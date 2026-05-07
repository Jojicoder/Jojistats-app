alter table public.profiles add column if not exists season_goal text;
alter table public.profiles add column if not exists avg_goal text;
alter table public.profiles add column if not exists hr_goal integer;
alter table public.profiles add column if not exists rbi_goal integer;
alter table public.profiles add column if not exists era_goal text;
alter table public.profiles add column if not exists so_goal integer;
alter table public.profiles add column if not exists whip_goal text;

notify pgrst, 'reload schema';
