-- Bot runtime tables used by bot-worker (levels, website->bot commands, voice commands).
-- These already exist in the live project; this file makes fresh databases reproducible.
-- Safe to re-run (if not exists everywhere).

alter table public.hosted_bots add column if not exists voice_state jsonb;
alter table public.hosted_bots add column if not exists stats jsonb;

create table if not exists public.bot_levels (
  bot_id uuid not null references public.hosted_bots(id) on delete cascade,
  guild_id text not null,
  user_id text not null,
  username text,
  avatar text,
  xp bigint not null default 0,
  level integer not null default 0,
  messages integer not null default 0,
  voice_seconds bigint not null default 0,
  updated_at timestamptz not null default now(),
  primary key (bot_id, guild_id, user_id)
);

create table if not exists public.bot_commands (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.hosted_bots(id) on delete cascade,
  user_id uuid,
  action text not null,
  payload jsonb default '{}'::jsonb,
  channel_id text,
  status text not null default 'pending',
  result text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create table if not exists public.voice_commands (
  id uuid primary key default gen_random_uuid(),
  bot_id uuid not null references public.hosted_bots(id) on delete cascade,
  user_id uuid not null,
  action text not null,
  channel_id text,
  minutes integer,
  status text not null default 'pending',
  result text,
  created_at timestamptz not null default now(),
  done_at timestamptz
);

create index if not exists bot_commands_pending_idx on public.bot_commands (status, created_at);
create index if not exists voice_commands_pending_idx on public.voice_commands (status, created_at);
create index if not exists bot_levels_rank_idx on public.bot_levels (bot_id, guild_id, xp desc);

alter table public.bot_levels enable row level security;
alter table public.bot_commands enable row level security;
alter table public.voice_commands enable row level security;

revoke all on public.bot_levels, public.bot_commands, public.voice_commands from anon, authenticated;
grant all on public.bot_levels, public.bot_commands, public.voice_commands to service_role;
