-- Per-member group muting + unread count helpers for messenger.
alter table public.gw_group_members
  add column if not exists muted boolean not null default false;

-- Unread counts per group for the calling user (includes muted flag for UI).
create or replace function public.gw_unread_counts()
returns table(group_id uuid, unread bigint, muted boolean)
language sql stable security definer set search_path = public as $$
  select gm.group_id,
         count(m.id) filter (where m.user_id <> gm.user_id
           and m.created_at > coalesce(gm.last_read_at, 'epoch'::timestamptz)),
         gm.muted
  from gw_group_members gm
  left join gw_group_messages m on m.group_id = gm.group_id
  where gm.user_id = auth.uid()
  group by gm.group_id, gm.muted;
$$;
grant execute on function public.gw_unread_counts() to authenticated;

-- Total unread per user (app icon badge), service-role only.
create or replace function public.gw_unread_totals(uids uuid[])
returns table(user_id uuid, unread bigint)
language sql stable security definer set search_path = public as $$
  select gm.user_id, count(m.id)
  from gw_group_members gm
  join gw_group_messages m on m.group_id = gm.group_id
    and m.user_id <> gm.user_id
    and m.created_at > coalesce(gm.last_read_at, 'epoch'::timestamptz)
  where gm.user_id = any(uids) and gm.muted = false
  group by gm.user_id;
$$;
revoke all on function public.gw_unread_totals(uuid[]) from public, anon, authenticated;
grant execute on function public.gw_unread_totals(uuid[]) to service_role;
