-- Guess Room — initial schema
-- Backend (service role) is the ONLY writer. Browser clients (anon key) get
-- read-only access via RLS for live data, and receive updates over Realtime.
--
-- Money is stored as numeric(20,0) lamports and read back as strings, then
-- parsed into BigInt on the server — never as JS floats.

create extension if not exists "pgcrypto";

-- ── rounds ────────────────────────────────────────────────────────────────
create table if not exists public.rounds (
  id            uuid primary key,
  round_number  integer not null,
  status        text not null check (status in ('open','locked','settling','settled')),
  pool_lamports numeric(20,0) not null default 0,
  starts_at     timestamptz not null,
  ends_at       timestamptz not null,
  reveal_at     timestamptz not null,
  winning_room  integer check (winning_room between 1 and 10),
  rolled_over   boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists rounds_round_number_idx on public.rounds (round_number desc);
create index if not exists rounds_status_idx on public.rounds (status);

-- ── guesses ───────────────────────────────────────────────────────────────
create table if not exists public.guesses (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  wallet      text not null,
  room        integer not null check (room between 1 and 10),
  verified    boolean,
  raw_amount  numeric(40,0),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- one active pick per wallet per round (players may change it via upsert)
  unique (round_id, wallet)
);

create index if not exists guesses_round_idx on public.guesses (round_id);
create index if not exists guesses_round_room_idx on public.guesses (round_id, room);

-- ── payouts ───────────────────────────────────────────────────────────────
create table if not exists public.payouts (
  id          uuid primary key default gen_random_uuid(),
  round_id    uuid not null references public.rounds(id) on delete cascade,
  wallet      text not null,
  lamports    numeric(20,0) not null,
  status      text not null check (status in ('pending','sent','confirmed','failed','skipped')),
  signature   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- idempotency: a wallet can be paid at most once per round, even across
  -- crashes/restarts. The settlement engine relies on this constraint.
  unique (round_id, wallet)
);

create index if not exists payouts_round_idx on public.payouts (round_id);

-- ── updated_at trigger ──────────────────────────────────────────────────────
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists guesses_touch on public.guesses;
create trigger guesses_touch before update on public.guesses
  for each row execute function public.touch_updated_at();

drop trigger if exists payouts_touch on public.payouts;
create trigger payouts_touch before update on public.payouts
  for each row execute function public.touch_updated_at();

-- ── Row Level Security ──────────────────────────────────────────────────────
alter table public.rounds  enable row level security;
alter table public.guesses enable row level security;
alter table public.payouts enable row level security;

-- Read-only for everyone (anon + authenticated). The service role bypasses RLS,
-- so the backend can still write. No insert/update/delete policies are defined
-- for anon/authenticated, which means those operations are denied to clients.
drop policy if exists "public read rounds" on public.rounds;
create policy "public read rounds" on public.rounds
  for select using (true);

drop policy if exists "public read guesses" on public.guesses;
create policy "public read guesses" on public.guesses
  for select using (true);

drop policy if exists "public read payouts" on public.payouts;
create policy "public read payouts" on public.payouts
  for select using (true);

-- ── Realtime ────────────────────────────────────────────────────────────────
-- Publish row changes so the player UI and OBS overlay update live.
do $$
declare
  t text;
begin
  if not exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    create publication supabase_realtime;
  end if;

  foreach t in array array['rounds','guesses','payouts'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end$$;
