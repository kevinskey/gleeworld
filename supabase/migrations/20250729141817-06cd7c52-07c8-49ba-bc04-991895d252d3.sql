-- Create announcements table
CREATE TABLE public.gw_announcements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category TEXT DEFAULT 'general' CHECK (category IN ('general', 'rehearsal', 'performance', 'tour', 'academic', 'social', 'administrative')),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  target_audience TEXT DEFAULT 'all' CHECK (target_audience IN ('all', 'members', 'alumnae', 'executives', 'admins')),
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.gw_announcements ENABLE ROW LEVEL SECURITY;

-- Create policies for announcements
CREATE POLICY "Anyone can view published announcements" 
ON public.gw_announcements 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Admins and exec board can create announcements" 
ON public.gw_announcements 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins and exec board can update announcements" 
ON public.gw_announcements 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  ) OR EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() AND is_active = true
  )
);

CREATE POLICY "Admins can delete announcements" 
ON public.gw_announcements 
FOR DELETE 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_gw_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_announcements_updated_at
BEFORE UPDATE ON public.gw_announcements
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_announcements_updated_at();

-- Create index for better performance
CREATE INDEX idx_gw_announcements_published ON public.gw_announcements(is_published, created_at DESC);
CREATE INDEX idx_gw_announcements_expires ON public.gw_announcements(expires_at);
CREATE INDEX idx_gw_announcements_target ON public.gw_announcements(target_audience);