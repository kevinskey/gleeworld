-- Phase 1: course templates + clone RPC. Two new code paths share a single
-- deep-copy mechanism. Templates can live on the main tenant (platform-wide,
-- visible to every tenant) or on any tenant (visible only to that tenant).
-- Cloning copies units / lessons / assignments (with date shift) but never
-- enrollments, attendance, or submissions — each section gets a fresh roster.

-- 1. Mark a course as a template. Used by both platform admins (who author
--    courses on the main tenant and flip the flag to publish them to every
--    tenant's Course Library) and by tenant directors (who flag a course as
--    a reusable template within their tenant).
alter table public.gw_courses add column if not exists is_template boolean not null default false;
create index if not exists gw_courses_is_template_idx on public.gw_courses(is_template) where is_template = true;

-- 2. List templates available to the calling tenant.
--    Returns: platform-wide templates (main tenant, is_template=true) + the
--    calling tenant's own templates (is_template=true). Bypasses RLS via
--    SECURITY DEFINER so a tenant's teachers can see platform courses
--    without us widening tenant_id RLS.
create or replace function public.get_course_templates_for_tenant()
returns table (
  id uuid,
  source_tenant_slug text,
  course_code text,
  title text,
  description text,
  unit_count int,
  lesson_count int,
  assignment_count int,
  is_platform boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with main_tenant as (select id from gw_tenants where slug = 'main' limit 1),
       my_tenant as (select coalesce(current_tenant_id(), anon_tenant_id()) as id)
  select
    c.id,
    t.slug as source_tenant_slug,
    coalesce(c.course_code, c.code) as course_code,
    c.title,
    c.description,
    (select count(*)::int from gw_academy_units u where u.course_id = c.id) as unit_count,
    (select count(*)::int from gw_academy_lessons l
     join gw_academy_units u on u.id = l.unit_id where u.course_id = c.id) as lesson_count,
    (select count(*)::int from gw_course_assignments a where a.course_id = c.id) as assignment_count,
    (c.tenant_id = (select id from main_tenant)) as is_platform
  from gw_courses c
  join gw_tenants t on t.id = c.tenant_id
  where c.is_template = true
    and (
      c.tenant_id = (select id from main_tenant)   -- platform-wide template
      or c.tenant_id = (select id from my_tenant)  -- own tenant template
    )
  order by is_platform desc, c.created_at desc;
$$;

grant execute on function public.get_course_templates_for_tenant() to authenticated;

-- 3. List the caller's reusable past classes ("Reuse Mine" tab). Excludes
--    templates (those go in tab 1) and other instructors' classes (RLS handles
--    tenant scoping, this adds instructor scoping).
create or replace function public.get_my_past_courses()
returns table (
  id uuid,
  course_code text,
  title text,
  description text,
  semester text,
  term text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    c.id,
    coalesce(c.course_code, c.code) as course_code,
    c.title,
    c.description,
    c.semester::text,
    c.term,
    c.created_at
  from gw_courses c
  where c.instructor_id = auth.uid()
    and c.tenant_id = current_tenant_id()
    and c.is_template = false
  order by c.created_at desc
  limit 50;
$$;

grant execute on function public.get_my_past_courses() to authenticated;

-- 4. The deep-clone RPC. One path covers all three sources (platform template,
--    tenant template, teacher's past class). Copies the COURSE STRUCTURE but
--    NEVER copies roster / attendance / submissions / grades — every clone is
--    a fresh class for a fresh cohort.
create or replace function public.gw_clone_course(
  p_source_id uuid,
  p_new_title text,
  p_new_code text,
  p_start_date date,
  p_term text default null,
  p_semester text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_source gw_courses;
  v_new_id uuid;
  v_main_tenant uuid;
  v_my_tenant uuid := current_tenant_id();
  v_caller uuid := auth.uid();
  v_source_anchor date;
  v_shift_days int := 0;
begin
  -- Auth: must be signed in.
  if v_caller is null then raise exception 'auth required'; end if;

  -- Load source. Allow read if source is on caller's tenant OR is a platform
  -- template (main tenant + is_template=true).
  select id into v_main_tenant from gw_tenants where slug = 'main' limit 1;
  select * into v_source from gw_courses where id = p_source_id;
  if not found then raise exception 'source course not found'; end if;

  if v_source.tenant_id <> v_my_tenant
     and not (v_source.tenant_id = v_main_tenant and v_source.is_template = true) then
    raise exception 'cannot clone from another tenant unless it is a platform template';
  end if;

  -- Compute date shift. Anchor is the source's start_date if set, else the
  -- earliest assignment's available_from. Falls back to created_at::date if
  -- nothing else is available.
  if v_source.start_date is not null then
    v_source_anchor := v_source.start_date;
  else
    select min(coalesce(available_from, due_date))::date into v_source_anchor
    from gw_course_assignments where course_id = v_source.id;
    if v_source_anchor is null then
      v_source_anchor := v_source.created_at::date;
    end if;
  end if;
  v_shift_days := (p_start_date - v_source_anchor);

  -- Insert the new course on caller's tenant + as the calling instructor.
  insert into gw_courses (
    tenant_id, code, course_code, title, description, term, semester,
    instructor_id, instructor_name, instructor_email,
    start_date, end_date, meeting_patterns,
    is_active, is_template, is_free, price_cents, max_enrollment,
    created_by, created_at
  )
  select
    v_my_tenant,
    coalesce(p_new_code, v_source.code),
    coalesce(p_new_code, v_source.course_code),
    coalesce(p_new_title, v_source.title),
    v_source.description,
    coalesce(p_term, v_source.term),
    coalesce(p_semester, v_source.semester),
    v_caller,
    coalesce((select full_name from gw_profiles where user_id = v_caller limit 1), v_source.instructor_name),
    coalesce((select email from gw_profiles where user_id = v_caller limit 1), v_source.instructor_email),
    p_start_date,
    case when v_source.end_date is not null and v_source.start_date is not null
         then p_start_date + (v_source.end_date - v_source.start_date)
         else null end,
    v_source.meeting_patterns,
    true,
    false,        -- clone is NEVER itself a template
    v_source.is_free,
    v_source.price_cents,
    v_source.max_enrollment,
    v_caller,
    now()
  returning id into v_new_id;

  -- Copy units (clearing template flag) and remember old→new ids.
  with new_units as (
    insert into gw_academy_units (tenant_id, course_id, title, sort_order, is_template)
    select v_my_tenant, v_new_id, title, sort_order, false
    from gw_academy_units where course_id = v_source.id
    returning id, title, sort_order
  ),
  old_units as (
    select id, title, sort_order
    from gw_academy_units where course_id = v_source.id
  ),
  unit_map as (
    select o.id as old_id, n.id as new_id
    from old_units o
    join new_units n on n.title = o.title and n.sort_order = o.sort_order
  )
  -- Copy lessons, remapping unit_id via the title/sort_order match above.
  insert into gw_academy_lessons (tenant_id, unit_id, title, sort_order, objectives, content, listening, is_template)
  select v_my_tenant, m.new_id, l.title, l.sort_order, l.objectives, l.content, l.listening, false
  from gw_academy_lessons l
  join unit_map m on m.old_id = l.unit_id;

  -- Copy assignments with date shift. is_published carried over so the clone
  -- starts in the same publish state as the source.
  insert into gw_course_assignments (
    tenant_id, course_id, title, description, instructions, assignment_type,
    points, due_date, available_from, available_until,
    allow_late_submissions, late_penalty_percent,
    rubric_id, is_published, display_order, created_by, created_at
  )
  select
    v_my_tenant, v_new_id, title, description, instructions, assignment_type,
    points,
    case when due_date is not null then due_date + (v_shift_days || ' days')::interval end,
    case when available_from is not null then available_from + (v_shift_days || ' days')::interval end,
    case when available_until is not null then available_until + (v_shift_days || ' days')::interval end,
    allow_late_submissions, late_penalty_percent,
    rubric_id, is_published, display_order, v_caller, now()
  from gw_course_assignments
  where course_id = v_source.id;

  return v_new_id;
end;
$$;

grant execute on function public.gw_clone_course(uuid, text, text, date, text, text) to authenticated;

-- 5. Student academic record — every enrollment + grade + attendance summary
--    that belongs to the calling student, in order. Accessible by the student
--    themselves (own user_id) and by admins of their tenant.
create or replace function public.get_student_academic_record(p_user_id uuid default null)
returns table (
  course_id uuid,
  course_code text,
  course_title text,
  term text,
  semester text,
  enrolled_at timestamptz,
  completed_at timestamptz,
  enrollment_status text,
  grade text,
  final_percentage numeric,
  credit_hours int,
  excused_absences int,
  unexcused_absences int,
  tardies int
)
language sql
stable
security definer
set search_path = public
as $$
  with target as (
    select coalesce(p_user_id, auth.uid()) as user_id
  ),
  permitted as (
    select t.user_id from target t
    where t.user_id = auth.uid()
       or exists (
         select 1 from gw_profiles p
         where p.user_id = auth.uid()
           and p.tenant_id = (select tenant_id from gw_profiles where user_id = t.user_id limit 1)
           and (p.is_admin = true or p.is_super_admin = true
                or p.role in ('admin','super-admin','executive'))
       )
  )
  select
    c.id,
    coalesce(c.course_code, c.code),
    c.title,
    c.term,
    c.semester::text,
    e.enrolled_at,
    e.completed_at,
    e.enrollment_status::text,
    e.grade::text,
    e.final_percentage,
    e.credit_hours,
    coalesce(s.excused_rehearsal_absences, 0) + coalesce(s.excused_performance_absences, 0),
    coalesce(s.unexcused_rehearsal_absences, 0) + coalesce(s.unexcused_performance_absences, 0),
    coalesce(s.tardies, 0)
  from gw_course_enrollments e
  join gw_courses c on c.id = e.course_id
  left join gw_course_attendance_summary s on s.course_id = e.course_id and s.student_id = e.user_id
  where e.user_id in (select user_id from permitted)
  order by c.created_at desc;
$$;

grant execute on function public.get_student_academic_record(uuid) to authenticated;
