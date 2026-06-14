grant select on public.teams to authenticated;
grant select on public.players to authenticated;
grant select, insert, update, delete on public.games to authenticated;
grant select, insert, update, delete on public.batting_game_stats to authenticated;
grant select, insert, update, delete on public.pitching_game_stats to authenticated;

grant select on public.teams to anon;
grant select on public.players to anon;
grant select on public.games to anon;
grant select on public.batting_game_stats to anon;
grant select on public.pitching_game_stats to anon;

alter table public.games add column if not exists memo text;
alter table public.batting_game_stats add column if not exists hbp integer not null default 0;
alter table public.batting_game_stats add column if not exists sf integer not null default 0;
alter table public.batting_game_stats add column if not exists game_positions text[] not null default '{}';
alter table public.batting_game_stats add column if not exists note text;
alter table public.pitching_game_stats add column if not exists hbp integer not null default 0;

create or replace function public.has_team_access(team_id_input bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.team_id = team_id_input
  )
  or lower(auth.email()) = 'admin@jojistats.com';
$$;

create or replace function public.has_record_access(team_id_input bigint, player_id_input bigint)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.team_id = team_id_input
      and (
        ua.role in ('recorder', 'manager')
        or (ua.role = 'player' and ua.player_id = player_id_input)
      )
  )
  or lower(auth.email()) = 'admin@jojistats.com';
$$;

grant execute on function public.has_team_access(bigint) to authenticated;
grant execute on function public.has_record_access(bigint, bigint) to authenticated;

alter table public.teams enable row level security;
alter table public.players enable row level security;
alter table public.games enable row level security;
alter table public.batting_game_stats enable row level security;
alter table public.pitching_game_stats enable row level security;

drop policy if exists "Admin can manage teams" on public.teams;
create policy "Admin can manage teams"
on public.teams
for all
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Assigned users can read teams" on public.teams;
create policy "Assigned users can read teams"
on public.teams
for select
to authenticated
using (
  public.has_team_access(teams.id)
);

drop policy if exists "Public can read active teams" on public.teams;
create policy "Public can read active teams"
on public.teams
for select
to anon
using (
  coalesce(teams.is_archived, false) = false
);

drop policy if exists "Admin can manage players" on public.players;
create policy "Admin can manage players"
on public.players
for all
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Assigned users can read team players" on public.players;
create policy "Assigned users can read team players"
on public.players
for select
to authenticated
using (
  public.has_team_access(players.team_id)
);

drop policy if exists "Public can read active players" on public.players;
create policy "Public can read active players"
on public.players
for select
to anon
using (
  coalesce(players.is_archived, false) = false
  and exists (
    select 1
    from public.teams t
    where t.id = players.team_id
      and coalesce(t.is_archived, false) = false
  )
);

drop policy if exists "Admin can manage games" on public.games;
create policy "Admin can manage games"
on public.games
for all
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Assigned users can read team games" on public.games;
create policy "Assigned users can read team games"
on public.games
for select
to authenticated
using (
  public.has_team_access(games.team_id)
);

drop policy if exists "Public can read active team games" on public.games;
create policy "Public can read active team games"
on public.games
for select
to anon
using (
  exists (
    select 1
    from public.teams t
    where t.id = games.team_id
      and coalesce(t.is_archived, false) = false
  )
);

drop policy if exists "Recorders can create team games" on public.games;
create policy "Recorders can create team games"
on public.games
for insert
to authenticated
with check (
  exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.role in ('recorder', 'manager')
      and ua.team_id = games.team_id
  )
);

drop policy if exists "Recorders can update team games" on public.games;
create policy "Recorders can update team games"
on public.games
for update
to authenticated
using (
  exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.role in ('recorder', 'manager')
      and ua.team_id = games.team_id
  )
)
with check (
  exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.role in ('recorder', 'manager')
      and ua.team_id = games.team_id
  )
);

drop policy if exists "Recorders can delete team games" on public.games;
create policy "Recorders can delete team games"
on public.games
for delete
to authenticated
using (
  exists (
    select 1
    from public.user_access ua
    where lower(ua.email) = lower(auth.email())
      and ua.is_active = true
      and ua.role in ('recorder', 'manager')
      and ua.team_id = games.team_id
  )
);

