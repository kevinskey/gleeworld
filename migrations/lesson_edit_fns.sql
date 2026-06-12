-- Lesson editing RPCs. Templates (is_template, tenant_id null) are editable only by
-- super admins; tenant copies by tenant admins. RLS blocks direct template updates,
-- so these run SECURITY DEFINER with explicit checks.

create or replace function public.update_academy_lesson(
  p_lesson_id uuid,
  p_title text,
  p_content text,
  p_objectives jsonb,
  p_listening jsonb
) returns void
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_lesson record;
  v_is_super boolean;
begin
  select id, tenant_id, is_template into v_lesson
  from gw_academy_lessons where id = p_lesson_id;
  if v_lesson.id is null then
    raise exception 'Lesson not found';
  end if;

  select coalesce(bool_or(is_super_admin), false) into v_is_super
  from gw_profiles where user_id = auth.uid() or id = auth.uid();

  if v_lesson.is_template then
    if not v_is_super then
      raise exception 'Only super admins can edit template lessons';
    end if;
  else
    if v_lesson.tenant_id is distinct from public.current_tenant_id()
       or coalesce(auth.jwt()->>'tenant_role','') not in ('admin','super_admin') then
      raise exception 'Only tenant admins can edit lessons';
    end if;
  end if;

  update gw_academy_lessons
  set title = coalesce(p_title, title),
      content = p_content,
      objectives = coalesce(p_objectives, '[]'::jsonb),
      listening = coalesce(p_listening, '[]'::jsonb)
  where id = p_lesson_id;
end $$;

create or replace function public.add_academy_lesson(
  p_unit_id uuid,
  p_title text
) returns uuid
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_unit record;
  v_is_super boolean;
  v_new uuid;
begin
  select id, tenant_id, is_template into v_unit
  from gw_academy_units where id = p_unit_id;
  if v_unit.id is null then
    raise exception 'Unit not found';
  end if;

  select coalesce(bool_or(is_super_admin), false) into v_is_super
  from gw_profiles where user_id = auth.uid() or id = auth.uid();

  if v_unit.is_template then
    if not v_is_super then
      raise exception 'Only super admins can edit template courses';
    end if;
  else
    if v_unit.tenant_id is distinct from public.current_tenant_id()
       or coalesce(auth.jwt()->>'tenant_role','') not in ('admin','super_admin') then
      raise exception 'Only tenant admins can add lessons';
    end if;
  end if;

  insert into gw_academy_lessons (unit_id, tenant_id, is_template, sort_order, title, objectives, content, listening)
  select p_unit_id, v_unit.tenant_id, v_unit.is_template,
         coalesce(max(sort_order), 0) + 1, p_title, '[]'::jsonb, null, '[]'::jsonb
  from gw_academy_lessons where unit_id = p_unit_id
  returning id into v_new;
  return v_new;
end $$;

grant execute on function public.update_academy_lesson(uuid, text, text, jsonb, jsonb) to authenticated;
grant execute on function public.add_academy_lesson(uuid, text) to authenticated;
