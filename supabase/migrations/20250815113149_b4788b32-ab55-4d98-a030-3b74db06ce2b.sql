-- Update the sight-reading-preview module to support assignments
UPDATE gw_modules 
SET description = 'Generate AI-powered sight-reading exercises with professional notation and evaluation',
    category = 'musical-leadership',
    default_permissions = ARRAY['view', 'manage']
WHERE name = 'sight-reading-preview';

-- Ensure we have the sight-reading-generator module
INSERT INTO gw_modules (name, description, category, is_active, default_permissions)
VALUES ('sight-reading-generator', 'Generate AI-powered sight-reading exercises with professional notation and evaluation', 'musical-leadership', true, ARRAY['view', 'manage'])
ON CONFLICT (name) DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  default_permissions = EXCLUDED.default_permissions;

-- Create a module assignments table for individual and group assignments
CREATE TABLE IF NOT EXISTS gw_module_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id UUID NOT NULL REFERENCES gw_modules(id) ON DELETE CASCADE,
  assigned_to_user_id UUID NULL, -- For individual assignments
  assigned_to_group TEXT NULL, -- For group assignments (e.g., 'executive_board', 'soprano', 'alto', etc.)
  assigned_by UUID NULL REFERENCES auth.users(id),
  assignment_type TEXT NOT NULL CHECK (assignment_type IN ('individual', 'group', 'role')),
  permissions TEXT[] NOT NULL DEFAULT ARRAY['view'],
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT,
  CONSTRAINT valid_assignment CHECK (
    (assignment_type = 'individual' AND assigned_to_user_id IS NOT NULL AND assigned_to_group IS NULL) OR
    (assignment_type IN ('group', 'role') AND assigned_to_group IS NOT NULL AND assigned_to_user_id IS NULL)
  )
);

-- Add RLS policies for module assignments
ALTER TABLE gw_module_assignments ENABLE ROW LEVEL SECURITY;

-- Admins can manage all assignments
CREATE POLICY "Admins can manage all module assignments"
ON gw_module_assignments FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Executive board members can view assignments for their modules
CREATE POLICY "Executive board can view module assignments"
ON gw_module_assignments FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM gw_profiles 
    WHERE user_id = auth.uid() 
    AND is_exec_board = true
  )
);

-- Users can view their own assignments
CREATE POLICY "Users can view their own module assignments"
ON gw_module_assignments FOR SELECT
USING (
  auth.uid() = assigned_to_user_id OR
  (assignment_type = 'group' AND assigned_to_group = 'all') OR
  (assignment_type = 'group' AND assigned_to_group = 'executive_board' AND 
   EXISTS (SELECT 1 FROM gw_profiles WHERE user_id = auth.uid() AND is_exec_board = true))
);

-- Function to check if user has module assignment
CREATE OR REPLACE FUNCTION user_has_module_assignment(p_user_id UUID, p_module_name TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_module_id UUID;
  v_user_profile RECORD;
BEGIN
  -- Get module ID
  SELECT id INTO v_module_id FROM gw_modules WHERE name = p_module_name AND is_active = true;
  IF v_module_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Get user profile
  SELECT * INTO v_user_profile FROM gw_profiles WHERE user_id = p_user_id;
  IF v_user_profile IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check for direct individual assignment
  IF EXISTS (
    SELECT 1 FROM gw_module_assignments 
    WHERE module_id = v_module_id 
    AND assigned_to_user_id = p_user_id 
    AND assignment_type = 'individual'
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  -- Check for group assignments
  IF EXISTS (
    SELECT 1 FROM gw_module_assignments 
    WHERE module_id = v_module_id 
    AND assignment_type = 'group'
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
    AND (
      assigned_to_group = 'all' OR
      (assigned_to_group = 'executive_board' AND v_user_profile.is_exec_board = true) OR
      (assigned_to_group = 'admin' AND (v_user_profile.is_admin = true OR v_user_profile.is_super_admin = true)) OR
      assigned_to_group = v_user_profile.voice_part OR
      assigned_to_group = v_user_profile.role
    )
  ) THEN
    RETURN true;
  END IF;
  
  -- Check role-based assignments (fallback to existing permissions)
  IF EXISTS (
    SELECT 1 FROM gw_module_permissions 
    WHERE module_id = v_module_id 
    AND user_id = p_user_id 
    AND is_active = true
    AND (expires_at IS NULL OR expires_at > now())
  ) THEN
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Add trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_module_assignments_updated_at
    BEFORE UPDATE ON gw_module_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();