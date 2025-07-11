-- Create dashboard settings table for admin control
CREATE TABLE public.dashboard_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_name TEXT NOT NULL UNIQUE,
  setting_value TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.dashboard_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage dashboard settings" 
ON public.dashboard_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'super-admin')
  )
);

CREATE POLICY "Everyone can view dashboard settings" 
ON public.dashboard_settings 
FOR SELECT 
USING (true);

-- Insert default welcome card background setting
INSERT INTO public.dashboard_settings (setting_name, setting_value, image_url) 
VALUES ('welcome_card_background', 'default', null);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_settings_updated_at
BEFORE UPDATE ON public.dashboard_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();