create table if not exists public.bot_provider_settings (
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('groq', 'xai')),
  secret_id uuid not null,
  model text,
  updated_at timestamptz not null default now(),
  primary key (user_id, provider)
);
alter table public.bot_provider_settings enable row level security;
revoke all on public.bot_provider_settings from anon, authenticated;
grant all on public.bot_provider_settings to service_role;

create or replace function public.save_bot_provider_setting(p_user_id uuid, p_provider text, p_api_key text, p_model text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare old_secret_id uuid; new_secret_id uuid;
begin
  if p_provider not in ('groq', 'xai') then raise exception 'Unsupported provider'; end if;
  if p_api_key is null or length(trim(p_api_key)) < 8 then raise exception 'API key is required'; end if;
  select secret_id into old_secret_id from public.bot_provider_settings where user_id = p_user_id and provider = p_provider;
  select vault.create_secret(p_api_key, 'bot-provider-' || p_provider || '-' || p_user_id::text, 'Encrypted AI provider credential') into new_secret_id;
  insert into public.bot_provider_settings(user_id, provider, secret_id, model, updated_at)
  values (p_user_id, p_provider, new_secret_id, nullif(p_model, ''), now())
  on conflict (user_id, provider) do update set secret_id = excluded.secret_id, model = excluded.model, updated_at = now();
  if old_secret_id is not null then perform vault.delete_secret(old_secret_id); end if;
  return jsonb_build_object('provider', p_provider, 'model', nullif(p_model, ''), 'connected', true);
end; $$;

create or replace function public.get_bot_provider_secret(p_user_id uuid, p_provider text)
returns jsonb language sql security definer set search_path = '' as $$
  select jsonb_build_object('provider', s.provider, 'model', s.model, 'api_key', v.decrypted_secret)
  from public.bot_provider_settings s join vault.decrypted_secrets v on v.id = s.secret_id
  where s.user_id = p_user_id and s.provider = p_provider limit 1;
$$;

create or replace function public.list_bot_provider_settings(p_user_id uuid)
returns table(provider text, model text, connected boolean, updated_at timestamptz)
language sql security definer set search_path = '' as $$
  select s.provider, s.model, true, s.updated_at from public.bot_provider_settings s where s.user_id = p_user_id;
$$;

create or replace function public.delete_bot_provider_setting(p_user_id uuid, p_provider text)
returns boolean language plpgsql security definer set search_path = '' as $$
declare old_secret_id uuid;
begin
  delete from public.bot_provider_settings where user_id = p_user_id and provider = p_provider returning secret_id into old_secret_id;
  if old_secret_id is not null then perform vault.delete_secret(old_secret_id); return true; end if;
  return false;
end; $$;

revoke all on function public.save_bot_provider_setting(uuid,text,text,text) from public, anon, authenticated;
revoke all on function public.get_bot_provider_secret(uuid,text) from public, anon, authenticated;
revoke all on function public.list_bot_provider_settings(uuid) from public, anon, authenticated;
revoke all on function public.delete_bot_provider_setting(uuid,text) from public, anon, authenticated;
grant execute on function public.save_bot_provider_setting(uuid,text,text,text) to service_role;
grant execute on function public.get_bot_provider_secret(uuid,text) to service_role;
grant execute on function public.list_bot_provider_settings(uuid) to service_role;
grant execute on function public.delete_bot_provider_setting(uuid,text) to service_role;
