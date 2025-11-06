-- Upsert Alumnae Page Management module so it appears in dashboards
-- Safe upsert using unique key when available
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
      is_active = true,
      updated_at = now()
    WHERE key = 'alumnae-management';
  END IF;
END $$;