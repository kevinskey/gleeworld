-- Step by step migration for module-based permissions

-- 1. Add key column to gw_modules if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='gw_modules' AND column_name='key') THEN
    ALTER TABLE public.gw_modules ADD COLUMN key TEXT;
  END IF;
END $$;

-- 2. Update existing modules with proper keys
UPDATE public.gw_modules SET key = lower(replace(replace(name, ' ', '-'), '&', 'and'))
WHERE key IS NULL;

-- 3. Create unique constraint
ALTER TABLE public.gw_modules DROP CONSTRAINT IF EXISTS gw_modules_key_unique;
ALTER TABLE public.gw_modules ADD CONSTRAINT gw_modules_key_unique UNIQUE (key);

-- 4. Make key not null
ALTER TABLE public.gw_modules ALTER COLUMN key SET NOT NULL;

-- 5. Create roles table
CREATE TABLE IF NOT EXISTS public.gw_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 6. Create username module permissions table
CREATE TABLE IF NOT EXISTS public.username_module_permissions (
  user_id UUID NOT NULL,
  module_id UUID NOT NULL REFERENCES public.gw_modules(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_manage BOOLEAN NOT NULL DEFAULT false,
  source TEXT NOT NULL DEFAULT 'override',
  granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  PRIMARY KEY (user_id, module_id)
);

-- 7. Insert default roles
INSERT INTO public.gw_roles (key, name) VALUES
  ('admin', 'Administrator'),
  ('super-admin', 'Super Administrator'),
  ('executive', 'Executive Board'),
  ('member', 'Member'),
  ('alumna', 'Alumna'),
  ('fan', 'Fan'),
  ('guest', 'Guest')
ON CONFLICT (key) DO NOTHING;

-- 8. Create simple function without complex views for now
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(module_key TEXT, module_name TEXT, category TEXT, can_view BOOLEAN, can_manage BOOLEAN)
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  -- Return all modules with default permissions for now
  -- This will be enhanced once role permissions are set up
  SELECT 
    m.key as module_key,
    m.name as module_name,
    m.category,
    true as can_view,
    false as can_manage
  FROM public.gw_modules m
  WHERE m.is_active = true
  ORDER BY m.category, m.name;
$$;

-- 9. Enable RLS
ALTER TABLE public.username_module_permissions ENABLE ROW LEVEL SECURITY;

-- 10. Create RLS policies
CREATE POLICY "Users can read own module overrides"
  ON public.username_module_permissions FOR SELECT
  USING (
    auth.uid() = user_id OR 
    EXISTS (
      SELECT 1 FROM public.gw_profiles gp
      WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
    )
  );

CREATE POLICY "Admins can manage all module overrides"
  ON public.username_module_permissions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.gw_profiles gp
      WHERE gp.user_id = auth.uid() AND (gp.is_admin = true OR gp.is_super_admin = true)
    )
  );