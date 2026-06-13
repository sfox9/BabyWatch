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
create table if not exists members (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  email text unique not null,
  password_hash text not null,
  role text not null check (role in ('parent', 'family')),
  tag text,
  created_at timestamptz default now()
);

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
  covered_by_id uuid references members(id) on delete set null,
  covered_by_name text,
  created_by uuid,
  created_at timestamptz default now(),
  unique (family_id, date)
);

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
