-- Create alumnae_global_settings table for storing global page formatting settings
CREATE TABLE public.alumnae_global_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.alumnae_global_settings ENABLE ROW LEVEL SECURITY;

-- Create policies - anyone can read settings
CREATE POLICY "Global settings are viewable by everyone"
ON public.alumnae_global_settings
FOR SELECT
USING (true);

-- Only admins can insert settings
CREATE POLICY "Only admins can insert global settings"
ON public.alumnae_global_settings
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Only admins can update settings
CREATE POLICY "Only admins can update global settings"
ON public.alumnae_global_settings
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Only admins can delete settings
CREATE POLICY "Only admins can delete global settings"
ON public.alumnae_global_settings
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_alumnae_global_settings_updated_at
BEFORE UPDATE ON public.alumnae_global_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index on setting_key for faster lookups
CREATE INDEX idx_alumnae_global_settings_key ON public.alumnae_global_settings(setting_key);