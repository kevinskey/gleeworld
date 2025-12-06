
-- Create ticket_recipients table for tracking people associated with ticket requests
CREATE TABLE IF NOT EXISTS public.ticket_recipients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_request_id UUID NOT NULL REFERENCES public.concert_ticket_requests(id) ON DELETE CASCADE,
  recipient_name TEXT NOT NULL,
  recipient_email TEXT,
  recipient_phone TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  added_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.ticket_recipients ENABLE ROW LEVEL SECURITY;

-- Exec board can view ticket recipients
CREATE POLICY "Exec board can view ticket recipients" 
ON public.ticket_recipients 
FOR SELECT 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
));

-- Exec board can insert ticket recipients
CREATE POLICY "Exec board can insert ticket recipients" 
ON public.ticket_recipients 
FOR INSERT 
TO authenticated
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
));

-- Exec board can update ticket recipients
CREATE POLICY "Exec board can update ticket recipients" 
ON public.ticket_recipients 
FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
));

-- Exec board can delete ticket recipients
CREATE POLICY "Exec board can delete ticket recipients" 
ON public.ticket_recipients 
FOR DELETE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
));

-- Fix the concert_ticket_requests UPDATE policy to use authenticated role
DROP POLICY IF EXISTS "Exec board can update ticket requests" ON public.concert_ticket_requests;

CREATE POLICY "Exec board can update ticket requests" 
ON public.concert_ticket_requests 
FOR UPDATE 
TO authenticated
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
))
WITH CHECK (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE gw_profiles.user_id = auth.uid() 
  AND (gw_profiles.is_exec_board = true OR gw_profiles.is_admin = true OR gw_profiles.is_super_admin = true)
));

-- Add trigger for updated_at
CREATE TRIGGER update_ticket_recipients_updated_at
BEFORE UPDATE ON public.ticket_recipients
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
