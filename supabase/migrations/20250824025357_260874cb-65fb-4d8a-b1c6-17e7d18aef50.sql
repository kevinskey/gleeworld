-- Create comprehensive notifications schema
CREATE TABLE IF NOT EXISTS public.gw_communication_system (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  sender_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'announcement', -- announcement, notification, message, reminder
  priority TEXT NOT NULL DEFAULT 'normal', -- low, normal, high, urgent
  status TEXT NOT NULL DEFAULT 'draft', -- draft, scheduled, sending, sent, failed
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create recipients table
CREATE TABLE IF NOT EXISTS public.gw_communication_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES public.gw_communication_system(id) ON DELETE CASCADE,
  recipient_type TEXT NOT NULL, -- individual, group, role, all_members
  recipient_identifier TEXT, -- user_id, group_name, role_name, etc.
  recipient_email TEXT,
  recipient_phone TEXT,
  recipient_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create delivery log table
CREATE TABLE IF NOT EXISTS public.gw_communication_delivery (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  communication_id UUID REFERENCES public.gw_communication_system(id) ON DELETE CASCADE,
  recipient_id UUID REFERENCES public.gw_communication_recipients(id) ON DELETE CASCADE,
  delivery_method TEXT NOT NULL, -- email, sms, in_app
  status TEXT NOT NULL DEFAULT 'pending', -- pending, sending, delivered, failed, read
  external_id TEXT, -- Twilio SID, email ID, etc.
  error_message TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create message groups for better organization
CREATE TABLE IF NOT EXISTS public.gw_message_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  type TEXT NOT NULL DEFAULT 'custom', -- custom, role_based, voice_part, academic_year
  query_criteria JSONB, -- For dynamic groups
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create group members table
CREATE TABLE IF NOT EXISTS public.gw_group_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.gw_message_groups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  added_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(group_id, user_id)
);

-- Create communication templates
CREATE TABLE IF NOT EXISTS public.gw_communication_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  variables JSONB DEFAULT '[]'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create user notification preferences
CREATE TABLE IF NOT EXISTS public.gw_notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  email_notifications BOOLEAN DEFAULT true,
  sms_notifications BOOLEAN DEFAULT false,
  in_app_notifications BOOLEAN DEFAULT true,
  digest_frequency TEXT DEFAULT 'daily', -- immediate, daily, weekly, never
  categories JSONB DEFAULT '{}'::jsonb, -- Category-specific preferences
  quiet_hours JSONB DEFAULT '{"start": "22:00", "end": "08:00"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Insert default message groups
INSERT INTO public.gw_message_groups (name, description, type, query_criteria) VALUES
('All Members', 'All active Glee Club members', 'role_based', '{"role": "member", "status": "active"}'),
('Executive Board', 'Executive board members', 'role_based', '{"is_exec_board": true}'),
('Soprano 1', 'Soprano 1 voice part', 'voice_part', '{"voice_part": "soprano_1"}'),
('Soprano 2', 'Soprano 2 voice part', 'voice_part', '{"voice_part": "soprano_2"}'),
('Alto 1', 'Alto 1 voice part', 'voice_part', '{"voice_part": "alto_1"}'),
('Alto 2', 'Alto 2 voice part', 'voice_part', '{"voice_part": "alto_2"}'),
('Freshman', 'First-year students', 'academic_year', '{"academic_year": "freshman"}'),
('Sophomores', 'Second-year students', 'academic_year', '{"academic_year": "sophomore"}'),
('Juniors', 'Third-year students', 'academic_year', '{"academic_year": "junior"}'),
('Seniors', 'Fourth-year students', 'academic_year', '{"academic_year": "senior"}'),
('Alumni', 'Glee Club alumni', 'role_based', '{"role": "alumna"}')
ON CONFLICT (name) DO NOTHING;

-- Insert default communication templates
INSERT INTO public.gw_communication_templates (name, subject, content, category, variables) VALUES
('Rehearsal Reminder', 'Rehearsal Tonight at {{time}}', 'Don''t forget we have rehearsal tonight at {{time}} in {{location}}. Please bring your music and water bottle.', 'rehearsal', '["time", "location"]'),
('Concert Announcement', 'Upcoming Concert: {{concert_name}}', 'We are excited to announce our upcoming concert "{{concert_name}}" on {{date}} at {{venue}}. More details to follow!', 'event', '["concert_name", "date", "venue"]'),
('Dues Reminder', 'Dues Payment Reminder', 'This is a friendly reminder that your Glee Club dues of ${{amount}} are due by {{due_date}}. Please contact the treasurer if you have questions.', 'financial', '["amount", "due_date"]'),
('Welcome Message', 'Welcome to Spelman Glee Club!', 'Welcome to the Spelman College Glee Club family! We are excited to have you join our sisterhood of song. You will receive important updates and announcements through this system.', 'welcome', '[]')
ON CONFLICT (name) DO NOTHING;

-- Enable RLS on all tables
ALTER TABLE public.gw_communication_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_message_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_notification_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_communication_system
CREATE POLICY "Users can view communications sent to them"
ON public.gw_communication_system FOR SELECT
USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM public.gw_communication_recipients gcr
    WHERE gcr.communication_id = id
    AND (
      gcr.recipient_identifier = auth.uid()::text OR
      gcr.recipient_type = 'all_members'
    )
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

CREATE POLICY "Members can create communications"
ON public.gw_communication_system FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update their own communications"
ON public.gw_communication_system FOR UPDATE
USING (
  auth.uid() = sender_id OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_communication_recipients
CREATE POLICY "Users can view recipient lists for their communications"
ON public.gw_communication_recipients FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND (
      gcs.sender_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles gp
        WHERE gp.user_id = auth.uid()
        AND (gp.is_admin = true OR gp.is_super_admin = true)
      )
    )
  )
);

