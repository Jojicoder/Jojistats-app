create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  subject text,
  message text not null,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint contact_messages_status_check check (status in ('open', 'read', 'closed')),
  constraint contact_messages_name_check check (length(trim(name)) between 1 and 120),
  constraint contact_messages_email_check check (position('@' in email) > 1 and length(trim(email)) <= 255),
  constraint contact_messages_message_check check (length(trim(message)) between 1 and 5000)
);

create index if not exists contact_messages_created_at_idx
on public.contact_messages (created_at desc);

create index if not exists contact_messages_status_idx
on public.contact_messages (status);

grant usage on schema public to anon, authenticated;
grant insert on public.contact_messages to anon;
grant select, update on public.contact_messages to authenticated;

alter table public.contact_messages enable row level security;

drop policy if exists "Anyone can submit contact messages" on public.contact_messages;
create policy "Anyone can submit contact messages"
on public.contact_messages
for insert
to anon, authenticated
with check (true);

drop policy if exists "Admin can read contact messages" on public.contact_messages;
create policy "Admin can read contact messages"
on public.contact_messages
for select
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com');

drop policy if exists "Admin can update contact messages" on public.contact_messages;
create policy "Admin can update contact messages"
on public.contact_messages
for update
to authenticated
using (lower(auth.email()) = 'admin@jojistats.com')
with check (lower(auth.email()) = 'admin@jojistats.com');
