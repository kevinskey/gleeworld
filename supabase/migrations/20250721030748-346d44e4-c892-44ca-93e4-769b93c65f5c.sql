-- Create member communications table
CREATE TABLE public.gw_member_communications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid,
  communication_type text NOT NULL CHECK (communication_type IN ('excuse_letter', 'announcement', 'reminder', 'other')),
  subject text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'read')),
  priority integer NOT NULL DEFAULT 0 CHECK (priority >= 0 AND priority <= 5),
  attachments jsonb DEFAULT '[]'::jsonb,
  read_at timestamp with time zone,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create newsletters table
CREATE TABLE public.gw_newsletters (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  content text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sent')),
  target_audience text NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'members', 'alumni', 'executive_board', 'custom')),
  custom_recipients jsonb DEFAULT '[]'::jsonb,
  scheduled_for timestamp with time zone,
  sent_at timestamp with time zone,
  created_by uuid NOT NULL,
  template_used text,
  email_subject text,
  email_preview text,
  analytics jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create public form submissions table
CREATE TABLE public.gw_public_form_submissions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  form_type text NOT NULL CHECK (form_type IN ('fan_interest', 'booking_request', 'contact', 'audition')),
  form_data jsonb NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'converted', 'archived')),
  contact_email text,
  contact_name text,
  contact_phone text,
  notes text,
  assigned_to uuid,
  responded_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.gw_member_communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_newsletters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gw_public_form_submissions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for gw_member_communications
CREATE POLICY "Users can view their sent communications" 
ON public.gw_member_communications 
FOR SELECT 
USING (sender_id = auth.uid());

CREATE POLICY "Users can view communications sent to them" 
ON public.gw_member_communications 
FOR SELECT 
USING (recipient_id = auth.uid());

CREATE POLICY "Admins can view all communications" 
ON public.gw_member_communications 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can create communications" 
ON public.gw_member_communications 
FOR INSERT 
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update their own communications" 
ON public.gw_member_communications 
FOR UPDATE 
USING (sender_id = auth.uid());

CREATE POLICY "Recipients can mark communications as read" 
ON public.gw_member_communications 
FOR UPDATE 
USING (recipient_id = auth.uid());

-- RLS Policies for gw_newsletters
CREATE POLICY "Admins can manage newsletters" 
ON public.gw_newsletters 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Users can view published newsletters" 
ON public.gw_newsletters 
FOR SELECT 
USING (status = 'sent');

-- RLS Policies for gw_public_form_submissions
CREATE POLICY "Admins can manage form submissions" 
ON public.gw_public_form_submissions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Public can create form submissions" 
ON public.gw_public_form_submissions 
FOR INSERT 
WITH CHECK (true);

-- Add triggers for updated_at timestamps
CREATE TRIGGER update_gw_member_communications_updated_at
  BEFORE UPDATE ON public.gw_member_communications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_newsletters_updated_at
  BEFORE UPDATE ON public.gw_newsletters
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_gw_public_form_submissions_updated_at
  BEFORE UPDATE ON public.gw_public_form_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();