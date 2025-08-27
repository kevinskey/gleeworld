-- Create module definitions table
CREATE TABLE IF NOT EXISTS public.gw_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_key TEXT UNIQUE NOT NULL,
  module_name TEXT NOT NULL,
  category TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user module permissions table
CREATE TABLE IF NOT EXISTS public.gw_user_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  module_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_manage BOOLEAN DEFAULT false,
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, module_key)
);

-- Enable RLS
ALTER TABLE public.gw_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_user_module_permissions ENABLE ROW LEVEL SECURITY;

-- Policies for modules
CREATE POLICY "Anyone can view active modules" 
ON public.gw_modules 
FOR SELECT 
USING (is_active = true);

CREATE POLICY "Admins can manage modules" 
ON public.gw_modules 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Policies for user module permissions
CREATE POLICY "Users can view their own permissions" 
ON public.gw_user_module_permissions 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage all permissions" 
ON public.gw_user_module_permissions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Function to get user modules
CREATE OR REPLACE FUNCTION public.get_user_modules(p_user UUID)
RETURNS TABLE(
  module_key TEXT,
  module_name TEXT,
  can_view BOOLEAN,
  can_edit BOOLEAN,
  can_manage BOOLEAN
) 
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    ump.module_key,
    m.module_name,
    ump.can_view,
    ump.can_edit,
    ump.can_manage
  FROM public.gw_user_module_permissions ump
  JOIN public.gw_modules m ON m.module_key = ump.module_key
  WHERE ump.user_id = p_user 
  AND ump.is_active = true
  AND (ump.expires_at IS NULL OR ump.expires_at > now())
  AND m.is_active = true;
$$;

-- Insert default modules
INSERT INTO public.gw_modules (module_key, module_name, category, description) VALUES
-- Communications
('email-management', 'Email Management', 'communications', 'Manage email campaigns and communications'),
('internal-communications', 'Internal Communications', 'communications', 'Internal team communications'),
('notifications', 'Notifications', 'communications', 'System notifications and alerts'),
('pr-coordinator', 'PR Coordinator', 'communications', 'Public relations coordination'),
('pr-manager', 'PR Manager', 'communications', 'Public relations management'),
('scheduling-module', 'Scheduling Module', 'communications', 'Event and meeting scheduling'),
('service-management', 'Service Management', 'communications', 'Service request management'),
('calendar-management', 'Calendar Management', 'communications', 'Calendar administration'),
('buckets-of-love', 'Buckets of Love', 'communications', 'Member recognition program'),
('glee-writing', 'Glee Writing', 'communications', 'Content creation and writing'),
('fan-engagement', 'Fan Engagement', 'communications', 'Fan community management'),

-- Member Management
('user-management', 'User Management', 'member-management', 'User account administration'),
('attendance-management', 'Attendance Management', 'member-management', 'Track member attendance'),
('tour-management', 'Tour Management', 'member-management', 'Manage tours and travel'),
('booking-forms', 'Booking Forms', 'member-management', 'Event booking management'),
('alumnae-portal', 'Alumnae Portal', 'member-management', 'Alumnae community features'),
('auditions', 'Auditions', 'member-management', 'Audition process management'),
('permissions', 'Permissions', 'member-management', 'User permissions management'),
('wellness', 'Wellness', 'member-management', 'Member wellness programs'),
('wardrobe', 'Wardrobe', 'member-management', 'Wardrobe and costume management'),

-- Musical Leadership
('music-library', 'Music Library', 'musical-leadership', 'Sheet music and repertoire'),
('student-conductor', 'Student Conductor', 'musical-leadership', 'Student conductor tools'),
('section-leader', 'Section Leader', 'musical-leadership', 'Section leadership tools'),
('sight-singing-management', 'Sight Singing Management', 'musical-leadership', 'Sight singing administration'),
('sight-reading-preview', 'Sight Reading Preview', 'musical-leadership', 'Preview sight reading materials'),
('sight-reading-generator', 'Sight Reading Generator', 'musical-leadership', 'Generate sight reading exercises'),
('member-sight-reading-studio', 'Member Sight Reading Studio', 'musical-leadership', 'Member practice studio'),
('librarian', 'Librarian', 'musical-leadership', 'Music library management'),
('radio-management', 'Radio Management', 'musical-leadership', 'Radio programming'),
('karaoke', 'Karaoke', 'musical-leadership', 'Karaoke features'),

-- Finances
('contracts', 'Contracts', 'finances', 'Contract management'),
('budgets', 'Budgets', 'finances', 'Budget planning and tracking'),
('receipts-records', 'Receipts & Records', 'finances', 'Financial record keeping'),
('approval-system', 'Approval System', 'finances', 'Financial approval workflow'),
('glee-ledger', 'Glee Ledger', 'finances', 'Financial ledger management'),
('dues-collection', 'Dues Collection', 'finances', 'Member dues collection'),
('monthly-statements', 'Monthly Statements', 'finances', 'Financial statements'),
('check-requests', 'Check Requests', 'finances', 'Payment request processing'),
('merch-store', 'Merch Store', 'finances', 'Merchandise management'),
('ai-financial', 'AI Financial', 'finances', 'AI-powered financial tools'),

-- Tools & Utilities
('ai-tools', 'AI Tools', 'tools', 'Artificial intelligence tools'),
('hero-manager', 'Hero Manager', 'tools', 'Hero image management'),
('press-kits', 'Press Kits', 'tools', 'Press kit creation and management'),
('first-year-console', 'First Year Console', 'tools', 'First year member tools'),
('settings', 'Settings', 'tools', 'System settings'),

-- Executive Board
('executive-board', 'Executive Board', 'executive', 'Executive board tools'),
('executive-board-management', 'Executive Board Management', 'executive', 'Executive board administration'),
('executive-functions', 'Executive Functions', 'executive', 'Executive-specific functions')
ON CONFLICT (module_key) DO NOTHING;