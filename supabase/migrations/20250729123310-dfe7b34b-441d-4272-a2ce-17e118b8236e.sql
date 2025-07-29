-- Create spiritual reflections table
CREATE TABLE public.gw_spiritual_reflections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  scripture_reference TEXT,
  reflection_type TEXT NOT NULL DEFAULT 'daily_devotional',
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_shared_to_members BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  shared_at TIMESTAMP WITH TIME ZONE
);

-- Enable Row Level Security
ALTER TABLE public.gw_spiritual_reflections ENABLE ROW LEVEL SECURITY;

-- Create policies for spiritual reflections
CREATE POLICY "Chaplains can manage all spiritual reflections" 
ON public.gw_spiritual_reflections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_executive_board_members 
    WHERE user_id = auth.uid() 
    AND position = 'chaplain'
    AND is_active = true
  ) OR
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view shared spiritual reflections" 
ON public.gw_spiritual_reflections 
FOR SELECT 
USING (is_shared_to_members = true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_spiritual_reflections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- Set shared_at when is_shared_to_members becomes true
  IF OLD.is_shared_to_members = false AND NEW.is_shared_to_members = true THEN
    NEW.shared_at = now();
  ELSIF OLD.is_shared_to_members = true AND NEW.is_shared_to_members = false THEN
    NEW.shared_at = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_spiritual_reflections_updated_at
BEFORE UPDATE ON public.gw_spiritual_reflections
FOR EACH ROW
EXECUTE FUNCTION public.update_spiritual_reflections_updated_at();