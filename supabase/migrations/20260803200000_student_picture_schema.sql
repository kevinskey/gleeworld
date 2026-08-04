-- student_picture: private normalization layer for the assistant advisor.
-- Views here are NOT exposed to PostgREST. Only the RPCs in
-- student_picture_rpcs.sql are callable by clients.
create schema if not exists student_picture;

comment on schema student_picture is
  'Adapter views normalizing assignments/grades/attendance/money onto a shared contract. Private: exposed only through public RPCs.';

grant usage on schema student_picture to authenticated;

-- Resolve a gw_profiles row id to its auth user id.
-- STABLE + security invoker: RLS on gw_profiles still applies.
create or replace function student_picture.person_user_id(profile_id uuid)
returns uuid
language sql
stable
as $$
  select p.user_id from public.gw_profiles p where p.id = profile_id;
$$;

grant execute on function student_picture.person_user_id(uuid) to authenticated;
