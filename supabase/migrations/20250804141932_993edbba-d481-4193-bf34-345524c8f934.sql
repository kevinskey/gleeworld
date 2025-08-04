-- Create app functions table to define all available functions in the app
CREATE TABLE public.gw_app_functions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'general',
  module text NOT NULL DEFAULT 'core',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create executive position functions table for permission assignments
CREATE TABLE public.gw_executive_position_functions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position executive_position NOT NULL,
  function_id uuid NOT NULL REFERENCES public.gw_app_functions(id) ON DELETE CASCADE,
  can_access boolean NOT NULL DEFAULT false,
  can_manage boolean NOT NULL DEFAULT false,
  assigned_by uuid REFERENCES auth.users(id),
  assigned_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(position, function_id)
);

-- Enable RLS
ALTER TABLE public.gw_app_functions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_position_functions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for app functions
CREATE POLICY "Admins can manage app functions" 
ON public.gw_app_functions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Everyone can view active app functions" 
ON public.gw_app_functions 
FOR SELECT 
USING (is_active = true);

-- RLS Policies for position functions
CREATE POLICY "Admins can manage position functions" 
ON public.gw_executive_position_functions 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can view their position functions" 
ON public.gw_executive_position_functions 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    JOIN public.gw_profiles p ON p.user_id = ebm.user_id
    WHERE ebm.user_id = auth.uid() 
    AND ebm.position = gw_executive_position_functions.position
    AND ebm.is_active = true
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_gw_app_functions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_gw_executive_position_functions_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER update_gw_app_functions_updated_at
  BEFORE UPDATE ON public.gw_app_functions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_app_functions_updated_at();

CREATE TRIGGER update_gw_executive_position_functions_updated_at
  BEFORE UPDATE ON public.gw_executive_position_functions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_gw_executive_position_functions_updated_at();

-- Insert all app functions
INSERT INTO public.gw_app_functions (name, description, category, module) VALUES
-- Dashboard & Navigation
('dashboard_access', 'Access main dashboard', 'dashboard', 'core'),
('admin_dashboard', 'Access admin dashboard', 'dashboard', 'admin'),
('member_dashboard', 'Access member dashboard', 'dashboard', 'member'),

-- User Management
('user_management', 'Manage user accounts', 'users', 'admin'),
('profile_management', 'Manage user profiles', 'users', 'member'),
('role_assignment', 'Assign roles to users', 'users', 'admin'),

-- Event Management
('event_create', 'Create events', 'events', 'events'),
('event_edit', 'Edit events', 'events', 'events'),
('event_delete', 'Delete events', 'events', 'events'),
('event_view', 'View events', 'events', 'events'),
('attendance_tracking', 'Track event attendance', 'events', 'events'),

-- Music & Rehearsals
('sheet_music_upload', 'Upload sheet music', 'music', 'music'),
('sheet_music_manage', 'Manage sheet music library', 'music', 'music'),
('rehearsal_scheduling', 'Schedule rehearsals', 'music', 'events'),
('setlist_management', 'Manage performance setlists', 'music', 'music'),
('audio_archive_manage', 'Manage audio archive', 'music', 'music'),

-- Communications
('announcements_create', 'Create announcements', 'communications', 'communications'),
('email_campaigns', 'Send email campaigns', 'communications', 'communications'),
('newsletter_management', 'Manage newsletters', 'communications', 'communications'),
('message_templates', 'Manage message templates', 'communications', 'communications'),

-- Finance & Budgets
('budget_create', 'Create budgets', 'finance', 'finance'),
('budget_manage', 'Manage budgets', 'finance', 'finance'),
('expense_tracking', 'Track expenses', 'finance', 'finance'),
('contract_management', 'Manage contracts', 'finance', 'contracts'),
('stipend_management', 'Manage stipends', 'finance', 'finance'),

-- Tours & Travel
('tour_planning', 'Plan tours and travel', 'tours', 'tours'),
('accommodation_booking', 'Manage accommodation', 'tours', 'tours'),
('transportation_planning', 'Plan transportation', 'tours', 'tours'),
('tour_budget_management', 'Manage tour budgets', 'tours', 'finance'),

-- Uniforms & Inventory
('uniform_tracking', 'Track uniforms', 'inventory', 'inventory'),
('inventory_management', 'Manage inventory items', 'inventory', 'inventory'),
('uniform_assignments', 'Assign uniforms to members', 'inventory', 'inventory'),

-- Academic & Wellness
('gpa_tracking', 'Track member GPAs', 'academic', 'academic'),
('vocal_health_monitoring', 'Monitor vocal health', 'wellness', 'wellness'),
('study_abroad_coordination', 'Coordinate study abroad', 'academic', 'academic'),

-- Media & Publications
('social_media_management', 'Manage social media', 'media', 'media'),
('website_content', 'Manage website content', 'media', 'media'),
('photography_management', 'Manage photos and media', 'media', 'media'),
('press_kit_management', 'Manage press kits', 'media', 'media'),

-- Recruitment & Auditions
('audition_management', 'Manage auditions', 'recruitment', 'auditions'),
('application_review', 'Review applications', 'recruitment', 'auditions'),
('recruitment_events', 'Organize recruitment events', 'recruitment', 'events'),

-- Alumnae Relations
('alumnae_outreach', 'Alumnae outreach and relations', 'alumnae', 'alumnae'),
('alumnae_events', 'Organize alumnae events', 'alumnae', 'events'),
('mentorship_program', 'Manage mentorship programs', 'alumnae', 'alumnae'),

-- Special Events
('sisterhood_events', 'Organize sisterhood events', 'events', 'sisterhood'),
('fundraising_events', 'Organize fundraising', 'events', 'fundraising'),
('community_service', 'Coordinate community service', 'events', 'service'),

-- Technical & System
('system_settings', 'Manage system settings', 'system', 'admin'),
('backup_management', 'Manage backups', 'system', 'admin'),
('security_management', 'Manage security settings', 'system', 'admin'),
('analytics_access', 'Access analytics and reports', 'system', 'admin'),

-- Records & Documentation
('meeting_minutes', 'Manage meeting minutes', 'records', 'records'),
('document_management', 'Manage documents', 'records', 'records'),
('archive_management', 'Manage historical archives', 'records', 'records'),

-- External Relations
('venue_coordination', 'Coordinate with venues', 'external', 'events'),
('sponsor_relations', 'Manage sponsor relationships', 'external', 'finance'),
('media_relations', 'Handle media relations', 'external', 'media');

-- Function to check if user has specific function permission
CREATE OR REPLACE FUNCTION public.user_has_function_permission(
  user_id_param uuid, 
  function_name_param text,
  permission_type text DEFAULT 'access'
)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 
    FROM public.gw_executive_board_members ebm
    JOIN public.gw_executive_position_functions epf ON epf.position = ebm.position
    JOIN public.gw_app_functions af ON af.id = epf.function_id
    WHERE ebm.user_id = user_id_param 
    AND ebm.is_active = true
    AND af.name = function_name_param
    AND af.is_active = true
    AND (
      (permission_type = 'access' AND epf.can_access = true) OR
      (permission_type = 'manage' AND epf.can_manage = true)
    )
  ) OR EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = user_id_param 
    AND (is_admin = true OR is_super_admin = true)
  );
$function$;