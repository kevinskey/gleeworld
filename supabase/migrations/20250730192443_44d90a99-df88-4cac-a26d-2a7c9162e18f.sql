-- Check current audition structure and add audition logs table
-- First, let's create a table for audition logs that tracks user applications and grading

-- Create audition logs table for tracking registered users and their audition status
CREATE TABLE IF NOT EXISTS public.gw_audition_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  audition_id UUID,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  audition_date DATE NOT NULL,
  audition_time TIME NOT NULL,
  voice_part TEXT,
  application_data JSONB DEFAULT '{}',
  grade_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'graded', 'no_show')),
  graded_by UUID REFERENCES auth.users(id),
  graded_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  is_reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_audition_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for audition logs
CREATE POLICY "Executive board members can view all audition logs"
ON public.gw_audition_logs
FOR SELECT
USING (
  is_executive_board_member_or_admin()
);

CREATE POLICY "Executive board members can update audition logs"
ON public.gw_audition_logs
FOR UPDATE
USING (
  is_executive_board_member_or_admin()
);

CREATE POLICY "Executive board members can insert audition logs"
ON public.gw_audition_logs
FOR INSERT
WITH CHECK (
  is_executive_board_member_or_admin()
);

-- Create updated_at trigger
CREATE TRIGGER update_gw_audition_logs_updated_at
BEFORE UPDATE ON public.gw_audition_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add index for performance
CREATE INDEX idx_gw_audition_logs_audition_date ON public.gw_audition_logs(audition_date);
CREATE INDEX idx_gw_audition_logs_status ON public.gw_audition_logs(status);
CREATE INDEX idx_gw_audition_logs_user_id ON public.gw_audition_logs(user_id);