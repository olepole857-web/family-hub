-- FAMILY HUB: geschützter Familienkalender für maximal sechs Personen.
-- Nur im Supabase SQL Editor ausführen, NICHT als Datenbankpasswort verwenden.
create extension if not exists pgcrypto;
create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Unsere Familie',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table if not exists public.family_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  family_id uuid not null references public.families(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 1 and 70),
  joined_at timestamptz not null default now()
);
create index if not exists family_members_family_id_idx on public.family_members(family_id);
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  event_date date not null,
  event_time time,
  all_day boolean not null default false,
  details text not null default '' check (char_length(details) <= 1000),
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists events_family_date_idx on public.events(family_id,event_date);
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  done boolean not null default false,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists notes_family_idx on public.notes(family_id);

-- RLS-Hilfsfunktion vermeidet rekursive Abfragen auf Mitgliedschaften.
create or replace function public.my_family_id()
returns uuid language sql stable security definer set search_path=''
as $$ select m.family_id from public.family_members as m where m.user_id=(select auth.uid()) limit 1 $$;
revoke all on function public.my_family_id() from public;
grant execute on function public.my_family_id() to authenticated;

-- Maximal 6 Mitglieder, auch bei gleichzeitigen Einfügungen.
create or replace function public.limit_family_to_six()
returns trigger language plpgsql set search_path='' as $$
begin
  if tg_op='INSERT' or new.family_id is distinct from old.family_id then
    perform pg_advisory_xact_lock(hashtext(new.family_id::text));
    if (select count(*) from public.family_members where family_id=new.family_id)>=6 then
      raise exception 'Maximal 6 Familienmitglieder erlaubt';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists enforce_family_capacity on public.family_members;
create trigger enforce_family_capacity
before insert or update of family_id on public.family_members
for each row execute function public.limit_family_to_six();

alter table public.families enable row level security;
alter table public.family_members enable row level security;
alter table public.events enable row level security;
alter table public.notes enable row level security;

drop policy if exists "read own family" on public.families;
create policy "read own family" on public.families for select to authenticated
using (id=public.my_family_id());
drop policy if exists "read family members" on public.family_members;
create policy "read family members" on public.family_members for select to authenticated
using (family_id=public.my_family_id());

drop policy if exists "read family events" on public.events;
create policy "read family events" on public.events for select to authenticated
using (family_id=public.my_family_id());
drop policy if exists "insert family events" on public.events;
create policy "insert family events" on public.events for insert to authenticated
with check (family_id=public.my_family_id() and created_by=(select auth.uid()));
drop policy if exists "update family events" on public.events;
create policy "update family events" on public.events for update to authenticated
using (family_id=public.my_family_id()) with check (family_id=public.my_family_id());
drop policy if exists "delete family events" on public.events;
create policy "delete family events" on public.events for delete to authenticated
using (family_id=public.my_family_id());

drop policy if exists "read family notes" on public.notes;
create policy "read family notes" on public.notes for select to authenticated
using (family_id=public.my_family_id());
drop policy if exists "insert family notes" on public.notes;
create policy "insert family notes" on public.notes for insert to authenticated
with check (family_id=public.my_family_id() and created_by=(select auth.uid()));
drop policy if exists "update family notes" on public.notes;
create policy "update family notes" on public.notes for update to authenticated
using (family_id=public.my_family_id()) with check (family_id=public.my_family_id());
drop policy if exists "delete family notes" on public.notes;
create policy "delete family notes" on public.notes for delete to authenticated
using (family_id=public.my_family_id());

grant usage on schema public to authenticated;
grant select on public.families,public.family_members to authenticated;
grant select,insert,update,delete on public.events,public.notes to authenticated;

-- Live-Aktualisierung; zusätzlich fragt die App regelmäßig neu ab.
do $$
begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='events') then
      alter publication supabase_realtime add table public.events;
    end if;
    if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notes') then
      alter publication supabase_realtime add table public.notes;
    end if;
  end if;
end $$;