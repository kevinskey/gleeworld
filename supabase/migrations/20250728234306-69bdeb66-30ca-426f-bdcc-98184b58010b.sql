-- Create executive board positions enum
CREATE TYPE public.executive_position AS ENUM (
  'president',
  'secretary', 
  'treasurer',
  'tour_manager',
  'wardrobe_manager',
  'librarian',
  'historian',
  'pr_coordinator',
  'chaplain',
  'data_analyst'
);

-- Create executive board members table
CREATE TABLE public.gw_executive_board_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  position executive_position NOT NULL,
  academic_year TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  appointed_date DATE DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(position, academic_year, is_active)
);

-- Create executive board tasks table
CREATE TABLE public.gw_executive_board_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  assigned_to_position executive_position,
  assigned_to_user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES public.events(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'director_verified')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  director_verified_at TIMESTAMP WITH TIME ZONE,
  director_verified_by UUID REFERENCES auth.users(id),
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create executive board file uploads table
CREATE TABLE public.gw_executive_board_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  position_scope executive_position,
  event_id UUID REFERENCES public.events(id),
  task_id UUID REFERENCES public.gw_executive_board_tasks(id),
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'agenda', 'budget', 'contract', 'itinerary', 'handbook', 'report')),
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create check-in/check-out system table
CREATE TABLE public.gw_executive_board_checkins (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  item_name TEXT NOT NULL,
  item_type TEXT NOT NULL CHECK (item_type IN ('dress', 'folder', 'merchandise', 'gear', 'equipment', 'other')),
  item_condition TEXT NOT NULL DEFAULT 'good' CHECK (item_condition IN ('excellent', 'good', 'fair', 'poor', 'damaged')),
  action_type TEXT NOT NULL CHECK (action_type IN ('check_out', 'check_in')),
  checked_by UUID NOT NULL REFERENCES auth.users(id),
  checked_to_user_id UUID REFERENCES auth.users(id),
  event_id UUID REFERENCES public.events(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create executive board notifications table
CREATE TABLE public.gw_executive_board_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_position executive_position,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'general' CHECK (notification_type IN ('general', 'task_due', 'task_assigned', 'event_reminder', 'budget_alert', 'announcement')),
  related_task_id UUID REFERENCES public.gw_executive_board_tasks(id),
  related_event_id UUID REFERENCES public.events(id),
  is_read BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  read_at TIMESTAMP WITH TIME ZONE
);

-- Create progress log table
CREATE TABLE public.gw_executive_board_progress_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  user_position executive_position,
  action_type TEXT NOT NULL,
  action_description TEXT NOT NULL,
  related_entity_type TEXT CHECK (related_entity_type IN ('task', 'event', 'file', 'budget', 'announcement')),
  related_entity_id UUID,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create leadership development tracker table
CREATE TABLE public.gw_leadership_development (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  position executive_position NOT NULL,
  reflection_title TEXT NOT NULL,
  reflection_content TEXT NOT NULL,
  skills_developed TEXT[],
  goals_set TEXT[],
  mentor_feedback TEXT,
  semester TEXT NOT NULL,
  is_approved BOOLEAN NOT NULL DEFAULT false,
  approved_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_executive_board_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_board_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_board_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_board_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_board_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_executive_board_progress_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_leadership_development ENABLE ROW LEVEL SECURITY;

-- Create policies for executive board members
CREATE POLICY "Executive board members can view all member info"
ON public.gw_executive_board_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = auth.uid() AND ebm.is_active = true
  )
  OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Admins can manage executive board members"
ON public.gw_executive_board_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create policies for tasks
CREATE POLICY "Executive board members can view relevant tasks"
ON public.gw_executive_board_tasks FOR SELECT
USING (
  assigned_to_user_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = auth.uid() AND ebm.position = assigned_to_position AND ebm.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can create tasks"
ON public.gw_executive_board_tasks FOR INSERT
WITH CHECK (
  created_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board members can update relevant tasks"
ON public.gw_executive_board_tasks FOR UPDATE
USING (
  assigned_to_user_id = auth.uid()
  OR created_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create policies for files
CREATE POLICY "Executive board members can view relevant files"
ON public.gw_executive_board_files FOR SELECT
USING (
  is_public = true
  OR uploaded_by = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members ebm
    WHERE ebm.user_id = auth.uid() AND ebm.position = position_scope AND ebm.is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can upload files"
ON public.gw_executive_board_files FOR INSERT
WITH CHECK (
  uploaded_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create policies for check-ins
CREATE POLICY "Executive board members can view check-ins"
ON public.gw_executive_board_checkins FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can create check-ins"
ON public.gw_executive_board_checkins FOR INSERT
WITH CHECK (
  checked_by = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.gw_executive_board_notifications FOR SELECT
USING (recipient_user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.gw_executive_board_notifications FOR UPDATE
USING (recipient_user_id = auth.uid());

CREATE POLICY "Executive board members can create notifications"
ON public.gw_executive_board_notifications FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create policies for progress log
CREATE POLICY "Executive board members can view progress log"
ON public.gw_executive_board_progress_log FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can create progress log entries"
ON public.gw_executive_board_progress_log FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

-- Create policies for leadership development
CREATE POLICY "Users can view their own leadership development"
ON public.gw_leadership_development FOR SELECT
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Executive board members can create leadership reflections"
ON public.gw_leadership_development FOR INSERT
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Users can update their own leadership development"
ON public.gw_leadership_development FOR UPDATE
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create updated_at triggers
CREATE TRIGGER update_gw_executive_board_members_updated_at
  BEFORE UPDATE ON public.gw_executive_board_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_executive_board_tasks_updated_at
  BEFORE UPDATE ON public.gw_executive_board_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_executive_board_files_updated_at
  BEFORE UPDATE ON public.gw_executive_board_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_leadership_development_updated_at
  BEFORE UPDATE ON public.gw_leadership_development
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for executive board files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'executive-board-files',
  'executive-board-files', 
  false,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'image/jpeg', 'image/png', 'text/plain']
);

-- Create storage policies for executive board files
CREATE POLICY "Executive board members can view files"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'executive-board-files' AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board members can upload files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'executive-board-files' AND
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Executive board members can update their files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'executive-board-files' AND
  owner = auth.uid()
);

CREATE POLICY "Executive board members can delete their files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'executive-board-files' AND
  owner = auth.uid()
);

-- Helper functions
CREATE OR REPLACE FUNCTION public.get_user_executive_position(user_id_param UUID)
RETURNS executive_position
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT position 
  FROM public.gw_executive_board_members 
  WHERE user_id = user_id_param AND is_active = true
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_executive_board_member(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = user_id_param AND is_active = true
  );
$$;

-- Function to log executive board actions
CREATE OR REPLACE FUNCTION public.log_executive_board_action(
  p_action_type TEXT,
  p_action_description TEXT,
  p_related_entity_type TEXT DEFAULT NULL,
  p_related_entity_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  log_id UUID;
  user_position executive_position;
BEGIN
  -- Get user's position
  SELECT position INTO user_position
  FROM public.gw_executive_board_members
  WHERE user_id = auth.uid() AND is_active = true
  LIMIT 1;
  
  -- Insert log entry
  INSERT INTO public.gw_executive_board_progress_log (
    user_id,
    user_position,
    action_type,
    action_description,
    related_entity_type,
    related_entity_id,
    metadata
  ) VALUES (
    auth.uid(),
    user_position,
    p_action_type,
    p_action_description,
    p_related_entity_type,
    p_related_entity_id,
    p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;