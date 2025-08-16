-- Create alumnae content management table
CREATE TABLE public.alumnae_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_type TEXT NOT NULL, 
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER DEFAULT 0,
  created_by UUID NOT NULL,
  updated_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.alumnae_content ENABLE ROW LEVEL SECURITY;

-- Create policies for alumnae content management  
CREATE POLICY "Admins can manage all alumnae content" 
ON public.alumnae_content 
FOR ALL
USING (EXISTS (
  SELECT 1 FROM gw_profiles 
  WHERE user_id = auth.uid() 
  AND (is_admin = true OR is_super_admin = true)
));

CREATE POLICY "Everyone can view active alumnae content"
ON public.alumnae_content
FOR SELECT
USING (is_active = true);

-- Create trigger for updated_at
CREATE TRIGGER update_alumnae_content_updated_at
BEFORE UPDATE ON public.alumnae_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();