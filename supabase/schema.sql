-- BabyWatch database schema for Supabase.
-- HOW TO USE: In your Supabase project, open "SQL Editor", paste this whole
-- file, and click "Run". That's it.

create extension if not exists pgcrypto;

-- Families ────────────────────────────────────────────────────────────────────
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  created_at timestamptz default now()
);

-- Members (parents + family members / nannies) ───────────────────────────────
-- email/password_hash are nullable so a parent can add a "placeholder" member
-- (e.g. a grandparent) who doesn't have their own login.
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  email text unique,
  password_hash text,
  role text not null check (role in ('parent', 'family')),
  tag text,
  is_placeholder boolean default false,
  reset_token text,
  reset_token_expires timestamptz,
  created_at timestamptz default now()
);

-- Migration for existing databases: relax email/password_hash to nullable and
-- add the new columns. Safe to re-run.
alter table members alter column email drop not null;
alter table members alter column password_hash drop not null;
alter table members add column if not exists is_placeholder boolean default false;
alter table members add column if not exists reset_token text;
alter table members add column if not exists reset_token_expires timestamptz;

-- Children ───────────────────────────────────────────────────────────────────
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Shifts (one per family per day) ────────────────────────────────────────────
create table if not exists shifts (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  date date not null,
  start_time text not null,
  end_time text not null,
  kids text[] default '{}',
  label text,
  covered_by_id uuid references members(id) on delete set null,
  covered_by_name text,
  created_by uuid,
  created_by_name text,
  created_at timestamptz default now(),
  unique (family_id, date)
);

-- Migration for existing databases: add the new columns. Safe to re-run.
alter table shifts add column if not exists label text;
alter table shifts add column if not exists created_by_name text;

-- Linked family calendars ────────────────────────────────────────────────────
-- Lets a member (e.g. an aunt/uncle) link an additional family's calendar
-- (such as a sibling's) so they can switch between them in the app.
create table if not exists family_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  created_at timestamptz default now(),
  unique (member_id, family_id)
);
alter table family_links enable row level security;
drop policy if exists "babywatch_all" on family_links;
create policy "babywatch_all" on family_links for all using (true) with check (true);
do $$
begin
  alter publication supabase_realtime add table family_links;
exception when duplicate_object then null;
end $$;

-- Notifications ──────────────────────────────────────────────────────────────
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid,
  recipient_id uuid references members(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- The default family everyone joins (join code WATCH1)
insert into families (code) values ('WATCH1') on conflict (code) do nothing;

-- Row level security: the app authenticates members itself (hashed passwords),
-- so the anon key needs read/write access to these tables.
alter table families enable row level security;
alter table members enable row level security;
alter table children enable row level security;
alter table shifts enable row level security;
alter table notifications enable row level security;

drop policy if exists "babywatch_all" on families;
create policy "babywatch_all" on families for all using (true) with check (true);
drop policy if exists "babywatch_all" on members;
create policy "babywatch_all" on members for all using (true) with check (true);
drop policy if exists "babywatch_all" on children;
create policy "babywatch_all" on children for all using (true) with check (true);
drop policy if exists "babywatch_all" on shifts;
create policy "babywatch_all" on shifts for all using (true) with check (true);
drop policy if exists "babywatch_all" on notifications;
create policy "babywatch_all" on notifications for all using (true) with check (true);

-- Realtime: lets the app update instantly on every family member's phone.
do $$
begin
  alter publication supabase_realtime add table shifts;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table members;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table children;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table notifications;
exception when duplicate_object then null;
end $$;
