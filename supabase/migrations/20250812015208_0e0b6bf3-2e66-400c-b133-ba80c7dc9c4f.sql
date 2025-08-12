-- Grant Student Conductor access to Ariana Singleton
DO $$
DECLARE
  v_email text := 'arianasingleton@spelman.edu';
  v_module_slug text := 'student-conductor';
  v_user_id uuid;
  v_module_id uuid;
BEGIN
  -- 1) Username-based permission grant (safer fallback and used by enhanced checks)
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema='public' AND table_name='username_permissions'
  ) THEN
    IF EXISTS (
      SELECT 1 FROM public.username_permissions 
      WHERE user_email = v_email AND module_name = v_module_slug
    ) THEN
      UPDATE public.username_permissions
      SET is_active = true,
          expires_at = NULL,
          notes = 'Granted Student Conductor access via migration'
      WHERE user_email = v_email AND module_name = v_module_slug;
    ELSE
      INSERT INTO public.username_permissions (user_email, module_name, is_active, notes)
      VALUES (v_email, v_module_slug, true, 'Granted Student Conductor access via migration');
    END IF;
  ELSE
    RAISE NOTICE 'username_permissions table not found; skipping username-based grant.';
  END IF;

  -- 2) Direct module permission grant (ensures visibility where gw_module_permissions is used)
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gw_profiles') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gw_modules') AND
     EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='gw_module_permissions') THEN

    -- Find Ariana's user_id
    SELECT user_id INTO v_user_id 
    FROM public.gw_profiles 
    WHERE lower(email) = lower(v_email)
    LIMIT 1;

    -- Find module id by slug/name
    SELECT id INTO v_module_id 
    FROM public.gw_modules 
    WHERE name = v_module_slug OR lower(name) = lower('Student Conductor')
    LIMIT 1;

    IF v_user_id IS NULL THEN
      RAISE NOTICE 'User % not found in gw_profiles; skipping gw_module_permissions grant.', v_email;
    ELSIF v_module_id IS NULL THEN
      RAISE NOTICE 'Module % not found in gw_modules; skipping gw_module_permissions grant.', v_module_slug;
    ELSE
      -- Upsert view permission
      IF EXISTS (
        SELECT 1 FROM public.gw_module_permissions 
        WHERE user_id = v_user_id AND module_id = v_module_id AND permission_type = 'view'
      ) THEN
        UPDATE public.gw_module_permissions
        SET is_active = true,
            expires_at = NULL
        WHERE user_id = v_user_id AND module_id = v_module_id AND permission_type = 'view';
      ELSE
        INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
        VALUES (v_user_id, v_module_id, 'view', true);
      END IF;
    END IF;
  ELSE
    RAISE NOTICE 'gw_profiles/gw_modules/gw_module_permissions not present; skipping direct grant.';
  END IF;
END $$;