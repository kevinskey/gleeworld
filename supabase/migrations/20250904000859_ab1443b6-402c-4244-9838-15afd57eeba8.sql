-- Create wardrobe measurements table
CREATE TABLE public.gw_wardrobe_measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  bust_measurement TEXT,
  waist_measurement TEXT,
  hips_measurement TEXT,
  height_measurement TEXT,
  shirt_size TEXT,
  dress_size TEXT,
  pants_size TEXT,
  classification TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID
);

-- Enable Row Level Security
ALTER TABLE public.gw_wardrobe_measurements ENABLE ROW LEVEL SECURITY;

-- Create policies for wardrobe measurements
CREATE POLICY "Admins can manage all wardrobe measurements" 
ON public.gw_wardrobe_measurements 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid() 
    AND (is_admin = true OR is_super_admin = true)
  )
);

CREATE POLICY "Members can view wardrobe measurements" 
ON public.gw_wardrobe_measurements 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.gw_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_gw_wardrobe_measurements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_gw_wardrobe_measurements_updated_at
BEFORE UPDATE ON public.gw_wardrobe_measurements
FOR EACH ROW
EXECUTE FUNCTION public.update_gw_wardrobe_measurements_updated_at();