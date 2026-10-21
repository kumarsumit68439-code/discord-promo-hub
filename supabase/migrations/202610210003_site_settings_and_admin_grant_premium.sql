-- Per-user site customisation (theme, animation, effect, language)
create table if not exists public.user_site_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  theme text not null default 'default',
  animation text not null default 'default',
  effect text not null default 'none',
  language text not null default 'auto',
  updated_at timestamptz not null default now()
);

alter table public.user_site_settings enable row level security;

drop policy if exists "own settings select" on public.user_site_settings;
drop policy if exists "own settings insert" on public.user_site_settings;
drop policy if exists "own settings update" on public.user_site_settings;

create policy "own settings select" on public.user_site_settings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own settings insert" on public.user_site_settings
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "own settings update" on public.user_site_settings
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- Admin: give / extend / revoke premium for free (p_days = 0 removes premium)
create or replace function public.admin_grant_premium(target_id uuid, p_days integer)
returns timestamptz
language plpgsql
security definer
set search_path = ''
as $$
declare
  caller_role text;
  base timestamptz;
  result timestamptz;
begin
  if auth.uid() is null then
    raise exception 'login required';
  end if;
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('owner','acting_owner','admin') then
    raise exception 'only admin can give premium';
  end if;
  if p_days is null or p_days < 0 or p_days > 3650 then
    raise exception 'days must be between 0 and 3650';
  end if;
  if not exists (select 1 from public.profiles where id = target_id) then
    raise exception 'user not found';
  end if;

  insert into public.user_plans(user_id) values (target_id) on conflict (user_id) do nothing;

  if p_days = 0 then
    update public.user_plans set premium_until = now(), updated_at = now() where user_id = target_id
      returning premium_until into result;
  else
    select greatest(coalesce(premium_until, now()), now()) into base from public.user_plans where user_id = target_id;
    update public.user_plans set premium_until = base + make_interval(days => p_days), updated_at = now()
      where user_id = target_id returning premium_until into result;
  end if;
  return result;
end;
$$;

-- Admin: list users with active premium (shown in the admin panel)
create or replace function public.admin_list_premium()
returns table(user_id uuid, premium_until timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare caller_role text;
begin
  if auth.uid() is null then raise exception 'login required'; end if;
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is null or caller_role not in ('owner','acting_owner','admin') then
    raise exception 'only admin';
  end if;
  return query select up.user_id, up.premium_until from public.user_plans up where up.premium_until is not null and up.premium_until > now();
end;
$$;

revoke all on function public.admin_grant_premium(uuid, integer) from public, anon;
revoke all on function public.admin_list_premium() from public, anon;
grant execute on function public.admin_grant_premium(uuid, integer) to authenticated;
grant execute on function public.admin_list_premium() to authenticated;
