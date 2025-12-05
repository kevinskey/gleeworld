-- Create table for member exit interviews
CREATE TABLE public.member_exit_interviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  semester VARCHAR(50) NOT NULL DEFAULT 'Fall 2025',
  
  -- Performances participated in
  performances_participated TEXT[],
  performances_other TEXT,
  
  -- Exec board work
  exec_board_work_done TEXT,
  
  -- Intent to continue
  intent_to_continue BOOLEAN,
  intent_to_continue_notes TEXT,
  
  -- Tour interest (Fall Break)
  interested_in_fall_tour BOOLEAN,
  
  -- Advanced ensemble interest
  interested_in_advanced_ensemble BOOLEAN,
  advanced_ensemble_notes TEXT,
  
  -- Other campus shows
  in_other_campus_show BOOLEAN,
  other_campus_show_details TEXT,
  
  -- Private lessons interest
  interested_in_private_lessons BOOLEAN,
  private_lessons_instrument TEXT,
  
  -- Additional comments
  additional_comments TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- One interview per user per semester
  UNIQUE(user_id, semester)
);

-- Enable RLS
ALTER TABLE public.member_exit_interviews ENABLE ROW LEVEL SECURITY;

-- Users can view their own interviews
CREATE POLICY "Users can view their own exit interviews"
ON public.member_exit_interviews
FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own interviews
CREATE POLICY "Users can create their own exit interviews"
ON public.member_exit_interviews
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own interviews
CREATE POLICY "Users can update their own exit interviews"
ON public.member_exit_interviews
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all interviews
CREATE POLICY "Admins can view all exit interviews"
ON public.member_exit_interviews
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles
    WHERE user_id = auth.uid()
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_member_exit_interviews_updated_at
BEFORE UPDATE ON public.member_exit_interviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();