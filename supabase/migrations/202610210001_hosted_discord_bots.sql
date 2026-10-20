-- Hosted Discord bots: bot tokens live ONLY in Supabase Vault (never in a table column, browser or GitHub).
create table if not exists public.hosted_bots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id ~ '^[0-9]{15,22}$'),
  bot_name text,
  secret_id uuid not null,
  modules text[] not null default array['welcome'],
  config jsonb not null default '{}'::jsonb,
  enabled boolean not null default true,
  status text not null default 'pending' check (status in ('pending','online','offline','error')),
  last_error text,
  last_heartbeat timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, client_id)
);
alter table public.hosted_bots enable row level security;
revoke all on public.hosted_bots from anon, authenticated;
grant all on public.hosted_bots to service_role;

create or replace function public.save_hosted_bot(p_user_id uuid, p_client_id text, p_bot_name text, p_token text, p_modules text[], p_config jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare old_secret uuid; new_secret uuid; bot_id uuid; total int;
begin
  if p_token is not null and length(trim(p_token)) > 20 then
    select id, secret_id into bot_id, old_secret from public.hosted_bots where user_id = p_user_id and client_id = p_client_id;
    if bot_id is null then
      select count(*) into total from public.hosted_bots where user_id = p_user_id;
      if total >= 3 then raise exception 'Bot limit reached (3 per account)'; end if;
    end if;
    select vault.create_secret(p_token, 'hosted-bot-' || p_client_id || '-' || p_user_id::text || '-' || extract(epoch from now())::text, 'Discord bot token') into new_secret;
    insert into public.hosted_bots(user_id, client_id, bot_name, secret_id, modules, config, status, last_error, updated_at)
    values (p_user_id, p_client_id, p_bot_name, new_secret, p_modules, coalesce(p_config, '{}'::jsonb), 'pending', null, now())
    on conflict (user_id, client_id) do update set secret_id = excluded.secret_id, bot_name = excluded.bot_name,
      modules = excluded.modules, config = excluded.config, status = 'pending', last_error = null, updated_at = now()
    returning id into bot_id;
    if old_secret is not null then perform vault.delete_secret(old_secret); end if;
  else
    update public.hosted_bots set modules = p_modules, config = coalesce(p_config, '{}'::jsonb), updated_at = now()
    where user_id = p_user_id and client_id = p_client_id returning id into bot_id;
    if bot_id is null then raise exception 'Bot token is required for a new bot'; end if;
  end if;
  return jsonb_build_object('id', bot_id, 'client_id', p_client_id);
end; $$;

-- Never returns the token.
create or replace function public.list_hosted_bots(p_user_id uuid)
returns table(id uuid, client_id text, bot_name text, modules text[], config jsonb, enabled boolean, status text, last_error text, last_heartbeat timestamptz, updated_at timestamptz)
language sql security definer set search_path = '' as $$
  select b.id, b.client_id, b.bot_name, b.modules, b.config, b.enabled, b.status, b.last_error, b.last_heartbeat, b.updated_at
  from public.hosted_bots b where b.user_id = p_user_id order by b.created_at;
$$;

create or replace function public.set_hosted_bot_enabled(p_user_id uuid, p_id uuid, p_enabled boolean)
returns boolean language plpgsql security definer set search_path = '' as $$
begin
  update public.hosted_bots set enabled = p_enabled, updated_at = now() where id = p_id and user_id = p_user_id;
  return found;
end; $$;

create or replace function public.delete_hosted_bot(p_user_id uuid, p_id uuid)
returns boolean language plpgsql security definer set search_path = '' as $$
declare old_secret uuid;
begin
  delete from public.hosted_bots where id = p_id and user_id = p_user_id returning secret_id into old_secret;
  if old_secret is not null then perform vault.delete_secret(old_secret); return true; end if;
  return false;
end; $$;

-- Worker-only: runnable bots WITH tokens. service_role only.
create or replace function public.list_runnable_hosted_bots()
returns jsonb language sql security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'user_id', b.user_id, 'client_id', b.client_id, 'modules', b.modules,
    'config', b.config, 'updated_at', b.updated_at, 'token', v.decrypted_secret)), '[]'::jsonb)
  from public.hosted_bots b join vault.decrypted_secrets v on v.id = b.secret_id where b.enabled;
$$;

create or replace function public.set_hosted_bot_status(p_id uuid, p_status text, p_error text default null)
returns void language sql security definer set search_path = '' as $$
  update public.hosted_bots set status = p_status, last_error = p_error,
    last_heartbeat = case when p_status = 'online' then now() else last_heartbeat end
  where id = p_id;
$$;

revoke all on function public.save_hosted_bot(uuid,text,text,text,text[],jsonb) from public, anon, authenticated;
revoke all on function public.list_hosted_bots(uuid) from public, anon, authenticated;
revoke all on function public.set_hosted_bot_enabled(uuid,uuid,boolean) from public, anon, authenticated;
revoke all on function public.delete_hosted_bot(uuid,uuid) from public, anon, authenticated;
revoke all on function public.list_runnable_hosted_bots() from public, anon, authenticated;
revoke all on function public.set_hosted_bot_status(uuid,text,text) from public, anon, authenticated;
grant execute on function public.save_hosted_bot(uuid,text,text,text,text[],jsonb) to service_role;
grant execute on function public.list_hosted_bots(uuid) to service_role;
grant execute on function public.set_hosted_bot_enabled(uuid,uuid,boolean) to service_role;
grant execute on function public.delete_hosted_bot(uuid,uuid) to service_role;
grant execute on function public.list_runnable_hosted_bots() to service_role;
grant execute on function public.set_hosted_bot_status(uuid,text,text) to service_role;
