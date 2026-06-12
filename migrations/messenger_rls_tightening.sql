-- Tighten messenger RLS: messages and rosters are visible to group members
-- only; membership rows are self-managed (mute/last-read) or admin-managed.

-- Security definer avoids RLS self-recursion when policies on
-- gw_group_members / gw_group_messages need a membership check.
create or replace function public.is_gw_group_member(gid uuid)
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gw_group_members
    where group_id = gid and user_id = auth.uid()
  );
$$;
grant execute on function public.is_gw_group_member(uuid) to authenticated;

-- Messages: read/write only for group members (admin policies remain).
drop policy if exists simple_view_all_messages on public.gw_group_messages;
create policy members_read_messages on public.gw_group_messages
  for select to authenticated
  using (is_gw_group_member(group_id));

drop policy if exists simple_send_messages on public.gw_group_messages;
create policy members_send_messages on public.gw_group_messages
  for insert to authenticated
  with check (user_id = auth.uid() and is_gw_group_member(group_id));

-- Memberships: drop the wide-open policies.
drop policy if exists "Users can view group memberships" on public.gw_group_members;
drop policy if exists "System can manage memberships" on public.gw_group_members;

create policy members_view_rosters on public.gw_group_members
  for select to authenticated
  using (is_gw_group_member(group_id));

create policy manage_own_membership on public.gw_group_members
  for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy leave_group on public.gw_group_members
  for delete to authenticated
  using (user_id = auth.uid());

create policy creator_adds_self on public.gw_group_members
  for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1 from gw_message_groups g
      where g.id = group_id and g.created_by = auth.uid()
    )
  );

-- Groups: keep "Everyone can view active message groups" (directory), drop
-- the unconditional read.
drop policy if exists simple_view_all_groups on public.gw_message_groups;