drop policy if exists "Admin can manage batting stats" on public.batting_game_stats;
create policy "Admin can manage batting stats"
on public.batting_game_stats
for all
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Assigned users can read team batting stats" on public.batting_game_stats;
create policy "Assigned users can read team batting stats"
on public.batting_game_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = batting_game_stats.game_id
      and public.has_team_access(g.team_id)
  )
);

drop policy if exists "Public can read active team batting stats" on public.batting_game_stats;
create policy "Public can read active team batting stats"
on public.batting_game_stats
for select
to anon
using (
  exists (
    select 1
    from public.games g
    join public.teams t on t.id = g.team_id
    join public.players p on p.id = batting_game_stats.player_id
    where g.id = batting_game_stats.game_id
      and p.team_id = g.team_id
      and coalesce(t.is_archived, false) = false
      and coalesce(p.is_archived, false) = false
  )
);

drop policy if exists "Recorders can create assigned batting stats" on public.batting_game_stats;
create policy "Recorders can create assigned batting stats"
on public.batting_game_stats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.games g
    where g.id = batting_game_stats.game_id
      and public.has_record_access(g.team_id, batting_game_stats.player_id)
  )
);

drop policy if exists "Recorders can update assigned batting stats" on public.batting_game_stats;
create policy "Recorders can update assigned batting stats"
on public.batting_game_stats
for update
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = batting_game_stats.game_id
      and public.has_record_access(g.team_id, batting_game_stats.player_id)
  )
)
with check (
  exists (
    select 1
    from public.games g
    where g.id = batting_game_stats.game_id
      and public.has_record_access(g.team_id, batting_game_stats.player_id)
  )
);

drop policy if exists "Recorders can delete assigned batting stats" on public.batting_game_stats;
create policy "Recorders can delete assigned batting stats"
on public.batting_game_stats
for delete
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = batting_game_stats.game_id
      and public.has_record_access(g.team_id, batting_game_stats.player_id)
  )
);

drop policy if exists "Admin can manage pitching stats" on public.pitching_game_stats;
create policy "Admin can manage pitching stats"
on public.pitching_game_stats
for all
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Assigned users can read team pitching stats" on public.pitching_game_stats;
create policy "Assigned users can read team pitching stats"
on public.pitching_game_stats
for select
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = pitching_game_stats.game_id
      and public.has_team_access(g.team_id)
  )
);

drop policy if exists "Public can read active team pitching stats" on public.pitching_game_stats;
create policy "Public can read active team pitching stats"
on public.pitching_game_stats
for select
to anon
using (
  exists (
    select 1
    from public.games g
    join public.teams t on t.id = g.team_id
    join public.players p on p.id = pitching_game_stats.player_id
    where g.id = pitching_game_stats.game_id
      and p.team_id = g.team_id
      and coalesce(t.is_archived, false) = false
      and coalesce(p.is_archived, false) = false
  )
);

drop policy if exists "Recorders can create assigned pitching stats" on public.pitching_game_stats;
create policy "Recorders can create assigned pitching stats"
on public.pitching_game_stats
for insert
to authenticated
with check (
  exists (
    select 1
    from public.games g
    where g.id = pitching_game_stats.game_id
      and public.has_record_access(g.team_id, pitching_game_stats.player_id)
  )
);

drop policy if exists "Recorders can update assigned pitching stats" on public.pitching_game_stats;
create policy "Recorders can update assigned pitching stats"
on public.pitching_game_stats
for update
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = pitching_game_stats.game_id
      and public.has_record_access(g.team_id, pitching_game_stats.player_id)
  )
)
with check (
  exists (
    select 1
    from public.games g
    where g.id = pitching_game_stats.game_id
      and public.has_record_access(g.team_id, pitching_game_stats.player_id)
  )
);

drop policy if exists "Recorders can delete assigned pitching stats" on public.pitching_game_stats;
create policy "Recorders can delete assigned pitching stats"
on public.pitching_game_stats
for delete
to authenticated
using (
  exists (
    select 1
    from public.games g
    where g.id = pitching_game_stats.game_id
      and public.has_record_access(g.team_id, pitching_game_stats.player_id)
  )
);

notify pgrst, 'reload schema';
