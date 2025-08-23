-- Create executive board members table (fixed version)
CREATE TABLE IF NOT EXISTS public.gw_executive_board_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  position TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  assigned_by UUID REFERENCES auth.users(id),
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_executive_board_members ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "exec_board_members_admin_manage_all" 
ON public.gw_executive_board_members 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "exec_board_members_view_active" 
ON public.gw_executive_board_members 
FOR SELECT 
TO authenticated 
USING (is_active = true);

-- Create executive board module permissions table
CREATE TABLE IF NOT EXISTS public.executive_board_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position TEXT NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(position, module_key)
);

-- Enable RLS
ALTER TABLE public.executive_board_module_permissions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "exec_module_permissions_admin_manage" 
ON public.executive_board_module_permissions 
FOR ALL 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "exec_module_permissions_view_all" 
ON public.executive_board_module_permissions 
FOR SELECT 
TO authenticated 
USING (true);

-- Insert default executive board positions with their typical module permissions
INSERT INTO public.executive_board_module_permissions (position, module_key, can_view, can_manage) VALUES
-- President permissions (full access)
('President', 'user-management', true, true),
('President', 'calendar-management', true, true),
('President', 'notifications', true, true),
('President', 'email-management', true, true),
('President', 'attendance-management', true, false),
('President', 'booking-forms', true, true),
('President', 'budgets', true, false),

-- Vice President permissions
('Vice President', 'user-management', true, false),
('Vice President', 'calendar-management', true, true),
('Vice President', 'notifications', true, false),
('Vice President', 'attendance-management', true, false),

-- Secretary permissions
('Secretary', 'notifications', true, true),
('Secretary', 'email-management', true, true),
('Secretary', 'calendar-management', true, false),
('Secretary', 'attendance-management', true, true),

-- Treasurer permissions
('Treasurer', 'budgets', true, true),
('Treasurer', 'dues-collection', true, true),
('Treasurer', 'receipts-records', true, true),
('Treasurer', 'calendar-management', true, false),

-- Public Relations permissions
('Public Relations', 'pr-coordinator', true, true),
('Public Relations', 'fan-engagement', true, true),
('Public Relations', 'notifications', true, false),
('Public Relations', 'email-management', true, false);

-- Insert some sample executive board members
INSERT INTO public.gw_executive_board_members (user_id, position, is_active) VALUES
(NULL, 'President', true),
(NULL, 'Vice President', true),  
(NULL, 'Secretary', true),
(NULL, 'Treasurer', true),
(NULL, 'Public Relations', true);

-- Create function to get executive board member modules
CREATE OR REPLACE FUNCTION get_exec_board_member_modules(member_user_id UUID, member_position TEXT)
RETURNS TABLE (
  module_key TEXT,
  module_name TEXT,
  module_title TEXT,
  module_description TEXT,
  module_category TEXT,
  can_view BOOLEAN,
  can_manage BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ebmp.module_key,
    gm.name as module_name,
    gm.display_name as module_title,
    gm.description as module_description,
    gm.category as module_category,
    ebmp.can_view,
    ebmp.can_manage
  FROM executive_board_module_permissions ebmp
  LEFT JOIN gw_modules gm ON gm.key = ebmp.module_key OR gm.name = ebmp.module_key
  WHERE ebmp.position = member_position
  ORDER BY gm.category, gm.display_name;
END;
$$;