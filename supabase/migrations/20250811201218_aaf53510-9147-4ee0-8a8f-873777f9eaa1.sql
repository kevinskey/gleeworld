-- Create blocked dates table for admin date blocking
CREATE TABLE IF NOT EXISTS public.gw_blocked_dates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocked_date DATE NOT NULL,
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(blocked_date)
);

-- Enable RLS
ALTER TABLE public.gw_blocked_dates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage blocked dates" 
ON public.gw_blocked_dates 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Anyone can view blocked dates" 
ON public.gw_blocked_dates 
FOR SELECT 
USING (true);