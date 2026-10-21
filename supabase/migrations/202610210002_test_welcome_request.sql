-- "Send test welcome" button: the website queues a request, the always-on worker posts one
-- sample welcome message and writes the result back so the dashboard can show it.
-- Additive only: new columns and new functions, nothing existing is changed or dropped.
alter table public.hosted_bots
  add column if not exists test_requested_at timestamptz,
  add column if not exists test_result text,
  add column if not exists test_done_at timestamptz;

-- Test state per bot for one user (the edge function merges it into the bot list).
create or replace function public.list_test_welcome_state(p_user_id uuid)
returns table(id uuid, test_requested_at timestamptz, test_result text, test_done_at timestamptz)
language sql security definer set search_path = '' as $$
  select b.id, b.test_requested_at, b.test_result, b.test_done_at
  from public.hosted_bots b where b.user_id = p_user_id;
$$;

-- Owner only (the edge function passes the signed-in user). Rate limited: one request per bot
-- every 10 seconds, and a request still waiting after 30 seconds may be queued again.
create or replace function public.request_test_welcome(p_user_id uuid, p_id uuid)
returns text language plpgsql security definer set search_path = '' as $$
declare b public.hosted_bots;
begin
  select * into b from public.hosted_bots where id = p_id and user_id = p_user_id;
  if not found then return 'not_found'; end if;
  if b.test_requested_at is not null and b.test_requested_at > now() - interval '30 seconds' then return 'busy'; end if;
  if b.test_done_at is not null and b.test_done_at > now() - interval '10 seconds' then return 'busy'; end if;
  update public.hosted_bots set test_requested_at = now(), test_result = null, test_done_at = null where id = p_id;
  return 'queued';
end; $$;

-- Worker only.
create or replace function public.list_pending_test_welcomes()
returns table(id uuid)
language sql security definer set search_path = '' as $$
  select b.id from public.hosted_bots b where b.test_requested_at is not null and b.enabled;
$$;

create or replace function public.finish_test_welcome(p_id uuid, p_result text)
returns void language sql security definer set search_path = '' as $$
  update public.hosted_bots
  set test_result = left(coalesce(p_result, ''), 300), test_done_at = now(), test_requested_at = null
  where id = p_id;
$$;

revoke all on function public.list_test_welcome_state(uuid) from public, anon, authenticated;
revoke all on function public.request_test_welcome(uuid,uuid) from public, anon, authenticated;
revoke all on function public.list_pending_test_welcomes() from public, anon, authenticated;
revoke all on function public.finish_test_welcome(uuid,text) from public, anon, authenticated;
grant execute on function public.list_test_welcome_state(uuid) to service_role;
grant execute on function public.request_test_welcome(uuid,uuid) to service_role;
grant execute on function public.list_pending_test_welcomes() to service_role;
grant execute on function public.finish_test_welcome(uuid,text) to service_role;
