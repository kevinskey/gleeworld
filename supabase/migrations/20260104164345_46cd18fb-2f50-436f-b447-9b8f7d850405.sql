-- Create countdown events table
CREATE TABLE public.gw_countdowns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_name TEXT NOT NULL,
  target_date TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  display_in_header BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.gw_countdowns ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view countdowns
CREATE POLICY "Anyone can view countdowns"
ON public.gw_countdowns
FOR SELECT
USING (true);

-- Only admins can manage countdowns (using app_roles)
CREATE POLICY "Admins can manage countdowns"
ON public.gw_countdowns
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.app_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'super_admin')
    AND is_active = true
  )
);

-- Create trigger for updated_at
CREATE TRIGGER update_gw_countdowns_updated_at
BEFORE UPDATE ON public.gw_countdowns
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();