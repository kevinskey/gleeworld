-- Lock down gw_profiles: the open read policy exposed sensitive columns
-- (measurements, GPA, addresses, emergency contacts, dues, notes,
-- calendar_feed_token) to every signed-in user. Member features only need
-- identity/contact fields, so those move to a directory view and the base
-- table becomes readable only by self, admins, and course TAs.

-- Definer-rights view (owner bypasses RLS); tenant isolation re-applied here.
drop view if exists public.gw_profiles_directory;
create view public.gw_profiles_directory as
  select
    id, user_id, email, full_name, first_name, last_name, middle_name,
    display_name, pronouns, avatar_url, headshot_url, bio,
    role, title, special_roles, role_tags, music_role,
    is_admin, is_super_admin, is_exec_board, exec_board_role,
    is_section_leader, is_mentor, is_featured,
    voice_part, voice_part_preference, class_year, classification,
    academic_year, graduation_year, major, mentor_opt_in,
    join_date, status, verified, disabled,
    phone, phone_number,
    instagram, twitter, facebook, youtube, website_url,
    created_at, tenant_id
  from public.gw_profiles
  where tenant_id = current_tenant_id();

revoke all on public.gw_profiles_directory from public, anon;
grant select on public.gw_profiles_directory to authenticated, service_role;

-- Exec board officers run wardrobe/dues/contract screens that need the full
-- row, and already hold profile UPDATE rights. Security definer avoids RLS
-- self-recursion (policy on gw_profiles querying gw_profiles).
create or replace function public.is_gw_exec_board()
returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from gw_profiles
    where user_id = auth.uid() and is_exec_board = true
  );
$$;
grant execute on function public.is_gw_exec_board() to authenticated;

create policy exec_board_read_profiles on public.gw_profiles
  for select to authenticated
  using (is_gw_exec_board());

-- Base table: drop the wide-open read. Remaining read policies:
--   "Admins can view all profiles" (admin or self)
--   profiles_select_self_admins_tas (self, admin, MUS240 TA)
--   users_can_view_own_profile (self)
drop policy if exists gw_profiles_public_read_limited on public.gw_profiles;