CREATE POLICY "Users can add recipients to their communications"
ON public.gw_communication_recipients FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND gcs.sender_id = auth.uid()
  )
);

-- RLS Policies for gw_communication_delivery
CREATE POLICY "Users can view delivery status for their communications"
ON public.gw_communication_delivery FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_communication_system gcs
    WHERE gcs.id = communication_id
    AND (
      gcs.sender_id = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.gw_profiles gp
        WHERE gp.user_id = auth.uid()
        AND (gp.is_admin = true OR gp.is_super_admin = true)
      )
    )
  )
);

CREATE POLICY "System can manage delivery logs"
ON public.gw_communication_delivery FOR ALL
USING (true)
WITH CHECK (true);

-- RLS Policies for gw_message_groups
CREATE POLICY "Everyone can view active message groups"
ON public.gw_message_groups FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage message groups"
ON public.gw_message_groups FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_group_members
CREATE POLICY "Users can view group memberships"
ON public.gw_group_members FOR SELECT
USING (true);

CREATE POLICY "Admins can manage group memberships"
ON public.gw_group_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_communication_templates
CREATE POLICY "Everyone can view active templates"
ON public.gw_communication_templates FOR SELECT
USING (is_active = true);

CREATE POLICY "Admins can manage templates"
ON public.gw_communication_templates FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles gp
    WHERE gp.user_id = auth.uid()
    AND (gp.is_admin = true OR gp.is_super_admin = true)
  )
);

-- RLS Policies for gw_notification_preferences
CREATE POLICY "Users can manage their own notification preferences"
ON public.gw_notification_preferences FOR ALL
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Create triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gw_communication_system_updated_at
  BEFORE UPDATE ON public.gw_communication_system
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_message_groups_updated_at
  BEFORE UPDATE ON public.gw_message_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_communication_templates_updated_at
  BEFORE UPDATE ON public.gw_communication_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_notification_preferences_updated_at
  BEFORE UPDATE ON public.gw_notification_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();