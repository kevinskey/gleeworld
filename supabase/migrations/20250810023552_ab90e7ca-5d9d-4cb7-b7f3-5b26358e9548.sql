-- Seed missing modules and grant Onnesty Peele access
DO $$
DECLARE
  v_user_id uuid := 'b648f12d-9a63-4eae-b768-413a467567b4';
  v_mod_tour uuid;
  v_mod_approval uuid;
  v_mod_receipts uuid;
BEGIN
  -- Ensure gw_modules has required entries
  IF NOT EXISTS (SELECT 1 FROM public.gw_modules WHERE name = 'tour-management') THEN
    INSERT INTO public.gw_modules (name, is_active) VALUES ('tour-management', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gw_modules WHERE name = 'approval-system') THEN
    INSERT INTO public.gw_modules (name, is_active) VALUES ('approval-system', true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.gw_modules WHERE name = 'receipts-records') THEN
    INSERT INTO public.gw_modules (name, is_active) VALUES ('receipts-records', true);
  END IF;

  -- Fetch IDs
  SELECT id INTO v_mod_tour FROM public.gw_modules WHERE name = 'tour-management' LIMIT 1;
  SELECT id INTO v_mod_approval FROM public.gw_modules WHERE name = 'approval-system' LIMIT 1;
  SELECT id INTO v_mod_receipts FROM public.gw_modules WHERE name = 'receipts-records' LIMIT 1;

  -- Helper to upsert permissions
  -- Tour Manager
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_tour AND permission_type = 'view' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_tour, 'view', true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_tour AND permission_type = 'manage' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_tour, 'manage', true);
  END IF;

  -- Approval System (PO/ER)
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_approval AND permission_type = 'view' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_approval, 'view', true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_approval AND permission_type = 'manage' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_approval, 'manage', true);
  END IF;

  -- Receipts & Records
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_receipts AND permission_type = 'view' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_receipts, 'view', true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.gw_module_permissions 
    WHERE user_id = v_user_id AND module_id = v_mod_receipts AND permission_type = 'manage' AND is_active = true
  ) THEN
    INSERT INTO public.gw_module_permissions (user_id, module_id, permission_type, is_active)
    VALUES (v_user_id, v_mod_receipts, 'manage', true);
  END IF;
END $$;