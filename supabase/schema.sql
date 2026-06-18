-- BabyWatch database schema for Supabase.
-- HOW TO USE: In your Supabase project, open "SQL Editor", paste this whole
-- file, and click "Run". That's it.

create extension if not exists pgcrypto;

-- Families --------------------------------------------------------------------
create table if not exists families (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text,
  created_at timestamptz default now()
);

-- Migration for existing databases: add the new column. Safe to re-run.
alter table families add column if not exists name text;
-- iCal subscription token: unique secret URL token per family for calendar apps.
alter table families add column if not exists ical_token uuid default gen_random_uuid();
create unique index if not exists families_ical_token_idx on families(ical_token) where ical_token is not null;
update families set ical_token = gen_random_uuid() where ical_token is null;

-- Members (parents + family members / nannies) -------------------------------
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
-- Minutes-before-shift reminder offsets, e.g. {1440,60} = 1 day and 1 hour before.
alter table members add column if not exists reminder_offsets integer[] default '{1440,60}';

-- Children -------------------------------------------------------------------
create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name text not null,
  created_at timestamptz default now()
);

-- Shifts (multiple per family per day allowed) ------------------------------
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
  created_at timestamptz default now()
);

-- Migration for existing databases: add the new columns. Safe to re-run.
alter table shifts add column if not exists label text;
alter table shifts add column if not exists created_by_name text;
-- Allow multiple shifts per day: drop the old one-per-day constraint.
alter table shifts drop constraint if exists shifts_family_id_date_key;

-- Linked family calendars ----------------------------------------------------
-- Lets a member (e.g. an aunt/uncle) link an additional family's calendar
-- (such as a sibling's) so they can switch between them in the app.
create table if not exists family_links (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references members(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  relationship text,
  role text default 'family',
  created_at timestamptz default now(),
  unique (member_id, family_id)
);

-- Migration for existing databases: add the new columns. Safe to re-run.
alter table family_links add column if not exists relationship text;
alter table family_links add column if not exists role text default 'family';

alter table family_links enable row level security;
drop policy if exists "babywatch_all" on family_links;
create policy "babywatch_all" on family_links for all using (true) with check (true);
do $$
begin
  alter publication supabase_realtime add table family_links;
exception when duplicate_object then null;
end $$;

-- Notifications --------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  family_id uuid,
  recipient_id uuid references members(id) on delete cascade,
  message text not null,
  read boolean default false,
  created_at timestamptz default now()
);

-- Shift reminders ------------------------------------------------------------
-- Tracks which (shift, member, offset) reminders have already been sent so the
-- scheduled job never sends the same reminder twice.
create table if not exists shift_reminders (
  id uuid primary key default gen_random_uuid(),
  shift_id uuid not null references shifts(id) on delete cascade,
  member_id uuid not null references members(id) on delete cascade,
  offset_minutes integer not null,
  created_at timestamptz default now(),
  unique (shift_id, member_id, offset_minutes)
);
alter table shift_reminders enable row level security;
drop policy if exists "babywatch_all" on shift_reminders;
create policy "babywatch_all" on shift_reminders for all using (true) with check (true);

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

-- Scheduled shift reminders ----------------------------------------------------
-- Calls the send-reminders Edge Function every 10 minutes. Requires the
-- pg_cron and pg_net extensions (enabled below) and the project URL +
-- service role key filled in. Safe to re-run.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.unschedule('babywatch-send-reminders')
where exists (select 1 from cron.job where jobname = 'babywatch-send-reminders');

select cron.schedule(
  'babywatch-send-reminders',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://YOUR-PROJECT-ID.supabase.co/functions/v1/send-reminders',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer YOUR-SERVICE-ROLE-KEY'
    ),
    body := '{}'::jsonb
  );
  $$
);
