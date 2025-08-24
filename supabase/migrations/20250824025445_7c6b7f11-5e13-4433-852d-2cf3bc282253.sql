-- First, check if the tables exist and create the new communication system
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

-- Check if gw_message_groups exists and add missing columns
DO $$
BEGIN
  -- Add type column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_message_groups' AND column_name = 'type') THEN
    ALTER TABLE public.gw_message_groups ADD COLUMN type TEXT NOT NULL DEFAULT 'custom';
  END IF;
  
  -- Add query_criteria column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_message_groups' AND column_name = 'query_criteria') THEN
    ALTER TABLE public.gw_message_groups ADD COLUMN query_criteria JSONB;
  END IF;
  
  -- Add created_by column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_message_groups' AND column_name = 'created_by') THEN
    ALTER TABLE public.gw_message_groups ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'gw_message_groups' AND column_name = 'is_active') THEN
    ALTER TABLE public.gw_message_groups ADD COLUMN is_active BOOLEAN DEFAULT true;
  END IF;
END
$$;

-- Create group members table if it doesn't exist
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

-- Insert default message groups (only if they don't exist)
INSERT INTO public.gw_message_groups (name, description, type, query_criteria) 
SELECT * FROM (VALUES
  ('All Members', 'All active Glee Club members', 'role_based', '{"role": "member", "status": "active"}'::jsonb),
  ('Executive Board', 'Executive board members', 'role_based', '{"is_exec_board": true}'::jsonb),
  ('Soprano 1', 'Soprano 1 voice part', 'voice_part', '{"voice_part": "soprano_1"}'::jsonb),
  ('Soprano 2', 'Soprano 2 voice part', 'voice_part', '{"voice_part": "soprano_2"}'::jsonb),
  ('Alto 1', 'Alto 1 voice part', 'voice_part', '{"voice_part": "alto_1"}'::jsonb),
  ('Alto 2', 'Alto 2 voice part', 'voice_part', '{"voice_part": "alto_2"}'::jsonb),
  ('Freshman', 'First-year students', 'academic_year', '{"academic_year": "freshman"}'::jsonb),
  ('Sophomores', 'Second-year students', 'academic_year', '{"academic_year": "sophomore"}'::jsonb),
  ('Juniors', 'Third-year students', 'academic_year', '{"academic_year": "junior"}'::jsonb),
  ('Seniors', 'Fourth-year students', 'academic_year', '{"academic_year": "senior"}'::jsonb),
  ('Alumni', 'Glee Club alumni', 'role_based', '{"role": "alumna"}'::jsonb)
) AS v(name, description, type, query_criteria)
WHERE NOT EXISTS (SELECT 1 FROM public.gw_message_groups WHERE gw_message_groups.name = v.name);

-- Insert default communication templates
INSERT INTO public.gw_communication_templates (name, subject, content, category, variables) 
SELECT * FROM (VALUES
  ('Rehearsal Reminder', 'Rehearsal Tonight at {{time}}', 'Don''t forget we have rehearsal tonight at {{time}} in {{location}}. Please bring your music and water bottle.', 'rehearsal', '["time", "location"]'::jsonb),
  ('Concert Announcement', 'Upcoming Concert: {{concert_name}}', 'We are excited to announce our upcoming concert "{{concert_name}}" on {{date}} at {{venue}}. More details to follow!', 'event', '["concert_name", "date", "venue"]'::jsonb),
  ('Dues Reminder', 'Dues Payment Reminder', 'This is a friendly reminder that your Glee Club dues of ${{amount}} are due by {{due_date}}. Please contact the treasurer if you have questions.', 'financial', '["amount", "due_date"]'::jsonb),
  ('Welcome Message', 'Welcome to Spelman Glee Club!', 'Welcome to the Spelman College Glee Club family! We are excited to have you join our sisterhood of song. You will receive important updates and announcements through this system.', 'welcome', '[]'::jsonb)
) AS v(name, subject, content, category, variables)
WHERE NOT EXISTS (SELECT 1 FROM public.gw_communication_templates WHERE gw_communication_templates.name = v.name);

-- Enable RLS on new tables
ALTER TABLE public.gw_communication_system ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_recipients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_delivery ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_notification_preferences ENABLE ROW LEVEL SECURITY;