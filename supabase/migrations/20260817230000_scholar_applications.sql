-- Scholar program applications (built for Lyke House's Sr. Thea Bowman
-- Scholar Music Program; tenant-neutral). Anonymous visitors apply from the
-- public site's `scholar-application` block — no account needed — via a
-- slug-resolving SECURITY DEFINER RPC (same model as gw_fan_signup_submit).
-- Staff review in the course People tab; accepting calls gw-invite-student,
-- which creates the account, enrolls the student, and emails a sign-in link.
-- Self-hosted: record-only; apply by hand as supabase_admin.

create table if not exists public.gw_scholar_applications (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null default current_tenant_id(),
  course_id uuid references public.gw_courses(id) on delete set null,
  academic_year text,
  full_name text not null,
  email text not null,
  phone text,
  alt_phone text,
  address text,
  city_state_zip text,
  classification text,
  age text,
  school text,
  major_minor text,
  instrument_voice text,
  emergency_name text,
  emergency_relationship text,
  emergency_phone text,
  -- The applicant types their name as a signature and checks "I agree";
  -- agreed_at is the server-side timestamp of that acceptance.
  signature_name text not null,
  agreed_at timestamptz not null default now(),
  status text not null default 'submitted'
    check (status in ('submitted', 'accepted', 'declined')),
  decided_by uuid,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One application per email per course per tenant. Re-submitting refreshes
-- the pending row; decided rows are never clobbered (see RPC).
create unique index if not exists gw_scholar_applications_dedupe_idx
  on public.gw_scholar_applications
  (tenant_id, coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email));

alter table public.gw_scholar_applications enable row level security;

-- Staff of the owning tenant read and decide; nobody else touches the table
-- directly. Anon submissions go through the RPC below (definer bypasses RLS).
drop policy if exists scholar_apps_staff_select on public.gw_scholar_applications;
create policy scholar_apps_staff_select on public.gw_scholar_applications
  for select to authenticated
  using (public.is_staff_of_tenant(tenant_id));

drop policy if exists scholar_apps_staff_update on public.gw_scholar_applications;
create policy scholar_apps_staff_update on public.gw_scholar_applications
  for update to authenticated
  using (public.is_staff_of_tenant(tenant_id))
  with check (public.is_staff_of_tenant(tenant_id));

drop policy if exists scholar_apps_staff_delete on public.gw_scholar_applications;
create policy scholar_apps_staff_delete on public.gw_scholar_applications
  for delete to authenticated
  using (public.is_staff_of_tenant(tenant_id));

-- Anon-callable submission RPC. Resolves the tenant from the PUBLISHED site
-- slug (standing rule: public-site blocks write through slug-resolving
-- definer RPCs, never direct inserts relying on current_tenant_id()), and
-- the course from its code within that tenant.
create or replace function public.submit_scholar_application(
  p_slug text,
  p_course_code text,
  p_payload jsonb
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_course uuid;
  v_email text := lower(trim(coalesce(p_payload->>'email', '')));
  v_name text := nullif(trim(coalesce(p_payload->>'full_name', '')), '');
  v_signature text := nullif(trim(coalesce(p_payload->>'signature_name', '')), '');
begin
  if v_name is null then
    raise exception 'name is required' using errcode = '22023';
  end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid email' using errcode = '22023';
  end if;
  if v_signature is null or coalesce(p_payload->>'agreed', 'false') <> 'true' then
    raise exception 'the agreement must be signed' using errcode = '22023';
  end if;

  select s.tenant_id into v_tenant
    from gw_public_sites s
   where s.slug = p_slug and s.is_published = true
   limit 1;
  if v_tenant is null then
    raise exception 'site not found or not published' using errcode = '42P01';
  end if;

  if nullif(trim(coalesce(p_course_code, '')), '') is not null then
    select c.id into v_course
      from gw_courses c
     where c.tenant_id = v_tenant
       and upper(c.course_code) = upper(trim(p_course_code))
     limit 1;
  end if;

  insert into gw_scholar_applications (
    tenant_id, course_id, academic_year, full_name, email, phone, alt_phone,
    address, city_state_zip, classification, age, school, major_minor,
    instrument_voice, emergency_name, emergency_relationship, emergency_phone,
    signature_name
  ) values (
    v_tenant, v_course,
    left(nullif(trim(coalesce(p_payload->>'academic_year', '')), ''), 20),
    left(v_name, 120), v_email,
    left(nullif(trim(coalesce(p_payload->>'phone', '')), ''), 30),
    left(nullif(trim(coalesce(p_payload->>'alt_phone', '')), ''), 30),
    left(nullif(trim(coalesce(p_payload->>'address', '')), ''), 200),
    left(nullif(trim(coalesce(p_payload->>'city_state_zip', '')), ''), 120),
    left(nullif(trim(coalesce(p_payload->>'classification', '')), ''), 40),
    left(nullif(trim(coalesce(p_payload->>'age', '')), ''), 10),
    left(nullif(trim(coalesce(p_payload->>'school', '')), ''), 120),
    left(nullif(trim(coalesce(p_payload->>'major_minor', '')), ''), 120),
    left(nullif(trim(coalesce(p_payload->>'instrument_voice', '')), ''), 80),
    left(nullif(trim(coalesce(p_payload->>'emergency_name', '')), ''), 120),
    left(nullif(trim(coalesce(p_payload->>'emergency_relationship', '')), ''), 60),
    left(nullif(trim(coalesce(p_payload->>'emergency_phone', '')), ''), 30),
    left(v_signature, 120)
  )
  on conflict (tenant_id, coalesce(course_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(email))
  do update set
    academic_year = excluded.academic_year,
    full_name = excluded.full_name,
    phone = excluded.phone,
    alt_phone = excluded.alt_phone,
    address = excluded.address,
    city_state_zip = excluded.city_state_zip,
    classification = excluded.classification,
    age = excluded.age,
    school = excluded.school,
    major_minor = excluded.major_minor,
    instrument_voice = excluded.instrument_voice,
    emergency_name = excluded.emergency_name,
    emergency_relationship = excluded.emergency_relationship,
    emergency_phone = excluded.emergency_phone,
    signature_name = excluded.signature_name,
    agreed_at = now(),
    updated_at = now()
  where gw_scholar_applications.status = 'submitted';

  return jsonb_build_object('ok', true);
end;
$$;

grant execute on function public.submit_scholar_application(text, text, jsonb) to anon, authenticated;
