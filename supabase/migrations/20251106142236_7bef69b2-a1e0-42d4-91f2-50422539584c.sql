-- Ensure alumnae-management module exists in gw_modules so it appears in dashboards
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_modules WHERE key = 'alumnae-management'
  ) THEN
    INSERT INTO public.gw_modules (name, key, description, category, is_active)
    VALUES (
      'alumnae-management',
      'alumnae-management',
      'Comprehensive CMS for managing the Alumnae page (hero, page builder, newsletters, interviews, spotlights, announcements, forms, users).',
      'communications',
      true
    );
  ELSE
    UPDATE public.gw_modules
    SET 
      name = 'alumnae-management',
      description = 'Comprehensive CMS for managing the Alumnae page (hero, page builder, newsletters, interviews, spotlights, announcements, forms, users).',
      category = 'communications',
      is_active = true
    WHERE key = 'alumnae-management';
  END IF;
END $$;

-- Optionally grant default view/manage to admins via grants table if it exists
-- (best-effort; ignore if table doesn't exist)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'gw_module_grants'
  ) THEN
    -- Ensure a grant template exists for admins (role-based). Adjust columns if your schema differs.
    -- This block assumes a schema (module_key text, role text, can_view boolean, can_manage boolean)
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_module_grants 
      WHERE module_key = 'alumnae-management' AND role = 'admin'
    ) THEN
      INSERT INTO public.gw_module_grants (module_key, role, can_view, can_manage)
      VALUES ('alumnae-management', 'admin', true, true);
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.gw_module_grants 
      WHERE module_key = 'alumnae-management' AND role = 'super-admin'
    ) THEN
      INSERT INTO public.gw_module_grants (module_key, role, can_view, can_manage)
      VALUES ('alumnae-management', 'super-admin', true, true);
    END IF;
  END IF;
END $$;